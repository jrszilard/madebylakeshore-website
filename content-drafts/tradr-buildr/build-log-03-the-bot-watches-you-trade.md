---
title: "The Bot Watches You Trade"
slug: "build-log-03-the-bot-watches-you-trade"
series: "Building Tradr Buildr"
seriesOrder: 3
project: "tradr-buildr"
publishedAt: "2026-04-05"
weekCovered: "2026-03-29 to 2026-04-05"
commitsAnalyzed: [f6bd83a, 7f95ae8, 72f78b3, b0de10f, 2267b23, a407054, 0d5153e, 580488f, 80eca98, 036e9f1, 1f7cbed, dce82ac, c00c5aa, cb3dfce, 4977830, 62dc50c, e6fc93c, 5f26f03, ae30ba9, d9a0316, d14b39a, 624fc54, a8eedbb, 0baeed3, 811dbe5, 425a243, da30535, a0b1619, 670fc32, 3b7310a, 7115d6f, 1a41752, b872398, 3af2702, fcb32fe, 30a2de9, 9c11d96, 7400cb0, 8735f49, fe960b4, ba5e76a, 160de44]
excerpt: "We built a closed-loop intelligence layer that tracks trading behavior, detects when you go off-script, computes counterfactual outcomes for manual closes, and delivers weekly briefings. Plus: unlogged signals, a full trades page, and the TwelveData rate limiter saga."
tags: ["trading", "options", "behavioral-analytics", "intelligence", "full-stack", "build-log"]
metaDescription: "Build log 3: Closed-loop intelligence layer with behavioral tracking, off-script detection, counterfactual analysis, unlogged signals, and a trades management page."
---

The platform can backtest strategies and compare results. But there's a gap between "here's what the strategy does on historical data" and "here's what happens when a human actually trades it." Humans override management rules. They close early out of fear. They hold too long out of greed. They skip signals when they're busy.

This week we built the intelligence layer that watches all of that.

## Unlogged Signals: The Honest Accountability System

The scanner fires signals when market conditions match your strategy. Some signals get traded. Some don't — you were in a meeting, or you already had max positions, or you just didn't feel like it. Before this week, the skipped signals vanished. Now they don't.

`list_unlogged_signals` compares signals fired in the current business day against the trade log. Any signal without a matching trade entry shows up in a new "Unlogged Signals" section on the signals page and as a badge on the dashboard. A `business_day_cutoff` function handles the edge case of signals that fire at 3:55 PM — they stay "unlogged" until the next business day's open, not until midnight.

Each unlogged signal card has a retroactive entry form. You can log the trade after the fact (with the actual fill price, not the signal price) or explicitly mark it as skipped. The form captures `entry_date` and `underlying_price_at_entry` so the system can compute counterfactuals later.

This is the accountability hook. You can see exactly how many signals you skipped and what those signals would have done. The intelligence layer uses this data downstream.

## Behavioral Tracking

Phase 2 added three services:

**ConsistencyService** scores how closely you follow your own rules. It tracks management adherence (did you close at the profit target or override it?), signal response rate (what percentage of signals did you trade?), and rule compliance (did positions stay within configured limits?). The output is a 0-100 consistency score with streak tracking — "12 consecutive on-script trades" or "3 off-script in the last 5."

**ReplayService** lets you step through a closed trade decision by decision. "At this point, price was here, your management rules said X, you did Y. Here's what would have happened if you'd followed the rules." It's not a backtester — it uses actual trade data and walks forward through OHLCV bars from the close date.

**One-tap trade feedback.** Every signal card and trade log entry gets a feedback button. Did you follow your rules? What was your emotional state? One tap, not a form. The data feeds the insight generators.

## Four Insight Generators

The intelligence engine runs four generators on each closed trade batch:

**DeviationGenerator** — finds trades where you deviated from management rules and computes the cost (or benefit) of that deviation. If your strategy says close at 50% profit and you closed at 30%, it calculates what 50% would have been worth.

**OffScriptGenerator** — zooms out from individual trades to patterns. At 5+ manual closes with an off-script rate above 20%, it fires an insight. "You're overriding your stop loss on 3 out of 10 IWM trades. Those overrides cost $420 vs. what the rules would have produced." The threshold prevents noise on small sample sizes.

**RegimeBehavioralGenerator** — correlates your trading behavior with VIX regime. "In high-vol environments, your off-script rate doubles. Your consistency score drops from 82 to 61." This helps traders recognize that their risk management breaks down when they're most stressed.

**ConsistencyTrendGenerator** — tracks consistency score over time and correlates trend direction with P&L. "Your consistency score has been climbing for 3 weeks. During that period, your risk-adjusted returns improved by 15%." Or the uncomfortable version: "You've been more disciplined but returns are flat — your rules might need updating."

Each generator produces an `InsightCreate` with a category, severity, and optional `Countdown` — a timer that triggers a follow-up check. "You had 4 off-script trades this week. We'll check again in 5 trading days to see if the pattern continued."

## The Counterfactual Engine

The `DeviationService` does the heavy lifting for individual trade counterfactuals. Given a manually-closed trade, it:

1. Fetches the strategy's management rules (profit target, stop loss, DTE management)
2. Walks forward through OHLCV data from the actual close date to expiration
3. Simulates what would have happened if the rules had been followed
4. Returns the counterfactual P&L, which exit rule would have triggered, and on what date

The `BriefingService` rolls this up into a weekly briefing: total deviation cost, most costly override, consistency trend, and a comparison of on-script vs. off-script P&L for the week. The briefing card on the dashboard shows this every Monday morning.

## The Trades Page

All of this insight data needs a home. We built a full trades page with three tabs (open, closed, skipped), a P&L summary bar, expandable trade cards, per-leg breakdowns, and a correction edit form.

The correction system uses SCD Type 4 history — every edit to a trade log entry preserves the original and previous versions in a `trade_log_history` table. The correction form lets you fix fill prices, entry dates, and leg details without destroying the audit trail. `TradeLegService` handles multi-leg positions (iron condors have 4 legs; each needs independent tracking).

## The Interesting Part: The TwelveData Rate Limiter

The signal scanner needs real-time OHLCV data. TwelveData provides it, but their free tier has aggressive rate limits (8 req/min, 800 req/day). Our first implementation hammered the API on every scan cycle and burned through the daily budget by lunchtime.

The fix was a proper rate limiter with request-level and daily budget tracking, plus OHLCV caching in the scanner. If we fetched SPY daily bars 10 minutes ago, we use the cached version. The limiter also switched from query-parameter auth to header auth (`Authorization: apikey XXX`) and added exponential backoff with jitter on 429 responses.

Small infrastructure work. But the scanner went from "works for 3 hours then goes blind" to "runs all day on the free tier." Sometimes the boring fix is the important one.

## What's Next

The intelligence layer is live. The behavioral data is flowing. Next: cold-start system for new users (what do you show someone who has zero trades?), and the LLM council evaluation — should Charty use the insight data to proactively coach traders, and if so, how aggressive should that coaching be?
