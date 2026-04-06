# How We Cut Claude Code Token Usage by 80% on the Same Task

*A real-world debugging story from building Tradr Buildr with Claude Code Opus*

---

## The Problem

We were building [Tradr Buildr](https://github.com/lakeshore-studio/tradr-buildr), an options trading strategy builder, using Claude Code to execute a series of implementation plans. Each plan defined the files to create, the code to write, and the tests to run.

Plan 4 (Strategy Builder UI) consumed **23% of our 5x session limit** — way more than previous plans of similar size. Plans 1-3 had been completed across separate sessions without issue. Something about how we executed Plan 4 was dramatically less efficient.

## Root Cause: The Code Courier Anti-Pattern

The root cause was **duplicating source code into agent prompts**.

Here's what happened:

### The Plan Format

Our plans were written as detailed code dumps — 3,800+ lines containing verbatim source code for every file. Plan 4 alone was **33,190 tokens** just to read.

### The Execution Strategy

When executing, Claude Code:

1. **Read the plan** into its context window (~33k tokens)
2. **Launched 5 parallel subagents**, each with the full source code for their assigned files pasted into the prompt
3. Each agent received the **full system prompt + tool definitions + Vercel plugin context** (~15k tokens overhead per agent)

The math:

| Component | Tokens |
|-----------|--------|
| Reading the plan | ~33,000 |
| 5 agent prompts with code | ~60,000 |
| 5x system prompt overhead | ~75,000 |
| Build/fix iteration cycles | ~25,000 |
| **Total** | **~193,000** |

The agents weren't doing anything complex — they were just calling the `Write` tool to create files. We were paying ~140k tokens in overhead for what amounted to a file copy operation.

## Signs You're Hitting This Problem

Watch for these symptoms in your Claude Code sessions:

1. **Session usage spikes disproportionate to work done** — if creating 20 files consumes as many tokens as a complex debugging session, something's wrong.

2. **Agent prompts that are mostly code** — if your agent dispatch prompt is longer than the agent's reasoning will be, you're probably better off doing the work directly.

3. **Plans with full source code** — any plan over ~1,000 lines that contains verbatim file contents will be expensive to execute through agents.

4. **Multiple parallel agents for simple file creation** — parallelism helps for tasks that need *reasoning* (debugging, integration, test fixing). For file creation, sequential `Write` calls are faster and cheaper.

5. **"Code courier" agents** — agents whose entire job is to receive code in their prompt and write it to a file. These agents add overhead without adding value.

## The Problem-Solving Process

### Step 1: Measure the Damage

We noticed Plan 4 consumed 23% of session limit. Plans 1-3 had been similar in scope but ran in separate sessions, so we hadn't noticed the pattern.

### Step 2: Identify the Waste

Breaking down token usage revealed the multiplication effect:
- Plan code exists in the plan file (33k tokens)
- Same code gets re-serialized into agent prompts (60k tokens)
- Each agent carries full system context (75k tokens)
- That's 168k tokens before any actual work happens

### Step 3: Question Every Agent Dispatch

We asked: "Does this agent need to *think*, or just *write*?"

For file creation from a plan with exact code: **just write**. No agent needed.

For test debugging after a build failure: **needs thinking**. Agent is appropriate.

### Step 4: Build a Repeatable Process

We encoded the solution as a Claude Code skill (`execute-verbose-plan`) with clear rules:

| Task Type | Use Agent? | Why |
|-----------|-----------|-----|
| Write file from plan | No | Write tool is sufficient |
| Modify existing file | No | Edit tool with plan guidance |
| Install dependencies | No | Single bash command |
| Run + fix failing tests | Yes | Needs iteration loop |
| Debug build errors | Maybe | Try once yourself first |
| 3+ independent complex tasks | Yes | Genuine parallelism benefit |

## The Solution

### 1. Write Files Directly

Instead of dispatching agents to write files, read the relevant plan section and use the `Write` tool directly:

```
Before (Plan 4):
  Read plan → Copy code into agent prompt → Agent calls Write tool
  Cost: ~30k tokens per agent dispatch

After (Plan 5):
  Read plan section → Write file directly
  Cost: ~2k tokens per file
```

### 2. Agents Only for Reasoning Tasks

Reserve agents for work that requires iteration:
- Running tests and fixing failures
- Debugging compatibility issues (like our shadcn `asChild` → base-ui `render` migration)
- Complex integration where multiple files need to be read and understood together

### 3. Install Dependencies First

Batch all `npm install` and `pip install` commands before creating files. This catches compatibility issues early instead of discovering them after writing 20 files.

### 4. Build Verify in Groups

After each logical group of files (types → services → components → pages), run a build check. This catches issues while the relevant code is still fresh in context.

## Results

Plan 5 (Signal Scanner & Alerts) was **larger** than Plan 4:
- 5,564 lines vs 3,782 lines
- 42 files created vs 40 files
- 76 backend tests vs 8 backend tests
- More complex integration (async scanner, external APIs)

But it consumed **~4% of session limit** vs Plan 4's **23%**.

| Metric | Plan 4 (Before) | Plan 5 (After) |
|--------|-----------------|----------------|
| Plan size | 3,782 lines | 5,564 lines |
| Files created | 40 | 42 |
| Backend tests | 8 | 76 |
| Session usage | ~23% | ~4% |
| Agent dispatches | 8 | 2 |
| Approach | Code courier agents | Direct file writes |

**That's roughly an 80% reduction in token usage for 47% more work.**

## Key Takeaways

1. **Agents are for reasoning, not copying.** If an agent's job is to receive code and write it to a file, skip the agent and write it yourself.

2. **Plan format matters.** Plans with verbatim source code are expensive to execute through agents because the code gets duplicated. Consider plans that describe *what to build* and *key decisions* rather than providing every line of code.

3. **Measure before you optimize.** We only caught this because we noticed the 23% usage spike. If you're not tracking token consumption per task, you can't identify waste.

4. **Sequential beats parallel for simple work.** Five parallel agents writing files is slower and 5x more expensive than five sequential `Write` calls. Save parallelism for tasks where agents genuinely need to think independently.

5. **The skill became the fix.** We encoded the solution as a Claude Code skill that future sessions load automatically. The next person (or Claude instance) executing a verbose plan gets the efficient approach by default.

## The Broader Lesson

This is the AI equivalent of over-engineering. We had a powerful tool (parallel subagents) and applied it everywhere — including places where simpler tools (direct file writes) were both faster and cheaper.

The instinct to parallelize everything with agents is strong. But the overhead of agent creation (system prompts, tool definitions, context loading) means each agent dispatch has a fixed cost of ~15k+ tokens. For tasks that take less than 15k tokens of reasoning to complete, that overhead exceeds the work itself.

**The right question isn't "can I use an agent for this?" — it's "does this task need an agent's reasoning?"**

---

*Built with Claude Code at [Lakeshore Studio](https://madebylakeshore.com). Tradr Buildr is an open-source options trading strategy builder.*
