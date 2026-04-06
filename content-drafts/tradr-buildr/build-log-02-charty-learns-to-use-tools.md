---
title: "Charty Learns to Use Tools"
slug: "build-log-02-charty-learns-to-use-tools"
series: "Building Tradr Buildr"
seriesOrder: 2
project: "tradr-buildr"
publishedAt: "2026-04-05"
weekCovered: "2026-03-22 to 2026-03-29"
commitsAnalyzed: [a1ce869, af93022, cc72c89, 264da51, 2edd8c6, fe88072, 3c4275f, e7d7ec8, 816b1e0, 0f7df1b, 77d4b1b, 14d0666, a13e65a, 23d43b1, 0c79d4f, 242c3ff, 0c99f07, 323f72f, fc35624, 02887f2, 9e46799, 436626a, 527db13, e116eb4, 5eccf6c, f640be6, 5001759, 853e6f2, faf76b9, 2a5e6b4, 1558ca8, 2a28f21, 7f02efe, b22b23e, c61d59d, 0e9d98e, bec5110, 68f88a1, d04a912, 079b72c, b8eca18, e3654bd, f884dec, 6295b81, c43c5ad, 86d402e, 63da107, 4bc712a, 12f7303, 2233710, 6e8e3aa, 1b670f5, d797313, 9dcb4c5, 7a7f28e, 7dfec30, 87ba8a5, e5294d1, 5dd5691, cf5d38c, d5b5313, f918816, c64d16f, 0bcdd42, 7c58aa7, ee00d48, b96a385, c0f753c, 8044829, e8b8e9d]
excerpt: "We gave the AI assistant real database tools, built portfolio backtesting with multi-symbol risk management, added backtest save and compare, and created an analytics component library. Charty went from a chatbot that gives tips to an assistant that queries your data."
tags: ["trading", "options", "ai-assistant", "portfolio", "backtesting", "build-log"]
metaDescription: "Build log 2: Charty gets tool use for querying backtests, portfolio backtesting engine with risk management, save/compare features, and an analytics component library."
---

[Last time](/builds/build-log-01-zero-to-options-platform) we built the platform in 48 hours. This week we made it actually useful — which took considerably longer than 48 hours.

Three big moves: Charty (the AI assistant) got real tools to query the database, we built portfolio-level backtesting with multi-symbol risk management, and we added the save/compare workflow that turns one-off backtests into a strategy development process.

## Charty Gets Tools

Charty started as a chatbot that offered tips. "Try tightening your delta to 0.15 for lower-volatility environments." Helpful in theory. Useless if you can't see whether that advice actually applies to your backtest results.

We rebuilt Charty with Claude tool use. Three tools:

**`query_backtest_results`** — fetches a backtest by ID and returns the full result set: summary metrics, trade log, equity curve data. Charty can now say "Your SPY iron condor backtest had a 62% win rate but a -0.3 Sharpe — your losers are outsized relative to winners" because it's looking at the actual data, not guessing.

**`get_backtest_by_id`** — lighter query that returns metadata and summary without the full trade log. Used for comparison workflows where Charty needs to reference multiple backtests without blowing up context.

**`list_recent_backtests`** — returns the user's recent runs so Charty can reference them in conversation. "Your last three SPY backtests all had drawdowns exceeding 15% — want me to suggest a tighter stop loss?"

The tool use loop is async with tiered model selection. Starter users get Haiku (fast, cheap). Pro gets Sonnet. Elite gets Opus. The loop runs up to 5 tool calls per conversation turn before forcing a response.

We also added page context — Charty knows which page you're on and what you're looking at. On the backtest result page, it receives the backtest ID and can proactively comment on the results. On the strategy builder, it receives the current strategy configuration and can suggest improvements.

The debug panel (Pro+ users) shows tool calls in real time — what Charty queried, what it got back, and how it used the data. Transparency, not a black box.

## Portfolio Backtesting

Single-symbol backtesting answers "does this strategy work on SPY?" Portfolio backtesting answers "does this collection of strategies survive a correlated drawdown?"

The engine runs multiple symbols simultaneously with shared risk management. You configure per-symbol strategies (SPY iron condors + IWM strangles + QQQ verticals), set portfolio-level constraints (max total delta, max drawdown, max buying power usage), and run the whole thing across historical data.

`PortfolioRiskManager` enforces constraints at the portfolio level. If the combined delta of all positions exceeds the threshold, it blocks new entries on the side that's heavy. If drawdown hits the limit, it goes to defense mode — only closing positions, no new entries.

Per-symbol results are tracked independently (each gets its own equity curve, metrics, trade log) while portfolio-level metrics aggregate across everything. The result page has tabbed per-symbol views and a portfolio-wide summary with risk events logged — every time a constraint blocked a trade, you can see why.

Tier gating is enforced server-side. Starter users get 2 symbols max. Pro gets 5. Elite gets 10 with custom position sizes. The backtest service checks the user's subscription tier from the database (not the JWT — we learned that lesson after a caching bug where expired trials could still run Pro-tier backtests).

## Save, Compare, Iterate

Before this week, every backtest was ephemeral. Run it, look at the results, close the tab, gone. That's fine for exploration but terrible for strategy development, where you need to compare 15 variations of the same idea.

We added save/rename/unsave with tier-limited retention. Starter users keep 5 recent backtests for 7 days. Pro keeps 50 for 90 days. Elite keeps unlimited. A Supabase cron job purges expired entries daily.

The comparison page overlays equity curves and puts metrics side-by-side. Select 2-4 saved backtests and see them on the same chart with a metrics table below. This is where the product starts to feel like a real tool — you run SPY iron condors with 25% profit target, save it, run the same thing with 50%, save it, and immediately see which one has better risk-adjusted returns.

## The Interesting Part: Theta Decay Gets Subtle

While building the portfolio engine, we found that our P&L model was wrong. Specifically, our theta decay model was wrong.

The original model used `sqrt(DTE / 45)` — square root scaling from 45 DTE. This is textbook. But it produced a 0.6 cap on the decay factor that made no sense for far-dated options (90+ DTE positions showed almost no time decay, which contradicts reality).

We replaced it with quadratic decay: `(DTE / 45)^2`. This matches empirical observation better — theta is negligible far from expiration and accelerates dramatically under 21 DTE. The fix also required adding a `current_date` parameter to the position adapter so it could calculate remaining DTE correctly instead of using the simulation start date.

Three lines of math. Every backtest that included positions held past 45 DTE was slightly wrong before this fix. The kind of bug that doesn't crash anything — it just makes your confidence intervals subtly too narrow.

## What's Next

We have a platform where you can build strategies, backtest them on single symbols or portfolios, save and compare results, and talk to an AI assistant that actually reads your data. Next: the intelligence layer — behavioral tracking, consistency scoring, and closed-loop insights that tell you not just how your strategies perform, but how *you* perform when you deviate from them.
