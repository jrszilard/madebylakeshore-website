---
title: "Teaching AI to Know Its Audience"
slug: "teaching-ai-to-know-its-audience"
series: "Building DIY Helper"
seriesOrder: 3
project: "diy-helper"
publishedAt: "2026-03-13"
---

In [post 1](/blog/diy-helper-origin-story) I talked about why we started building DIY Helper. In [post 2](/blog/diy-helper-agent-pipeline) I covered the two-phase agent pipeline that generates project reports. This post is about the part of the system that has changed the way I think about AI products entirely: the intelligence layer.

## The Over-Explainer Problem

Ask about GFCI outlet wiring and the AI opens with "A GFCI, or Ground Fault Circuit Interrupter, is a safety device that..." — and you, a person who owns a multimeter and has wired a subpanel, close the tab.

Flip the scenario. A first-time homeowner asks why their outlet stopped working and the AI starts talking about ampacity, neutral bus bars, and NEC code sections. Technically correct. Completely useless.

This is not a knowledge problem. It is a calibration problem. The AI gives everyone the same depth, the same vocabulary, the same assumed baseline. I know carpentry reasonably well. I know nothing about plumbing. The AI could not tell the difference. So I decided to fix it.

## Intent Classification: What Does the User Actually Need?

The first piece is a router. Before the main model generates a response, a fast, cheap classification call figures out what kind of help the user needs. Not what topic — what mode.

Four intent types:

- **Quick question** — "What size nail for baseboards?" Just wants an answer, not a workflow.
- **Troubleshooting** — "My outlet sparks when I plug something in." Needs diagnosis.
- **Mid-project** — "The mortar isn't sticking to my tile." Actively working, needs immediate help.
- **Full project** — "I want to build a deck." Needs the complete planning pipeline from post 2.

The classification runs on Claude Haiku. Temperature 0, max 100 tokens, constrained to return JSON with the intent, a confidence score, and a one-line reasoning.

```typescript
const CLASSIFICATION_SYSTEM_PROMPT = `You are an intent classifier for a DIY home improvement assistant.
Classify the user's message into exactly one category:

- quick_question: Simple factual questions with short answers
- troubleshooting: User has a problem and needs diagnostic help
- mid_project: User is in the middle of an active project
- full_project: User wants to plan or start a new project

Respond with ONLY a JSON object:
{"intent":"<category>","confidence":<0-1>,"reasoning":"<brief explanation>"}`;
```

Each intent type triggers a different system prompt. Quick questions get a focused prompt that produces 1-3 paragraphs with no workflow overhead. Troubleshooting enters diagnostic mode. Full project triggers the heavyweight guided flow from post 2.

The classification costs under $0.001 per call and Haiku typically responds in 100-200ms. I built in a 500ms timeout as a safety net for cold starts. If the call times out, errors out, or returns confidence below 70%, the system falls through to the default full-project behavior — exactly what the app did before the intelligence layer existed. Graceful degradation to the status quo.

```typescript
const controller = new AbortController();
const timeout = setTimeout(
  () => controller.abort(),
  config.intelligence.classificationTimeoutMs // 500ms
);

const classification = await classifyIntent(message, {
  hasActiveProjects: false,
});

if (classification.confidence >= config.intelligence.confidenceThreshold) {
  intentType = classification.intent; // use it
}
// Low confidence? intentType stays undefined, full_project prompt kicks in.
```

Classification is cached on the conversation record — the first message gets classified, every subsequent message reuses the cached intent.

## Skill Profiling: The User Is Already Telling You Who They Are

Intent classification tells us what the user needs. Skill profiling tells us who they are. And the nice part is: we do not have to ask.

The system builds a skill profile across eight trade domains (electrical, plumbing, carpentry, HVAC, general, landscaping, painting, roofing) by analyzing three signals that already exist in the app.

**Signal 1: Tool inventory.** DIY Helper has a persistent inventory where users track their tools. If someone owns a miter saw, a Kreg jig, and a brad nailer, the system does not need a quiz to know they are not a carpentry beginner. Tool count per domain maps directly to familiarity level.

**Signal 2: Trade terminology.** This is the one I enjoyed building most. A curated dictionary of 200+ advanced terms across all eight trades. "Romex," "afci," "subpanel," "fish tape" for electrical. "PEX," "closet flange," "dielectric union," "water hammer" for plumbing. When a user drops these terms in conversation, the system infers familiarity. No AI call — pure pattern matching.

```typescript
// Terminology detection is a dictionary lookup, not an AI call
export const TERMINOLOGY: Record<DomainCategory, DomainTerminology> = {
  electrical: {
    advanced: [
      'romex', 'gfci', 'afci', 'breaker panel', 'amperage',
      'knob and tube', 'conduit', 'junction box', 'subpanel',
      'wire gauge', 'awg', 'fish tape', 'multimeter', ...
    ],
    basicQuestions: [
      'what is a circuit', 'how to turn off the power',
      'what is a breaker', 'how to replace an outlet', ...
    ],
  },
  plumbing: { ... },
  // 8 domains total
};
```

**Signal 3: Completed projects.** Past project history feeds the same inference. Three completed electrical projects is a stronger signal than any terminology match.

Thresholds are intentionally simple. Per domain: 0-2 signals means novice, 3-7 means familiar, 8+ means experienced. Three levels. Trying to distinguish twelve granular expertise levels would be false precision.

The three signal sources merge with a "highest level wins" strategy:

```typescript
export function mergeProfileSources(
  ...sources: Partial<Record<DomainCategory, FamiliarityLevel>>[]
): Record<DomainCategory, FamiliarityLevel> {
  const result = {} as Record<DomainCategory, FamiliarityLevel>;
  for (const domain of DOMAIN_CATEGORIES) {
    let maxRank = 0;
    for (const source of sources) {
      const level = source[domain];
      if (level !== undefined) {
        maxRank = Math.max(maxRank, LEVEL_RANK[level]);
      }
    }
    result[domain] = RANK_TO_LEVEL[maxRank];
  }
  return result;
}
```

If your tool inventory says "familiar" with electrical but your terminology says "experienced," the system uses "experienced." Optimistic by design. Under-explaining is a better failure mode than over-explaining — people tolerate brevity much better than condescension.

## Prompt Calibration: Where It All Comes Together

The skill profile feeds into the system prompt through a calibration function that appends context-specific instructions before every AI response:

```typescript
export function calibratePrompt(
  basePrompt: string,
  profile: SkillProfile | null | undefined,
): string {
  if (!profile) return basePrompt;

  const lines: string[] = [basePrompt, '', '--- Skill Calibration ---'];

  switch (profile.communicationLevel) {
    case 'beginner':
      lines.push(
        'This user is a beginner — always explain concepts in detail.',
        'Avoid trade jargon unless you define it.',
      );
      break;
    case 'advanced':
      lines.push(
        'This user is experienced. Be concise and use trade terminology.',
        'Skip basic explanations unless the user asks.',
      );
      break;
    // ...
  }

  if (experienced.length > 0) {
    lines.push(
      `The user is experienced in: ${experienced.join(', ')}.
       Skip basics in these domains.`,
    );
  }
  if (novice.length > 0) {
    lines.push(
      `The user is novice in: ${novice.join(', ')}.
       Explain more in these domains, even if advanced elsewhere.`,
    );
  }
```

The same user, in the same conversation, can get carpentry advice in shorthand and plumbing advice with definitions. The AI is not uniformly smart or uniformly basic — it is calibrated per domain, per user.

One rule is non-negotiable. The calibrator always appends this regardless of skill level:

```
SAFETY REMINDER: Always include relevant safety warnings, required
protective gear, and permit requirements. Even experienced users must
be reminded about permits, local codes, and safety precautions.
Never omit safety guidance.
```

No expertise level earns the right to skip safety information. An experienced electrician still gets reminded about permits. A veteran roofer still gets told about fall protection. This is not optional and it is not calibrated away.

## The Stack of Three

Intent classification, skill profiling, and prompt calibration are each simple in isolation. The power is in the composition. A message hits the system and in under 300ms the intelligence layer has:

1. Determined the user needs troubleshooting help (not a full project plan)
2. Loaded their profile showing they are experienced in electrical but novice in plumbing
3. Injected calibration instructions into a troubleshooting-specific system prompt

The main model — Sonnet, the expensive one — then generates a response that feels uncannily appropriate. Not because the model is smarter, but because it received better instructions.

That is the part that changed how I think about this. The model is the same for every user. The intelligence layer is what makes the product feel different.

## Up Next

The intelligence layer makes the AI talk to users like it knows them. But none of that matters if the information it is giving them is wrong. In [post 4](/blog/diy-helper-grounding-real-data), I will dig into the grounding layer — building codes, real product prices, local store inventory, and why getting these right is harder than it sounds.
