---
title: "Why We Built DIY Helper"
slug: "why-we-built-diy-helper"
series: "Building DIY Helper"
seriesOrder: 1
project: "diy-helper"
publishedAt: "2026-03-13"
---

## The Problem Was Personal

We bought an old house. Not charming-old. Needs-work-old.

Within the first month, Justin had fifteen browser tabs open trying to figure out whether the kitchen outlet spacing met current NEC code. National codes in one tab, local Portsmouth ordinances in another, a Reddit thread from 2019 that may or may not still be accurate, and a YouTube video where a guy in a garage contradicts all of them. Wilma, meanwhile, was pricing tile for a bathroom remodel across three different store websites, each with its own idea of what "in stock" means.

This is what every homeowner goes through. You are not doing the project yet. You are doing research *about* the project, and the research alone takes hours. Building codes, permit requirements, materials lists, pricing, tutorial videos, local store availability -- all of it scattered across dozens of sources that do not talk to each other.

We kept saying the same thing: someone should just build a tool that does all of this at once. Then we realized we were the someones.

## What We Wanted It To Do

We had three requirements, and they were non-negotiable.

**Ground everything in real data.** Building codes are not vibes. If the system says you need a GFCI outlet within six feet of a water source, it should be referencing the actual NEC requirement, not hallucinating one. Same for local codes -- what is true in Portsmouth, NH is not necessarily true in Austin, TX.

**Produce output you can act on.** We did not want another chatbot that gives you a paragraph of general advice. We wanted a shopping list with real prices. Steps ordered by dependency. Time estimates calibrated to someone doing this on weekends. The kind of output you can print and take to Home Depot.

**Know what you already own.** Justin has a garage full of tools. Every materials list that tells him to buy a circular saw is a materials list that does not understand his situation. The system needed to track what the user already has and factor that into every recommendation.

Beyond that, we had a less concrete goal: make the thing fast enough that you actually use it. If generating a project plan takes ten minutes, you will just go back to the browser tabs.

## Choosing the Stack

We are opinionated about tools, so here is why we picked each one.

**Next.js 16 (App Router).** We needed server-side API routes for the AI calls, streaming responses via SSE, and a decent React frontend. Next.js gives us all of that in one framework. The App Router specifically, because server components let us keep Supabase tokens and API keys off the client without building a separate backend. We considered Astro (which we use for our other sites), but the interactive complexity here -- real-time progress bars, chat interfaces, multi-step forms -- made React the right call.

**Claude (Anthropic SDK).** The AI backbone. We chose Claude Sonnet for the main planning and chat, and Claude Haiku for fast classification tasks. The deciding factor was tool use. Claude's tool-calling protocol is clean: you define tools as JSON schemas, the model decides when to call them, and you get structured input back. No regex parsing, no hoping the model formatted its response correctly. For an application where the AI needs to search building codes, look up store prices, and check user inventory -- sometimes all in one turn -- reliable tool use is not optional.

**Supabase.** Auth, database, and row-level security in one package. We needed user accounts, project storage, shopping lists, tool inventory, conversation history, and eventually an expert marketplace with payments. Supabase's PostgreSQL with RLS means every table is locked to its owner at the database level, not just in application code. That matters when you are building something that stores people's home addresses and project details.

**Brave Search API.** This is how the AI gets grounded. When it needs to look up building codes for a specific city, or check current product prices, or find tutorial videos, it searches the actual web through Brave's API. The model's training data has a cutoff. Lumber prices change weekly. Local codes get amended. Live search keeps the recommendations current.

**Stripe.** We wanted a freemium model from day one (5 free reports per month, Pro at $9.99/month), plus the expert marketplace needed Stripe Connect for payouts. Stripe handles both sides cleanly.

**Upstash Redis.** Rate limiting on serverless is tricky. In-memory token buckets reset on every cold start. Upstash gives us distributed rate limiting that persists across function invocations, with a generous free tier. We use it as primary, with an in-memory fallback for local development.

**Zod.** Every API endpoint validates its input with Zod schemas. Every one. Chat messages, search requests, agent run parameters, marketplace submissions. Runtime validation is not glamorous, but it is the difference between a 500 error and a helpful error message.

## The Architecture, Briefly

The application has three layers.

**The chat layer** is a conversational AI assistant with streaming responses, image analysis, and twelve specialized tools. You can ask it anything about home improvement and it will answer, search codes, look up prices, or generate a materials list -- depending on what you need.

**The agent layer** is the project planner. It is a two-phase pipeline that takes a project description, a location, and your preferences, then autonomously researches building codes, designs a step-by-step plan, generates a materials list with pricing, finds tutorial videos, and assembles everything into a shareable report. The whole thing runs in under two minutes.

**The marketplace layer** connects homeowners to verified trade professionals when the AI reaches its limits. It includes a Q&A system with dynamic pricing, expert bidding, reputation scoring, and Stripe-powered payouts.

We will dig into each of these in the rest of this series. The agent pipeline is next -- that is where the most interesting engineering decisions live.

## What Is It Right Now

Thirty-six features, all complete. Chat, guided onboarding, agent-powered project planning, image analysis, project templates, shopping lists, real-time store price search, tool inventory management, video recommendations, report sharing, an expert marketplace with registration, dashboards, subscriptions, Q&A, bidding, reputation scoring, direct messaging, notifications, auth, profiles, settings, usage tracking, and beta feedback. Plus the security and infrastructure underneath: CSP headers, SSRF protection, rate limiting, structured logging, Zod validation on every endpoint.

It is in beta. We use it for our own projects. It works. The deck report it generated last weekend was genuinely better than the estimate a contractor gave us, and it cost four cents in API calls instead of two hundred dollars.

## Coming Up

In **post 2**, we will break down the agent pipeline -- how we collapsed a four-phase system into two phases, why parallel tool execution changed everything, and how structured output via tool use eliminated an entire category of bugs. That is where this project gets interesting.
