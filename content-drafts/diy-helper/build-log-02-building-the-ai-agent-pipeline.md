---
title: "Building the AI Agent Pipeline"
slug: "building-the-ai-agent-pipeline"
series: "Building DIY Helper"
seriesOrder: 2
project: "diy-helper"
publishedAt: "2026-03-13"
---

In [Part 1](/blog/building-diy-helper-origin-and-architecture), I covered why we're building DIY Helper and the stack behind it. Now let's get into the piece I'm most proud of: the agent pipeline that turns "I want to build a deck" into a full project plan with building codes, step-by-step instructions, materials, cost estimates, and tutorial videos -- in under two minutes.

## The Original 4-Phase Pipeline (and Why We Killed It)

The first version had four sequential phases, each making its own Claude API call:

1. **Research** -- search building codes, local codes, best practices
2. **Design** -- take research findings, produce steps + materials + tools
3. **Sourcing** -- check user inventory, search local stores for prices
4. **Report** -- compile everything into a formatted report

Each phase used Claude's tool-use to call external tools (web search, code lookups, store searches), then submitted structured results via a designated output tool. The pipeline worked. It was also slow and expensive.

The problem was serialization. Four Claude API calls, four rounds of tool execution, four context windows worth of tokens. Total wall time: roughly 4 minutes. Total API cost: around $0.08-0.12 per report.

Two insights killed this design. First, Research and Design don't need to be separate -- Claude can search codes and design the plan in a single pass with the right tools and prompts. Second, the Report phase was just reformatting existing data. It didn't need AI at all.

## The 2-Phase Pipeline

The current architecture has two phases:

**Phase 1 (Plan):** A single Claude call with parallel tool execution that combines research and design. Claude searches building codes, local codes, and the web in one tool-use turn, then synthesizes everything into a structured plan.

**Phase 2 (Report):** Pure TypeScript. No Claude call. Deterministic template assembly from the plan data.

This cut wall time to under 2 minutes and API costs by roughly 60%.

## Phase 1: One Claude Call, Parallel Tools, Structured Output

The plan phase gives Claude five tools: `search_building_codes`, `search_local_codes`, `web_search`, `search_project_videos`, and `calculate_wire_size`. Plus one special tool: `submit_plan_results`.

The prompt is explicit about the execution contract:

```
**Step 1:** Search building codes, local codes, and web for best
practices -- call ALL search tools in a SINGLE response for parallel
execution (3-4 calls max).
**Step 2:** Once search results return, IMMEDIATELY call
submit_plan_results with the full structured plan.

IMPORTANT: You have exactly 2 turns -- one for searches, one for
submit_plan_results. Do not do additional research.
```

This matters because of how Claude's tool-use works. When the model returns multiple `tool_use` blocks in a single response, we execute them concurrently with `Promise.all`:

```typescript
// Execute all real tools concurrently
const toolPromises = realToolBlocks.map(async (block) => {
  const toolStart = Date.now();
  try {
    result = await executeTool(block.name, block.input, auth);
  } catch (err) {
    result = `Error executing ${block.name}: ${err.message}`;
  }
  return { block, result };
});

const results = await Promise.all(toolPromises);
```

Three requests fire simultaneously -- the slowest one determines latency, not the sum of all three.

### Structured Output via Tool-Use

The `submit_plan_results` tool is the key architectural decision. It's not a "real" tool -- it doesn't call any external service. It's a JSON schema that forces Claude to return structured data through the tool-use mechanism instead of free text.

Here's a condensed look at the schema (14 required fields spanning research and design):

```typescript
{
  name: 'submit_plan_results',
  description: 'Submit the complete project plan as structured data.',
  input_schema: {
    type: 'object',
    properties: {
      buildingCodes: { type: 'string' },
      localCodes: { type: 'string' },
      permitRequirements: { type: 'string' },
      safetyWarnings: { type: 'array', items: { type: 'string' } },
      proRequired: { type: 'boolean' },
      steps: { type: 'array', items: { /* ... */ } },
      materials: { type: 'array', items: { /* ... */ } },
      tools: { type: 'array', items: { /* ... */ } },
      // ...
    },
    required: ['buildingCodes', 'localCodes', 'permitRequirements',
      'bestPractices', 'commonPitfalls', 'safetyWarnings', 'proRequired',
      'approach', 'steps', 'materials', 'tools', 'estimatedDuration',
      'skillLevel', 'videos'],
  },
}
```

Why tool-use instead of asking for JSON in a text response? Reliability. Claude's tool-use constrains output to the declared schema. No markdown preambles, no missing fields. The runner just reads `block.input` as a typed object -- zero parsing. When the runner detects the output tool, it captures the input and breaks the loop immediately.

### Inventory Pre-Fetching

One more trick: we don't wait for Phase 1 to finish before fetching the user's inventory. The database query fires in parallel with the plan phase setup:

```typescript
const inventoryPromise = prefetchInventory(auth);
// ... phase setup code ...
const inventoryData = await inventoryPromise;
const planResult = await runPlanPhase(context, auth, sendEvent, inventoryData, checkCancelled);
```

The prefetch has a 3-second timeout and is non-fatal -- if the query is slow or fails, the pipeline continues without inventory data. The inventory gets injected into the user prompt so Claude factors owned items into its recommendations, and TypeScript cross-references after the plan phase to calculate savings.

## Phase 2: Deterministic Report Assembly

The report phase is 300 lines of TypeScript that transforms `PlanOutput` into five `ReportSection` objects: Overview, Step-by-Step Plan, Materials & Tools, Cost Estimate, and Resources & Timeline.

No AI call. No token usage. No latency variance. The `buildReport` function runs in single-digit milliseconds.

The original report phase paid for a full Sonnet API call just to reformat data. Worse, Claude would occasionally hallucinate costs or reorder steps. Deterministic assembly eliminated both the cost and the reliability problem. The cost section calculates subtotals with a 10% contingency. The materials section groups by category and strikes through owned items. The resources section generates a weekend-by-weekend timeline. All predictable, testable, and fast.

## SSE Streaming and the Heartbeat Problem

The pipeline streams progress to the client over Server-Sent Events. The route handler creates a `ReadableStream`, encodes events as `data: {json}\n\n`, and returns it with `text/event-stream` headers.

Five event types flow through the stream: `agent_progress` (phase, status, 0-100 progress), `agent_complete` (with the full report), `agent_error`, `heartbeat`, and `done`.

The heartbeat solves a real deployment problem. Vercel's serverless functions and CDN proxies will close connections that go quiet for too long. The plan phase can take 30-60 seconds during the Claude API call with nothing to send. A heartbeat every 15 seconds keeps the connection alive:

```typescript
const heartbeat = setInterval(() => {
  sendEvent({ type: 'heartbeat' });
}, 15_000);
```

The `maxDuration` is set to 120 seconds at the route level -- enough headroom for the plan phase plus report assembly, with margin for retries.

## The Numbers

Before and after the optimization:

- **Wall time:** ~4 minutes down to <2 minutes
- **Claude API calls per report:** 4 down to 1
- **Estimated API cost per report:** ~$0.08-0.12 down to ~$0.02-0.05
- **Report phase latency:** 5-15 seconds (Sonnet call) down to <10 milliseconds (TypeScript)
- **Reliability:** Eliminated report-phase hallucinations entirely

The old phase files -- `research.ts`, `design.ts`, `sourcing.ts`, and the AI-based `report.ts` -- are still in the codebase. They work fine. We just don't call them anymore.

## What's Next

The pipeline now produces good plans fast and cheap. But it treats every user the same -- a licensed electrician and a first-time homeowner get identical responses. In the next post, we'll dig into the intelligence layer: how intent classification, skill profiling, and prompt calibration make the AI read the room before it speaks.
