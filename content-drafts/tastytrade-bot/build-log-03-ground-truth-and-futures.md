---
title: "Ground Truth and Futures at 3 AM"
slug: "build-log-03-ground-truth-and-futures"
series: "Building the Options Bot"
seriesOrder: 3
project: "tastytrade-bot"
publishedAt: "2026-04-05"
weekCovered: "2026-04-01 to 2026-04-05"
commitsAnalyzed: [a93f331, 23324f6, 44dcadc, c845099, a17a12e, 79d7db3, f3d2ff2, 9415fbf, e9eb252, a70f4ac, 66cfedd, c3b1605, 23e41cd, c09c892, 437d432, be03633, 0eaac36, 2d8ba36, a090a7a, de4be51, 1f59ca7, 64c5bf5, 19d931a, ed2e299, 18a329a, 206d0cb, aa8ae8c, 5cd09ef, b7a35e2, 02baee7, 4c5d952, ab2df4d, 64e2800, 7dd7912, 3204c96]
excerpt: "We plugged into tastytrade's backtest API for ground-truth repricing, added buy-side strategies with trailing stops, connected the council to Brave News and X via Grok, fixed 22 buy-side bugs in one commit, and taught the scheduler that futures trade at 3 AM on a Sunday."
tags: ["trading", "options", "backtesting", "api-integration", "futures", "build-log"]
metaDescription: "Build log 3: Tastytrade backtest API integration with 4-tier repricing, buy-side strategies, Brave/Grok news feeds, and futures session awareness for the options bot."
---

Last post covered the [council architecture](/builds/build-log-02-the-council-decides) — agents, Master Trader, safety layer. This week was about giving all of those systems better data to work with and extending the bot into territory it's never traded: directional positions and overnight futures sessions.

## TastyTrade's Own Backtest API

Our backtest engine uses historical option chain data from the philippdubach parquet dataset. That's good for strategy-level validation across 17 years. But there's a gap: our repricing model uses Bjerksund-Stensland with estimated inputs (IV from ATM approximation, dividend yield from historical data). Tastytrade's backtest API uses their actual historical fills and marks.

We built a client with two modes:

**SimulationClient** hits the `/simulate-trade` endpoint. You send an OCC option symbol, entry date, and position, and get back a daily P&L series using tastytrade's actual historical marks. This is the ground truth for comparing our model-based repricing against what a real position would have shown.

**BenchmarkClient** hits `/backtests` to run tastytrade's built-in strategy backtester. Different purpose — comparing our strategy selection against their standard templates.

The client has a SQLite-backed `SimulationCache` that deduplicates API calls. OCC symbols are deterministic (same ticker + expiry + strike + right always produces the same 21-character symbol), so the cache key is just the symbol plus date range. Once we've fetched a repricing series, we never fetch it again.

Rate limiting was the tricky part. The API isn't documented for third-party use — we reverse-engineered it from their web backtest tool. An `AdaptiveRateLimiter` starts conservatively (1 req/sec), backs off on 429s, and gradually ramps back up. The limiter state resets on cold start but the cache means repeat queries never hit the API anyway.

## Four-Tier Repricing

The backtest engine now has a repricing chain. When evaluating a historical position:

1. **TastyTrade API** — if we have a cached simulation for this exact position, use it. Highest fidelity.
2. **Bjerksund-Stensland model** — our own American options pricer with calibrated IV surface. Good for most scenarios.
3. **Intrinsic-only fallback** — when IV data is missing (far-dated options, low liquidity), fall to intrinsic value plus a time value estimate.
4. **Position-level stop** — if all pricing fails, mark the position at its last known price and flag it for review.

The chain tries each tier in order and falls through. Every trade in the backtest log records which tier produced its mark. This lets us audit model quality: what percentage of trades relied on tier 1 vs tier 3? If we're falling through to intrinsic-only on 40% of positions, our IV calibration needs work.

## Buy-Side Strategies

Until now, the bot only sold premium — iron condors, strangles, credit spreads. This week we added long calls and long puts with trailing stop management.

The motivation: in strong directional regimes, selling premium bleeds money. The regime classifier knows when we're in a trend. The council's BuyPremiumAnalyst recommends parameters. The missing piece was the execution engine actually supporting directional trades.

Long positions have fundamentally different management rules. A credit spread has a defined max loss and a profit target as a percentage of credit received. A long option has unlimited upside and decaying value. We added trailing stops that ratchet: once a position hits 50% gain, the stop moves to breakeven. At 100%, the stop moves to 50% of peak. At 200%, to 75%. The trail never moves backward.

Getting this right required fixing 22 bugs in a single commit — `a70f4ac` was 916 insertions across 14 files. The paper tracker, risk manager, position manager, scanner, and strategy engine all assumed every position was a credit spread. Things like: max loss was computed as "credit received minus width" (undefined for a long call), the profit target was a percentage of credit (zero for a debit trade), and the DTE management logic tried to roll a long option into a new spread.

## Brave News and X

The council's NewsMacroAnalyst was designed to ingest financial headlines and economic calendar data. It had the agent prompt and the report schema but no actual data source. This week we plugged in two:

**Brave News API** fetches financial headlines and economic calendar data via their News Search endpoint. Two queries ("stock market financial news today" and "Federal Reserve economy monetary policy") plus an economic calendar query, all with a 60-minute cooldown. The MacroAnalyst receives these as structured `headline` and `calendar_event` objects in its system prompt.

**Grok X integration** fetches financial sentiment from X posts via the Grok API. This one was more experimental — the signal-to-noise ratio on financial X is terrible. The fetcher filters for accounts with >10K followers and financial keywords, then summarizes sentiment rather than passing raw posts.

Both are optional dependencies. If the API keys aren't set, the fetcher returns empty results and the MacroAnalyst works with whatever other data it has.

## The Interesting Part: Futures at 3 AM

The scheduler was built around NYSE equity hours: pre-market, regular, after-hours. But futures trade on a different schedule — Sunday 6 PM ET to Friday 8 PM ET, nearly 24 hours a day. The Sentinel streams /ES and VIX futures for real-time regime monitoring. Those streams were disconnecting every evening because the scheduler thought the market was closed.

We added a `FUTURES` session type and a `SessionTier` enum that controls which tasks run when. Tasks tagged `SessionTier.EQUITY` only run during regular hours. `SessionTier.EXTENDED` adds pre/post-market. `SessionTier.FUTURES` runs whenever futures are open — which is most of the time.

The regime classifier got a `detect_overnight()` method that produces partial regime snapshots from futures data alone (no equity options chain available, so IVR and term structure are interpolated from VIX futures). The headless runner registers an `overnight_regime_update` task that runs these partial snapshots during the futures-only window.

The result: the council now knows about overnight regime shifts before the equity market opens. If VIX futures spike at 3 AM on a Tuesday, the regime classifier flags it, the Sentinel fires an event, and the council can have a recommendation ready before 9:30 AM.

## What's Next

The bot has buy-side and sell-side strategies, a council that adapts parameters, a sentinel that watches 24/7, and a backtest API for ground truth. The counterfactual data is accumulating. Next priority: enough data to start evaluating whether the council actually improves outcomes versus static parameters — and the first real parameter unlock if it does.
