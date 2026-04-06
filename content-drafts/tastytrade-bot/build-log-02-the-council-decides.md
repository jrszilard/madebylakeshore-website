---
title: "The Council Decides"
slug: "build-log-02-the-council-decides"
series: "Building the Options Bot"
seriesOrder: 2
project: "tastytrade-bot"
publishedAt: "2026-04-05"
weekCovered: "2026-03-22 to 2026-04-01"
commitsAnalyzed: [afaf486, 88298cd, c2fca19, 87b04f2, 774c30d, 73f80f1, ff8a1d1, be284f8, e37ffe8, ab5824f, 81791d2, 81da1f2, 7fe643c, 5e9615b, a033fc7, d77405e, 67ba197, fbc9bee, ecb0910, 1f544b4, 57d8595, c34ee23, 3e0beda, d86909f, 36a2ce9, e9b5343, 046e31b, 4510722]
excerpt: "The options bot now has a parliament. Eight specialized agents — three local, five Claude-powered — analyze market conditions from different angles, debate through a Master Trader, and adapt parameters through a safety layer that can lock the whole system down if things go sideways."
tags: ["trading", "options", "ai-agents", "architecture", "python", "build-log"]
metaDescription: "Build log 2: How we built an adaptive trading council with 8 specialized agents, a Master Trader synthesizer, a Sentinel real-time monitor, and a safety layer with automatic lockdown."
---

The environment scorecard from [last time](/builds/build-log-01-from-signals-to-scorecard) was a good start — five inputs, one score, one decision. But it was static. The weights were hardcoded. The bot couldn't learn that IV Rank matters more in a choppy regime or that flow signals are noise during earnings season.

This week we gave the bot a brain trust. Eight agents, each with a narrow specialty, that argue about how the bot should behave. We're calling it the Adaptive Trading Council.

## The Architecture

The council has two tiers of agents. Tier 1 runs locally with no API calls — fast, cheap, every 15 minutes:

- **FlowAnalyst** — reads UW flow data, computes put/call ratios, flags unusual activity
- **RiskAnalyst** — evaluates portfolio Greeks, concentration risk, buying power usage
- **BayesianUpdater** — maintains a probability distribution over regime states, updates on each scan cycle

Tier 2 agents call the Claude API with specialized system prompts containing backtest context and trust hierarchies:

- **NewsMacroAnalyst** — daily cadence, reads financial headlines and economic calendar
- **RegimeAnalyst** — weekly, classifies current market regime with confidence intervals
- **SellPremiumAnalyst** — weekly, recommends premium-selling parameters based on regime
- **BuyPremiumAnalyst** — weekly, recommends directional trade parameters
- **MetaLearner** — monthly, audits the other agents' track records and suggests recalibration

Each agent produces a typed report — `FlowReport`, `RiskReport`, `MacroReport`, etc. — with structured fields, not free-text. The `RegimeAnalyst` doesn't return "I think we're in a bull market." It returns `RegimeReport(regime=RegimeType.BULL_HIGH_VOL, confidence=0.78, supporting_evidence=[...])`.

## The Master Trader

Reports flow to the Master Trader, which is itself a Claude-powered agent but with a different job. It doesn't analyze markets. It synthesizes the other agents' reports into parameter adjustments.

The Master Trader receives all available reports for a given cycle and produces a `WeightUpdate` — specific proposed changes to strategy parameters (delta targets, profit targets, position sizes, etc.) with a confidence score and reasoning.

The orchestrator schedules this at different cadences. Flow and risk run every 15 minutes. News/macro runs daily at 9 AM ET. The weekly agents (regime, premium analysts) fire Friday at 4:15 PM after the close. The MetaLearner runs the first Friday of each month.

Regime changes trigger an immediate out-of-band cycle: the RegimeAnalyst fires, the Master Trader re-evaluates, and parameter adjustments happen within minutes instead of waiting for the next scheduled window.

## Nothing Happens Without the Safety Layer

This is the part that kept us up at night. An AI system that adjusts its own trading parameters can blow up an account faster than a human can intervene. The safety layer has three defenses:

**Bounds checking.** Every adjustable parameter has a hard min/max range. The Master Trader can suggest widening delta targets, but it can't push past the configured extremes. These bounds are in code, not in the LLM prompt.

**Rate limiting.** Parameters can only change by a maximum percentage per adjustment cycle. Even if the RegimeAnalyst screams "everything changed," the system can only move so fast. This prevents a single bad Claude response from slamming parameters to extremes.

**Automatic lockdown.** If the safety layer detects anomalous behavior — too many parameter changes in a short window, changes that contradict themselves, or a rapid sequence of regime-change triggers — it enters lockdown mode. In lockdown, all parameters freeze to a `safe_mode_config.json` that's been manually audited and committed to the repo. The bot keeps trading, but with conservative defaults until a human reviews what happened.

The safety layer uses `AdaptationDB`, an SQLite database with SCD Type 2 history for every parameter. Every change records who requested it (which agent), what the old value was, what the new value is, and whether the safety layer modified or rejected it. Full audit trail.

## The Sentinel

While the council runs on scheduled cadences, the Sentinel runs continuously. It's a real-time market data listener that maintains a persistent DXLink streaming connection to the tastytrade API.

The Sentinel doesn't make trading decisions. It watches for trigger conditions — rate of change spikes, level breaks on key indices, portfolio stress thresholds — and fires `SENTINEL_TRIGGERED` events on the event bus. These events can wake the council for an unscheduled cycle or alert a human.

Three trigger types, each with configurable thresholds:

- **RateOfChangeTrigger** — fires when a symbol moves more than X% in Y minutes
- **LevelBreakTrigger** — fires when price crosses a configured level (support/resistance)
- **PortfolioStressTrigger** — fires when portfolio delta or P&L crosses a threshold

Every trigger logs to SQLite with a counterfactual follow-up: 30 minutes after a trigger fires, the logger records what actually happened. Did the spike continue or reverse? Was the alert justified? Over time, this builds a dataset for tuning trigger thresholds.

## The Interesting Part

We started the council in "counterfactual mode" — log what the agents would recommend, but don't apply any changes. The live bot keeps running with its manually-tuned parameters while we accumulate council recommendations alongside actual outcomes.

The counterfactual logger captures every proposed parameter change, timestamps it, and then records what the portfolio actually did over the next 1/5/20 trading days. After enough data, we can answer: would the council have improved returns? Reduced drawdowns? Or made things worse?

This is the honest version of AI-assisted trading. Don't trust the model until you can measure it against reality. The council is live, the agents are producing reports, the Master Trader is synthesizing recommendations — but nothing touches the real parameters until the counterfactual data says it should.

## What's Next

The council is running. The Sentinel is streaming. Counterfactual data is accumulating. Next: we connected to tastytrade's own backtest API for a ground-truth repricing layer, added buy-side strategies with trailing stops, and plugged Brave News and Grok's X integration into the NewsMacroAnalyst. That's next week's post.
