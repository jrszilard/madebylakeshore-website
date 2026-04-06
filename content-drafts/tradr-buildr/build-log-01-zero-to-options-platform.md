---
title: "Zero to Options Platform in 48 Hours"
slug: "build-log-01-zero-to-options-platform"
series: "Building Tradr Buildr"
seriesOrder: 1
project: "tradr-buildr"
publishedAt: "2026-03-22"
excerpt: "We built a full options trading platform in two days -- FastAPI backend, Next.js 16 frontend, Supabase auth, Stripe payments, a Bjerksund-Stensland options pricer, a strategy compiler, backtesting engine, signal scanner, and a Scratch-inspired visual builder. 25 commits, 64,000 lines, and one question: can you productize a private trading bot?"
tags: ["trading", "options", "full-stack", "fastapi", "nextjs", "build-log"]
metaDescription: "Build log 1: How we went from idea to a full options trading platform in 48 hours — FastAPI, Next.js 16, options pricing engine, visual strategy builder, and tiered subscriptions."
---

This started with a question: what if the private options bot we've been building for ourselves could be a product that other traders use?

The tastytrade-bot is powerful but personal -- a CLI tool that scans markets, evaluates strategies, and proposes trades for one user. Tradr Buildr is the attempt to turn that expertise into a platform where any options trader can build, test, and monitor their own strategies without writing code.

We built the entire thing in 48 hours. Twenty-five commits, 64,000 lines of code, six implementation plans executed in sequence. Here's how.

## The Stack

**Backend:** FastAPI with a proper engine layer -- data providers, analysis engine, strategy compiler, backtest engine, signal scanner, and alert service. Not a thin API wrapping a database. The backend does real computation.

**Frontend:** Next.js 16 with App Router, shadcn/ui components, Supabase Auth, and Stripe for payments. Two layout groups -- marketing pages (pricing, landing) and the authenticated dashboard.

**Database:** Supabase (PostgreSQL) with row-level security. The schema has tables for strategies, backtests, trade results, signals, positions, alerts, and subscriptions.

**Payments:** Three tiers (Starter free, Pro $29/mo, Elite $99/mo) with feature gating enforced server-side. The tier enforcer isn't a UI toggle -- it validates every API request against the user's subscription level.

## The Strategy Compiler

This is the core abstraction. A strategy is a JSON document that defines entry conditions, management rules, and a watchlist. The compiler takes that JSON and produces a `CompiledStrategy` whose `evaluate()` method can test any `MarketSnapshot` against all conditions.

Conditions are things like "IV Rank above 30," "RSI below 70," "price above 50-day SMA." Each condition compiles to a `ConditionEvaluator` -- a callable that takes a snapshot and returns (passed, actual_value). The compiled strategy runs them all and applies the logical operator (AND or OR).

The compiler validates the JSON first using a separate `StrategyValidator`, then builds the evaluator pipeline. Invalid strategies fail at compile time, not when the scanner is running at market open.

## An Actual Options Pricer

Most retail trading tools show you the mid-price from your broker. We built a Bjerksund-Stensland 2002 American options pricer -- the same closed-form approximation used in professional quant systems.

Why not Black-Scholes? Because Black-Scholes prices European options. American options can be exercised early. For puts especially, the early exercise premium matters. Bjerksund-Stensland handles this with a two-point boundary approximation that's within 0.1% of binomial tree prices for typical parameters.

The pricer is stateless and computes Greeks via finite differences: bump the spot price by 1% for delta/gamma, bump time by one day for theta, bump vol by 1 point for vega. Model-agnostic -- swap the pricing model and the Greek calculations don't change.

On top of that, we built an IV surface with bucket-based calibration from real market data (philippdubach dataset), a contract selector that finds the best strike/expiry for a given strategy, and a spread pricer that handles verticals and strangles.

## The Visual Builder

The design spec calls for a "Scratch-like" visual strategy builder. Traders drag condition blocks onto a canvas, connect them with AND/OR logic, set management rules, and see the compiled strategy update in real time.

The current implementation has a block palette, block wrapper with drag handles, condition blocks (IV rank, RSI, SMA, earnings proximity), management blocks (profit target, stop loss, DTE management), and a strategy type block that sets the option structure (iron condor, strangle, vertical, etc.).

It's not Scratch yet -- that's Plan 8 (the product loop redesign). But the component architecture is built for it. Each block is self-contained with its own state and validation. The canvas manages layout and connections.

## Backtesting with Real Disclaimers

The backtest engine runs a strategy against historical data and produces metrics: total return, max drawdown, Sharpe ratio, win rate, average P&L per trade, monthly heatmap.

We spent real time on the legal side. Financial software has regulatory requirements. Every backtest result page shows a disclaimer. Strategy activation goes through a modal that explains this is not financial advice, past performance doesn't guarantee future results, and options involve risk of substantial loss. These aren't afterthoughts -- they're baked into the component tree.

## Signal Scanner and Alerts

The scanner runs the compiled strategy against live market data at configurable intervals. When conditions trigger, it generates a signal with the matched conditions and current snapshot. Users configure alerts per channel -- email, SMS, push -- with per-signal-type toggles.

The alert service is throttled by tier. Starter users get basic alerts with delay. Pro gets real-time. Elite gets priority delivery and custom webhook integrations.

## Six Plans in Two Days

The speed came from having detailed implementation plans written before any code. Each plan specified every file to create, every function signature, every test to write. The six plans in sequence:

1. **Scaffolding** -- FastAPI app, Next.js project, Supabase migration, auth flow
2. **Data Providers** -- OHLCV cache, technical indicators, IV rank calculator, FRED/EDGAR integration, strategy compiler
3. **Backtest Engine** -- Engine core, portfolio tracker, position model, metrics calculator, results UI
4. **Strategy Builder** -- Visual canvas, block components, template picker, CRUD API
5. **Signals & Alerts** -- Signal scanner, alert channels, position tracker, dashboard
6. **Payments** -- Stripe checkout, webhook handler, tier enforcement, pricing page

Then Plans 7 (options pricing engine) and 8 (product loop redesign) added the quant layer and the UX rethink.

## What's Next

The platform exists. The options pricer works. The strategy builder compiles valid strategies. The backtest engine produces results. But it's not a product yet.

Next: the product loop redesign (Build, Test, Track, Refine) that makes the whole experience feel like a workflow instead of a collection of pages. And connecting the IV surface calibration to live market data instead of the static philippdubach dataset.
