---
title: "The Agents That Watch the Bot"
slug: "build-log-04-the-agents-that-watch-the-bot"
series: "Building the Options Bot"
seriesOrder: 4
project: "tastytrade-bot"
publishedAt: "2026-04-05"
excerpt: "A trading bot that manages real money needs more than unit tests. We built 8 specialized Claude Code agents — a financial code auditor, a backtest statistician, an architecture critic, a wiki maintainer — and wired them into the development workflow with post-commit hooks. Here's how AI reviews the AI."
tags: ["trading", "options", "ai-agents", "testing", "code-review", "developer-tools", "build-log"]
metaDescription: "Build log 4: How we use 8 specialized Claude Code agents to test, review, and document an options trading bot — including a financial code auditor that hunts for bugs that lose money."
---

The options bot has a [council of agents](/builds/build-log-02-the-council-decides) that analyze market conditions and adjust parameters. But those agents look outward — at the market. This post is about the agents that look inward — at the code itself.

When you're building a system that places real trades, the standard developer workflow isn't enough. A Python linter doesn't know that a sign error in a delta calculation will flip a hedge from protective to directional. A generic code reviewer doesn't know that `asyncio.Lock` isn't reentrant and your sentinel just deadlocked. A type checker won't tell you that your z-score computation uses population variance when it should use sample variance with N-1.

We built 8 Claude Code agents, each with a narrow specialty, that review and test the bot at different levels of abstraction. They run on Opus or Sonnet depending on how much reasoning the job requires, and one of them fires automatically after every commit.

## The Roster

Here's what's in `.claude/agents/`:

| Agent | Model | Job |
|---|---|---|
| **trading-bot-tester** | Opus | Hunt for bugs that could lose money |
| **backtest-statistician** | Opus | Validate backtest results with publication-grade statistics |
| **quant-trading-bot-architect** | Opus | Review architecture of trading logic |
| **senior-systems-architect** | Opus | Evaluate system design, concurrency, integration patterns |
| **python-refactoring-specialist** | Opus | Structural improvements without changing behavior |
| **trade-desk-analyst** | Opus | Analyze market conditions and trade quality |
| **feature-documenter** | Sonnet | Keep `bot-features.md` current after changes |
| **wiki-updater** | Sonnet | Sync the 22-page Obsidian wiki after commits |

The first four are the heavy hitters — they run Opus because the reasoning matters. The last two are maintenance agents that run Sonnet because they're doing structured writes, not judgment calls.

## The Financial Code Auditor

The `trading-bot-tester` is the most important agent in the roster. Its system prompt opens with: *"You test trading bot code with the understanding that a single undetected bug could result in significant financial loss."*

It works at two levels. First, line-by-line analysis — what does this line intend to do, does it actually do it, what assumptions is it making, are those assumptions valid during live trading? Second, big-picture analysis — is this the right architecture, how does it interact with other subsystems, what failure modes cascade?

The critical testing categories are specific to financial systems:

- **Numerical edge cases** — division by zero when an order book is empty, floating-point precision errors that compound over many trades, negative numbers where only positives are expected
- **Market condition edge cases** — flash crashes, circuit breakers, price gaps over stop levels, stale data
- **State management** — position tracking accuracy after restarts, orphaned orders after crashes, balance reconciliation
- **Business logic flaws** — buy/sell direction confusion (the classic one), wrong side of the order book, leverage miscalculations

Every finding gets classified: CRITICAL (direct money loss), HIGH (potential money loss), MEDIUM (operational), LOW (code quality). The agent doesn't approve code until it's confident nothing will lose money due to a software error.

## What It Actually Caught

This isn't theoretical. Two commits from the same afternoon tell the story:

**Commit `36a2ce9`** — *"address code review findings in trigger computation"*

The trading-bot-tester found that the sentinel's rate-of-change trigger used population variance instead of sample variance for z-score computation. With a 30-element rolling window, the difference is ~3%. Enough to suppress a trigger that should fire or fire one that shouldn't. The fix was one character — `ddof=0` to `ddof=1` in the numpy call — but the downstream effect was whether the system correctly detects a flash crash.

Same review found a hardcoded 0.5% minimum change threshold. Not wrong, but not configurable. In a low-volatility regime, 0.5% is a significant move. In a high-vol regime, it's noise. Made it configurable. Also raised the minimum observations threshold from 2 to 10 — you can't compute a reliable z-score from 2 data points, but the code was happily trying.

**Commit `e9b5343`** — *"critical deadlock + code quality review fixes"*

Thirty minutes later, the senior-systems-architect flagged a deadlock in the sentinel's event handler. The `_handle_sentinel_triggered` method acquired an `asyncio.Lock`, then called a function that also tried to acquire the same lock. `asyncio.Lock` is not reentrant — unlike `threading.RLock`. In testing with a single trigger, it worked fine. In production with two triggers firing within the same scan cycle, the second trigger would deadlock forever.

The fix extracted the inner logic into `_scan_task_inner()` that doesn't acquire the lock. Same review found a memory leak — follow-up tasks were tracked in a list that never pruned completed entries. Switched to a set with a done-callback that removes each task when it finishes.

A human reviewer might have caught the variance bug if they were a statistician. A human reviewer might have caught the deadlock if they were an asyncio expert. The agents caught both because they have deep, narrow expertise in exactly these domains.

## The Backtest Statistician

If the trading-bot-tester guards the code, the backtest-statistician guards the conclusions. Its system prompt is modeled after a senior quant researcher — the kind of person whose job is to tell portfolio managers that their "alpha" is a statistical artifact.

The bot tests 25 strategy types across 21 symbols, 5 account tiers, and 5 market regimes. That's 25 × 5 = 125 strategy-regime combinations. Run a backtest across all of them and something will look profitable just by chance. The statistician's job is to detect that.

It applies Holm-Bonferroni corrections for the 125 comparisons. It computes the Deflated Sharpe Ratio — which adjusts for the number of strategies tried, non-normal returns, and estimation error. It runs walk-forward analysis and flags any strategy with walk-forward efficiency below 0.4 as likely overfit. It refuses to make claims from fewer than 30 trades in a strategy-regime cell.

The specific rule: *"Never say 'Strategy X works.' Say 'Strategy X shows a Sharpe ratio of 1.4 (95% CI: 0.8 to 2.1) over 147 trades in the elevated-vol regime, with a deflated Sharpe p-value of 0.03.'"*

This agent doesn't run on every commit. It runs when we complete a backtest sweep and need to decide whether to allocate real capital to a strategy. The stakes of getting that wrong are higher than any code bug.

## The Auto-Documentation Pipeline

The wiki-updater is the only agent that runs automatically. A post-commit hook in `.claude/settings.json` watches for changes in core directories:

```
core/, risk/, strategy/, execution/, scanning/, analysis/, council/, data_collection/, infra/
```

When a commit touches files in those directories, the hook fires and suggests running the wiki-updater. The agent reads the diff, maps changed files to wiki pages using a static routing table (e.g., `council/*.py` → `Council System.md`, `scanning/*.py` → `Scanning & Discovery.md`), then patches only the affected sections.

The wiki itself is 22 pages in an Obsidian vault — architecture overview, subsystem deep-dives, config reference, tuning guide, troubleshooting guide. The wiki-updater doesn't rewrite pages. It reads the current page, reads the changed source, identifies what's outdated (new functions not in the key-files table, changed defaults, removed methods), and edits just those sections.

The `feature-documenter` agent runs as a pair with the wiki-updater. It updates `bot-features.md` — a flat reference of what the bot can do — and then the wiki-updater syncs any architectural implications into the wiki.

Before we had this, documentation lagged behind the code by weeks. Now it lags by at most one commit.

## Why Not Just Write Tests?

We do write tests. The sentinel has an end-to-end smoke test with a mocked DXLink stream. The scheduler has integration tests for futures sessions. The backtest engine has parameterized tests across strategy types.

But tests verify that code does what you told it to do. Agents verify that what you told it to do is correct. A test can confirm the z-score computation matches a known input-output pair. It takes an agent to notice that the computation uses population variance when the sample size makes sample variance the right choice.

The agents operate at a different level of abstraction. Tests answer "does this function return the expected value?" Agents answer "should this function exist, and is its approach sound given the financial domain it operates in?"

The trading-bot-tester doesn't write test cases — it identifies which test cases *should* be written. It outputs specific input conditions, expected behavior, and why each case matters. Then we write those tests. The agent provides the domain reasoning; the test suite provides the regression safety net.

## The Cost

Eight agents, six of them running Opus. This isn't free. A thorough code review by the trading-bot-tester on a 200-line diff costs roughly $0.50-1.00 in API calls. The backtest-statistician analyzing a full sweep can run $2-3. The wiki-updater on Sonnet costs pennies.

For context, a single misplaced trade on even a small account can lose hundreds of dollars in seconds. The deadlock bug from commit `e9b5343` could have caused the sentinel to stop monitoring entirely — during exactly the kind of market event where monitoring matters most. The agent review that caught it cost less than a dollar.

## What's Next

The agents currently run on-demand (except the wiki-updater hook). The next step is making the trading-bot-tester mandatory on every PR — a CI gate that blocks merge until the financial code audit passes. We're also looking at having the backtest-statistician automatically re-validate any strategy whose parameters the council modifies, creating a closed loop between the trading agents and the testing agents.

The bot watches the market. The agents watch the bot. The question we're working toward: who watches the agents?
