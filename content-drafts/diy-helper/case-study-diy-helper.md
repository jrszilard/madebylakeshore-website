# DIY Helper — Case Study Draft for Sanity (madebylakeshore)

> Map these sections to the corresponding Sanity `caseStudy` schema fields.

---

## Sanity Fields

**title:** DIY Helper: AI-Powered Home Project Planning

**slug:** diy-helper-ai-home-project-planning

**category:** ai

**featured:** true

**excerpt:** We built a platform that leverages an AI agent that researches building codes, plans projects step-by-step, sources materials with real prices, and adapts its advice to what you already know.

**metrics:**

| Value | Label |
|-------|-------|
| < 2 min | Per project report |
| ~$0.03 | API cost per report |
| 60% | Cost reduction from pipeline optimization |
| 8 | Trade domains with adaptive expertise detection |

---

## Challenge

Every homeowner starting a renovation project ends up in the same place: fifteen browser tabs deep, cross-referencing building codes, YouTube tutorials, store prices, and conflicting forum advice. The real problem was threefold. First, accuracy matters. Building codes are not suggestions, and bad electrical advice is a fire hazard. Second, the output needed to be actionable, not encyclopedic. Shopping lists with real prices, ordered steps, weekend-friendly timelines. Third, the AI needed to know its audience. Justin knows carpentry but not plumbing. Wilma can paint without tape but should not be trusted with load-bearing walls. A useful AI assistant needs to adapt to that.

We decided to build what we wished existed: an AI that does all the research, plans the project, sources the materials, and adjusts its communication based on who it is talking to.

---

## Solution

We designed DIY Helper as a **multi-phase AI agent pipeline** built on Next.js 16, Claude, and Supabase.

**The Planner.** Instead of a single prompt, the system breaks project planning into two phases. Phase 1 fires parallel tool calls, then synthesizes a complete plan with ordered steps, materials, pricing, safety warnings, and permit requirements. Phase 2 is a deterministic TypeScript function that assembles the structured data into a formatted five-section report — no additional API call needed. This two-phase design cut generation time from four minutes to under two and reduced API costs by 60%.

**The Intelligence Layer.** Before the main model processes any message, a lightweight Haiku classifier (sub-300ms, under $0.001) categorizes user intent and routes to a specialized prompt. The system also builds per-user skill profiles across eight trade domains by analyzing tool inventory, trade terminology usage, and project history. These profiles feed directly into prompt calibration: an experienced electrician asking about plumbing gets plumbing concepts explained thoroughly while electrical references use trade shorthand. Safety warnings are never calibrated away, regardless of expertise level.

**The Escape Hatch.** When the AI detects safety-critical work, code ambiguity, situations requiring physical inspection, or repeated follow-ups suggesting the user needs more help than chat can provide, it suggests connecting with a verified trade professional through a built-in marketplace. The marketplace includes dynamic difficulty-based pricing ($15-45 per question), a six-factor reputation engine, fraud detection, and tiered conversation upgrades.

**Key architectural decisions:**
- Parallel tool execution — building code lookups, local code searches, and video searches run concurrently in a single Claude response turn
- Structured output via tool use — each agent phase submits results through a strict JSON schema, eliminating regex parsing
- Inventory-aware recommendations — fuzzy-matching against owned tools with alias groups automatically excludes items from shopping lists
- Graceful degradation — every external call uses retry logic with exponential backoff; Upstash Redis handles distributed rate limiting
- Real-time streaming — SSE events provide progress updates, heartbeats prevent proxy timeouts, and the frontend renders a live progress bar

---

## Results

The system delivers a complete project report — building codes, safety warnings, step-by-step plan, materials list with real store prices, tool requirements, cost breakdown, and tutorial videos — in under two minutes at roughly $0.03 in API costs. For comparison, a contractor consultation starts at $100-200 and takes days to schedule.

The adaptive intelligence layer means the same system serves complete beginners and experienced tradespeople effectively. Intent classification routes users to the right interaction pattern instantly. Skill profiling eliminates the condescension and the confusion problem across different trade domains.

The pattern we built here — autonomous agents that research, synthesize, plan, and adapt to their audience — generalizes well beyond home improvement. Any domain where people spend time cross-referencing multiple sources and building plans from fragmented information is a candidate for this approach.

---

## Tech Stack (for reference, not a Sanity field)

- Next.js 16 (App Router, SSE streaming)
- Claude Sonnet (primary), Claude Haiku (classification)
- Supabase (auth, PostgreSQL with RLS, real-time)
- Brave Search API (grounded web search)
- Stripe (subscriptions, marketplace payouts)
- Upstash Redis (distributed rate limiting)
- Zod (runtime input validation)
