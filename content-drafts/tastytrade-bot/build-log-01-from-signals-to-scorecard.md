---
title: "From Signals to Scorecard"
slug: "build-log-01-from-signals-to-scorecard"
series: "Building the Options Bot"
seriesOrder: 1
project: "tastytrade-bot"
publishedAt: "2026-03-22"
excerpt: "32 commits in one week. We ripped out 4,383 lines of dead code, built a layered signal integration with Unusual Whales, added a regime classifier and environment scorecard, switched to parquet-backed backtesting, and ran a 144-config validation sweep. Here's how the bot learned to grade its own trading conditions."
tags: ["trading", "options", "backtesting", "signals", "python", "build-log"]
metaDescription: "Build log 1: How we integrated Unusual Whales flow signals, built a regime classifier and environment scorecard, and validated the system with a 144-configuration backtest sweep."
---

Thirty-two commits in seven days. This was the week the options bot stopped being a scanner that finds trades and started being a system that decides whether to take them.

The short version: we integrated a second data vendor (Unusual Whales), built a market regime classifier, created an environment scorecard that grades trading conditions on a 0-100 scale, switched the entire backtesting engine to parquet-backed data for 17 years of history, and ran a 144-configuration validation sweep. Then we removed 4,383 lines of dead code because half the original architecture was now obsolete.

## Two Layers of Flow Signals

The bot already had ThetaData for options chains and greeks. That tells you *what* the market is doing. We wanted to know what *other traders* think it's about to do.

Unusual Whales provides options flow data -- large or unusual trades that institutional players make. We built a two-layer integration:

**Layer 1: Chain-derived signals.** These come from the options chain data we already have. Put-call ratio computed from open interest and volume, replacing a disabled insider-trading component. No additional API calls needed, so zero budget impact.

**Layer 2: Enriched signals.** These hit UW's API endpoints for institutional flow sentiment, unusual activity scores, and sector-level positioning. More expensive, more signal.

The key decision: the direction engine now routes *all* scanning through a unified signal pipeline. Before, the scanner had its own logic for deciding bullish/bearish/neutral. Now it consults the direction engine, which aggregates all signal providers -- technical, flow, GEX -- and returns a weighted consensus. The scanner just asks "what direction?" and trusts the answer.

## Budget Tracking That Reads the Server's Mind

UW's API has rate limits. We built a rate limiter that doesn't guess -- it reads the `x-uw-*` response headers and tracks the server's actual budget counters. Three priority levels:

- **High** (live scanner): only blocked at absolute daily limit
- **Normal** (flow collection): blocked at 80% daily usage
- **Low** (enriched endpoints): blocked at 60% usage

The limiter persists state to disk so it survives restarts, and resets its counters at 8 PM ET when UW's daily window rolls over. Before we had this, we were burning through the daily budget by mid-afternoon and flying blind for the last two hours of trading.

## Should We Even Keep Paying for This?

Buying data is only worth it if the data has predictive value. So we built a value measurement report that answers a concrete question: should we keep the Unusual Whales subscription?

The report computes Information Coefficient -- Spearman rank correlation between each signal and 5-day forward returns, measured daily across all tickers. IC of 0.03 sounds tiny, but Pan & Poteshman (2006) showed that's meaningful for options flow. The report outputs a recommendation:

- **KEEP:** any enriched signal has >70% probability of meaningful IC
- **CANCEL:** all enriched signals below 50%
- **EXTEND:** somewhere in between, need more data

We're still collecting. But the framework means we'll know within a few weeks whether the $200/month is paying for itself.

## The Regime Classifier

Markets behave differently depending on whether we're in a bull trend with low volatility, a bear market with high volatility, or sideways chop. Selling premium in a 2020-style crash using 2019 parameters is how accounts blow up.

The regime classifier pre-computes a label for every trading date going back to 2008. It uses the same deterministic decision tree as the live detector, but derives inputs from historical data instead of live feeds:

- VIX proxied from SPY ATM implied volatility
- Term structure estimated from near-DTE vs far-DTE IV slope
- Trend from 50-day and 200-day SMA crossovers

Pre-computing is the key. During a backtest, regime lookup is O(1) -- just a dictionary lookup by date string. The alternative (computing VIX proxy and SMAs on every bar) would have made the 144-config sweep take days instead of hours.

## The Environment Scorecard

This is the piece that ties everything together. The scorecard takes five inputs and produces a single 0-100 quality score:

| Component | Weight | What it measures |
|---|---|---|
| IV Rank | 0.35 | Higher IVR = more premium to collect |
| Regime | 0.25 | Bull high-vol best, sideways weakest |
| Technical | 0.15 | Range-bound good, strong trend bad |
| VIX Level | 0.15 | Moderate best, extremes escalate |
| Term Structure | 0.10 | Contango normal, backwardation warning |

The scorecard never blocks a trade. It determines *autonomy*. Above threshold: auto-approve, execute without human review. Below threshold: send a Discord notification with the score breakdown and wait for approval.

We tried Telegram interactive approval first -- buttons in the chat for approve/reject/modify. Then we ripped it out after one day. The security surface was too large for what is essentially a CLI tool. The bot now uses a text-based TUI for manual approvals. Less flashy, more trustworthy.

## Parquet Everything

The backtesting engine was originally built on SQLite with ThetaData. That works for recent history but doesn't cover crashes. We added a parquet-backed data source using DuckDB that reads the philippdubach options dataset -- daily option chains from 2008 to 2025 for 10 symbols.

Same interface as the SQLite source. The backtest engine doesn't know which one it's using. Each `ParquetDataSource` instance holds its own in-memory DuckDB connection, so worker processes don't step on each other.

With 17 years of data, we could finally test strategies across the 2008 financial crisis, the 2020 COVID crash, and the 2022 rate-hike drawdown.

## 144 Configs, One Sweep

We ran a full parameter sweep: 3 strategy types, multiple DTE targets, delta ranges, profit targets, stop losses. 144 configurations total, each running across the full 2008-2025 date range on index ETFs.

The component tests isolated variables one at a time -- Phase 1A tested profit target percentages, stop loss multipliers, and DTE management thresholds independently. The final validation script combined the three winners (25% profit target, no stop loss, 14-day DTE management) into one recipe and ran it on SPY, QQQ, and IWM.

Memory was a problem. Each backtest loads years of option chain data. The final validation script runs with `--parallel 1` and does explicit `gc.collect()` between symbols. It's designed to run overnight unattended.

The single-stock tests added width scaling, IVR gating, earnings blackout, and strategy selection -- each as a separate YAML config that can be composed and re-run.

## The Cleanup

After all of this, half the original codebase was dead. We removed 4,383 lines across 25 files: the old strategy engine, the correlation monitor, the dynamic profit targets module, the roll decision engine, the API resilience layer, the conversation UI, the research UI, the response formatter. All replaced by better abstractions.

The codebase is smaller now than it was a week ago despite adding the signal integration, regime classifier, scorecard, and parquet engine. That's the right direction.

## What's Next

The IVR validation data is still accumulating. Once we have enough trades stratified by IV Rank at entry, we'll know whether the scorecard's 0.35 IVR weight is justified or needs recalibrating. The UW value report will tell us within a few weeks whether to keep, cancel, or extend the subscription.

Next week is about single-stock refinement. The index ETF recipes work. Individual stocks have earnings risk, sector correlation, and liquidity quirks that the current system doesn't account for.
