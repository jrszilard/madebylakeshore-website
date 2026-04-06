---
title: "The Client Portal POC"
slug: "build-log-01-the-client-portal-poc"
series: "Building Lakeshore Analytics"
seriesOrder: 1
project: "lakeshore-analytics"
publishedAt: "2026-04-05"
weekCovered: "2026-03-22 to 2026-04-05"
commitsAnalyzed: [05e1f40, 8d10638, 5de3830, 26eba72, 0232011, 176900e, 4369cf7, 2886a23, fe7810f, 5c21602, 884aff2, 3f9f8a1, 46f2f4b, 66e6b89, 359e789, 6f6f144, 3053f20, b2ce714, b2d6e74]
excerpt: "We built a multi-tenant analytics portal from scratch — Supabase auth, Cube.js semantic layer, a Python pricing model, a Shopify sync connector, and an AI chat panel that queries real data through tools. Nineteen commits to a working POC for client-facing business intelligence."
tags: ["analytics", "cube-js", "ai", "saas", "full-stack", "build-log"]
metaDescription: "Build log 1: Building a multi-tenant analytics platform with Cube.js semantic layer, price elasticity models, AI chat, and Shopify data sync."
---

New project. Different problem.

The consulting practice generates custom analytics dashboards for clients. Each one is bespoke — connect to their data, build their models, deploy their reports. Every engagement starts from zero. We wanted a platform that handles the common pieces so we can focus on the client-specific analysis.

Nineteen commits, from empty directory to a working multi-tenant POC with auth, dashboards, a pricing model, and an AI analyst.

## The Stack

**Portal:** Next.js with App Router, Supabase Auth for login, Tailwind for UI. Each client gets a URL like `/portal/{client-slug}` with a sidebar (Overview, Revenue Explorer, Pricing Simulator, AI Chat) and a header showing the client's brand.

**Semantic Layer:** Cube.js handles the data modeling. YAML files define cubes for orders and customers with measures (revenue, order count, average order value, units sold) and dimensions (date, region, category, product, vendor). The Cube.js security context is multi-tenant — each client's queries are automatically scoped to their schema. No cross-client data leakage even if the frontend sends a bad request.

**Models Service:** A Python FastAPI backend with a price elasticity model. Log-log demand model: `ln(Q) = a + b * ln(P)`, where `b` is the elasticity coefficient. The model fits on historical price/quantity data, then simulates price changes with confidence intervals derived from residual standard deviation.

**Data Sync:** A Supabase Edge Function that syncs orders from Shopify's REST API into the database. Handles pagination, maps Shopify's nested line-item structure to flat order rows, and logs sync errors without killing the batch.

## Cube.js as the Single Source of Truth

This was the core architectural decision. Instead of writing SQL queries in the portal frontend or the API layer, every metric flows through Cube.js. The frontend calls our `/api/cube` proxy, which forwards to Cube.js, which generates SQL from the semantic model.

Why this matters: when a client asks "what's our revenue?", the answer should be the same whether they're looking at the dashboard, asking the AI assistant, or querying the pricing model. Cube.js guarantees that. Revenue is defined once, in `orders.yml`, as `sum of paid order line items`. Every consumer uses that definition.

The multi-tenant security context uses a JWT with `client_id` and `schema` claims. Cube.js appends a schema prefix to every generated query. Client A's data lives in `client_a.orders`, Client B's in `client_b.orders`. The portal resolves the schema from the URL slug at login.

## The Pricing Simulator

The Revenue Explorer lets clients slice and filter their data. Useful for understanding the past. The Pricing Simulator lets them model the future.

The price slider adjusts a proposed price change (-30% to +30%) and the model returns projected volume and revenue impact. The elasticity coefficient tells you the tradeoff: a product with elasticity -1.2 means a 10% price increase causes a 12% volume drop. The simulator shows whether that net-nets positive or negative on revenue, with confidence bands.

The model trains on the client's historical data per product category. Categories with more data produce tighter confidence intervals. Categories with sparse data get wider bands and a warning. The frontend shows this visually — the confidence band literally gets fatter when the model is less certain.

## The Interesting Part: AI Chat with Real Data

The portal has a chat panel powered by Claude with three tools:

**`query_metrics`** — sends a Cube.js query with measures, dimensions, filters, and time ranges. The AI can answer "what was our revenue last quarter?" by querying the semantic layer, not guessing.

**`compare_periods`** — runs two time-range queries in parallel and returns both result sets. "Compare this January to last January" produces both datasets so Claude can calculate the delta.

**`run_pricing_model`** — calls the Python FastAPI service to run a price simulation. "What happens if we raise electronics prices by 15%?" returns projected volume, revenue, and confidence intervals.

The system prompt tells the AI its available metrics and dimensions. It explicitly says: "Only use the provided tools to access data. Never fabricate numbers. If a query returns no results, say so."

The tool use loop runs until Claude has enough data to answer. A question like "which category had the biggest revenue growth quarter-over-quarter?" triggers multiple `query_metrics` calls (one per quarter per category), then a synthesis. Claude does the comparison logic; Cube.js provides the numbers.

This is the pitch for the consulting practice: your clients don't just get dashboards, they get an analyst that answers questions from their real data, 24/7, using the same metric definitions as the dashboards.

## Deployment

The POC runs on Docker with three containers: Cube.js, the models service, and a Caddy reverse proxy. We tried Railway first (hence the `railway.toml` files), then moved to a Hetzner deployment config with Docker Compose. The portal itself deploys to Vercel like our other Next.js apps.

Synthetic demo data seeds the POC: 2,000 orders, 500 customers, 50 products across 5 categories, spanning 12 months. Enough to demonstrate every feature without exposing real client data.

## What's Next

The POC proves the architecture. Next: connecting a real Shopify store, training the pricing model on actual transaction data, and adding the dashboard customization layer that lets clients configure which metrics appear on their overview page. The AI chat needs conversation history (currently stateless per message) and the ability to generate charts, not just text.
