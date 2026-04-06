---
title: "When AI Should Step Aside"
slug: "build-log-05-when-ai-should-step-aside"
series: "Building DIY Helper"
seriesOrder: 5
project: "diy-helper"
publishedAt: "2026-03-13"
excerpt: "The hardest part of building an AI product isn't making it answer questions. It's teaching it when to stop. Here's how we built escalation triggers, a two-sided expert marketplace, dynamic pricing, a reputation engine, and fraud detection — and what happened when a side project got way too interesting."
tags: ["ai", "marketplace", "trust", "expert-systems", "stripe", "build-log"]
metaDescription: "Build log 5 of 5: How we designed AI escalation triggers, a two-sided expert marketplace with dynamic pricing, reputation scoring, and fraud detection for the DIY Helper webapp."
---

Over the last four posts we've torn this project apart: the [origin story and architecture](/blog/build-log-01-), the [agent pipeline](/blog/build-log-02-), the [intelligence layer](/blog/build-log-03-), and the [real-data grounding](/blog/build-log-04-) that keeps the AI honest. If you've been following along, you know this started as a weekend experiment and kept growing because every solution opened a more interesting problem.

This is the one that got completely out of hand. We set out to add a simple "talk to a human" button and ended up building a full marketplace with dynamic pricing, a six-factor reputation engine, and a fraud detection system that watches for people trying to game it. The problems were too interesting to leave half-built.

Let's close this out.

## The Trust Insight

Here's the thing that changed the project's direction: **an AI that admits its limits makes users trust it more, not less.**

Most AI products treat "I don't know" as a failure state. We treated it as a feature. When DIY Helper encounters something it can't confidently answer, it says so directly and offers a path to a human expert who can.

The counterintuitive result: users who see the AI escalate appropriately ask *more* questions, not fewer. They explore confidently because they know the system will flag the things that actually matter. That reframed everything — from "how do we make the AI answer everything?" to "how do we build a seamless handoff to someone who can?"

## Five Escalation Triggers

The AI doesn't just throw its hands up randomly. We defined five specific conditions that trigger an expert suggestion, embedded directly in the system prompt:

1. **Safety-critical work** — Electrical panels, gas lines, structural changes, asbestos/lead, anything at height. "The AI told me to" is not an acceptable outcome.
2. **Code ambiguity** — Building codes that are unclear or conflicting between jurisdictions. "It depends on your municipality" means a local expert should weigh in.
3. **Needs physical inspection** — Symptoms ("my outlet sparks") that could have multiple causes requiring hands-on diagnosis.
4. **Repeated follow-ups** — Three or more questions on the same issue signals the user needs more personalized guidance than chat can provide.
5. **Low confidence / hedging** — When the AI catches itself saying "it depends" or "I'm not entirely sure," it should say so explicitly and offer a better path.

The escalation is always additive — answer first, suggest an expert at the end. Never just refuse to help.

## From Escalation to Marketplace

Once we had escalation working, the obvious next question was: escalate to *whom*?

We built a two-sided marketplace connecting homeowners with verified trade professionals across three interaction modes: **Q&A questions** (async, text-based — experts claim from a queue or receive direct requests, with full AI context from the homeowner's report), **consultations** (scheduled video calls in 15/30/60-minute slots), and **project RFPs** (when a Q&A conversation reveals the homeowner needs professional installation, it can "graduate" into a request for proposals with per-phase pricing).

That graduation path — chat to Q&A to project — is the entire funnel. The AI creates engagement, experts handle nuance, and some conversations convert into paid work.

## Dynamic Pricing With a Difficulty Scorer

Flat pricing is a bad deal for everyone. A question about paint sheen doesn't deserve the same price as diagnosing a tripping breaker. We built a difficulty scorer that evaluates seven signals and sorts questions into three tiers:

```typescript
const WEIGHTS = {
  proRequired:    +3,  // AI flagged professional-recommended
  safetyWarnings: +1,  // Per warning, max 3
  extraPhotos:    +1,  // Per photo beyond 2, max 2
  codeCategory:   +1,  // Electrical, plumbing, HVAC, roofing, concrete
  skillLevel:     +2,  // Advanced (+2) or intermediate (+1)
  questionLength: +1,  // Over 200 characters
  estimatedCost:  +1,  // Project cost exceeds $500
};
// Score 1-3 → Standard ($15)
// Score 4-6 → Complex  ($25)
// Score 7-10 → Specialist ($45)
```

The score also gates bidding mode. Questions scoring 7+ open a competitive bid window where up to three experts can pitch their expertise and propose a price ($15-$150 range). The homeowner picks the expert, not just the cheapest bid.

Conversations are tiered too. The initial answer plus two follow-ups are included in the base price. At the third DIYer message, a Tier 2 gate kicks in (+$10 for extended guidance). At the sixth, Tier 3 (+$20 for deep-dive consultation). Simple questions stay cheap. Extended help is fairly compensated.

## The Reputation Engine

A marketplace is only as good as its quality signal. We built a six-factor weighted composite score that drives expert ranking, queue priority, and progression tiers:

```typescript
const WEIGHTS = {
  avgRating:         0.30,  // Star rating from homeowners
  acceptanceRate:    0.20,  // Answers accepted vs. total answered
  responseTime:      0.15,  // Faster is better (<15 min = perfect score)
  tierUpgradeRate:   0.15,  // Do DIYers pay to keep talking? (value signal)
  correctionQuality: 0.10,  // Expert submits corrections to AI reports
  graduationRate:    0.10,  // Q&A conversations that convert to projects
};
```

The interesting ones are `tierUpgradeRate` and `graduationRate`. Tier upgrade rate measures whether homeowners voluntarily pay more to continue the conversation — a direct value signal. Graduation rate tracks Q&A-to-project conversions. Both reward experts who actually help, not just experts who answer quickly.

The composite score maps to four levels: Bronze (0+), Silver (40+), Gold (65+), Platinum (85+). Higher levels unlock queue priority and lower platform fees (18% free, 15% Pro at $29/mo, 12% Premium at $79/mo).

## Fraud Detection

Any marketplace where money changes hands attracts gaming. The classic attack: an expert and a "homeowner" collude to post fake questions, resolve them instantly, and extract payouts. We built four detection patterns that run on every conversation event:

- **Rapid message bursts** — More than 10 messages in 5 minutes. Legitimate conversations don't move that fast.
- **Suspiciously fast resolutions** — Resolved in under 5 minutes with fewer than 3 messages.
- **Recurring quick-resolve pairs** — Same expert-homeowner pair resolves 3+ conversations in under 5 minutes each within 30 days. Once is unusual. Three times is a pattern.
- **Repeated sanitization triggers** — More than 3 contact-info sanitization events from one user in 24 hours. The messaging system strips phone numbers, emails, URLs, social handles, and even spelled-out phone numbers. Repeatedly hitting that filter means someone's trying to move off-platform.

Each signal logs with severity levels to a `qa_activity_log` table. The system flags for review rather than auto-banning. False positives in fraud detection are worse than false negatives when you're building trust.

## The Plumbing: Stripe Connect

All of this runs on Stripe Connect with Express accounts. Q&A payouts are direct transfers; project payments use destination charges with tiered commission (10% on the first $10K, 7% on $10K-$25K, 5% above, flat 5% for repeat customers). Every payment flow has a test mode that generates fake Stripe IDs so the full marketplace logic runs without touching real money.

## Series Wrap-Up: What We Learned

Five posts in, and we've covered the full arc — from a weekend prototype to a 36-feature platform with an AI agent pipeline, an intelligence layer, real-data grounding, and a two-sided marketplace.

**What worked:** Building trust through transparency. The escalation system, the difficulty-based pricing, the reputation engine — they all serve the same principle: be honest about what the AI can and can't do, and make the handoff to humans seamless.

**What we'd do differently:** The 2-phase agent collapse (from the original 4-phase pipeline) should have happened sooner. We spent time optimizing phases that didn't need to exist separately. We'd also start with dynamic pricing from day one instead of migrating from flat pricing later — the feature-flag migration path works, but it's complexity we could have avoided.

**What's next:** The RFP-to-project pipeline is the growth vector. The Q&A-to-project graduation works, but full project management — milestone payments, progress tracking, completion verification — is where this becomes a real business, not just a clever AI demo.

This series started because we got curious about what happens when you give an AI real tools and real data instead of just a prompt. Turns out you end up building a marketplace. We got a little carried away. But every layer exists because the previous one created a problem worth solving, and that's about as honest as software development gets.

If you're building something where AI meets real-world complexity — where the answer isn't always "let the model handle it" — we'd enjoy the conversation. [Get in touch](/contact).
