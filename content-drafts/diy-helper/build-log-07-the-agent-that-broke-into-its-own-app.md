---
title: "The Agent That Broke Into Its Own App"
slug: "build-log-07-the-agent-that-broke-into-its-own-app"
series: "Building DIY Helper"
seriesOrder: 7
project: "diy-helper"
publishedAt: "2026-04-05"
excerpt: "We pointed a security-specialist AI agent at the DIY Helper codebase and it found 19 vulnerabilities across three audit rounds — including a double-charge race condition in the payment flow, XSS in email templates, a dangerous RLS policy, and 32 API routes with no parameter validation. Here's what happened when we let an agent attack its own code."
tags: ["ai", "security", "code-review", "supabase", "stripe", "next-js", "build-log"]
metaDescription: "Build log 7: A Claude-powered security agent audited the DIY Helper codebase and found 19 vulnerabilities including a Stripe double-charge race condition, XSS, and broken access controls. The full story of three audit rounds."
---

The [last post](/builds/build-log-06-letting-ai-test-itself) was about AI agents that pretend to be users. This one is about an AI agent that pretends to be an attacker.

DIY Helper is a marketplace where money changes hands. Homeowners pay for expert Q&A. Experts receive payouts via Stripe Connect. Credit balances go up and down. Users share reports via public URLs. There are 60+ API routes. If any of them are wrong in the right way, someone loses money or leaks data.

We built a `security-veteran-reviewer` agent — a Claude Opus instance with a system prompt modeled on a veteran penetration tester — and pointed it at the entire codebase. Three audit rounds over five weeks. Nineteen vulnerabilities. 73 files changed in a single commit. Here's what it found and why a human reviewer would have missed most of it.

## The Agent

The `security-veteran-reviewer` lives in `.claude/agents/` with a system prompt that gives it three things a generic code reviewer doesn't have:

**Stack-specific context.** It knows the app uses Supabase Auth with JWTs, that `supabaseAdmin` (service role) bypasses RLS and must never be exposed client-side, that Stripe webhooks require signature verification, and that Next.js API routes in the App Router need explicit auth checks.

**A systematic checklist.** It doesn't do a vibes-based review. It works through 15 attack categories: injection (SQL, command, template), XSS (stored, reflected, DOM-based), CSRF, IDOR, broken access control, race conditions, TOCTOU, path traversal, SSRF, mass assignment, and more. Each finding gets a severity rating — CRITICAL, HIGH, MEDIUM, LOW, INFO — with an attack scenario showing how it could be exploited.

**A teaching mandate.** Every finding comes with the underlying principle so the developer learns the pattern, not just the fix. The agent doesn't just say "escape this input." It explains *why* user-controlled values in email templates are dangerous and what class of attack it enables.

## Round 1: The Foundation (February 7)

The first audit happened before the marketplace existed. The app was a chat interface with an AI agent pipeline. Even at that stage, the agent found enough to justify its existence.

**The service role key was doing everything.** All API routes used `supabaseAdmin` — the service role key that bypasses Row Level Security. This meant every route operated with god-mode database access. If any single route had a bug that let a user control a query parameter, RLS wouldn't save you. The fix: replace service role with JWT-based auth. Extract `userId` server-side from the Authorization header. Only use `supabaseAdmin` for the narrow operations that actually need it.

**CORS was a wildcard.** Literally — `Access-Control-Allow-Origin: *`. Any domain could make authenticated requests to the API. Replaced with an allowlist: `localhost:3000` for dev, `*.vercel.app` for preview deployments, and the production domain.

**No rate limiting anywhere.** An attacker could hammer the chat endpoint — which proxies to Claude — and run up the Anthropic bill. We added token-bucket rate limiting on every API route with different limits per endpoint: tighter on expensive operations (chat, extract-materials), looser on reads.

**No input validation.** Request bodies went straight from the client to the handler. The chat endpoint accepted whatever JSON you sent. We added Zod schemas for every endpoint that accepts input.

That first round also produced the CI pipeline (GitHub Actions: lint, typecheck, build), the initial Supabase migration with RLS policies, and the `.env.example` documentation. One agent review bootstrapped the entire security posture of the project.

## Round 2: Ten Medium Findings (February 22)

Two weeks later, the app had grown. The agent pipeline was more complex, reports could be shared via public URLs, and the expert side was taking shape. Round 2 found subtler issues.

**Unbounded Zod schemas.** `z.any()` was used for content blocks and metadata fields. An attacker could send arbitrarily large payloads — megabytes of nested objects — that would be accepted by validation and stored in the database. The fix: bounded arrays with maximum element counts, scalar-only metadata types.

**Eight unprotected routes.** New endpoints had been added without rate limiting. The agent caught them by globbing `app/api/**/*.ts` and cross-referencing with the rate limiter configuration. Six endpoint files, eight handlers, all missing.

**Stale share tokens.** When a user disabled and re-enabled report sharing, the same token was reused. If someone had bookmarked the share URL, disabling sharing didn't actually revoke access — re-enabling restored the old URL. Fix: rotate the token on re-enable, so the old URL is permanently dead.

**OAuth redirect validation was missing.** The Stripe onboarding flow accepted a `redirect_url` parameter. An attacker could substitute a phishing domain. Fix: validate against an allowlist plus a Vercel domain regex for preview deployments.

**LIKE wildcard injection.** The inventory search used `ilike` queries with user input that wasn't escaped. Sending `%` as a search term returned every row. Sending `_` matched single characters. Not a data breach, but a data exfiltration vector — an attacker could enumerate inventory by probing with wildcards. Fix: escape `%` and `_` in all `ilike` inputs.

**Guest storage was unbounded.** The guest (non-authenticated) storage in localStorage had no limits. A script could fill it with thousands of fake projects, causing the app to slow down or crash. Fix: project and material count limits, shape validation, and `QuotaExceededError` handling.

## Round 3: The Big One (March 7)

The marketplace was live — Q&A, bidding, credit purchases, expert payouts. This is where the stakes went up. The agent found 9 vulnerabilities, some of which could have cost real money.

### The Double-Charge Race Condition

This was the CRITICAL finding. The Q&A claim flow worked like this: expert clicks "Claim" → charge the homeowner's credits → assign the question to the expert. Two database operations, no transaction boundary.

If two experts clicked "Claim" at nearly the same time, both charges could succeed before either assignment was checked. The homeowner gets charged twice. One expert gets the question, the other gets nothing. The credits are gone.

The fix restructured the flow to claim-before-charge: first atomically assign the question to the expert (using a Supabase RPC that checks assignment status in the same query), then charge credits only if the assignment succeeded. If the assignment fails because someone else claimed it first, no charge happens.

### Non-Atomic Credit Operations

Related to the race condition but broader: credit balance updates used two queries — read the current balance, then write the new balance. Classic TOCTOU bug. Between the read and the write, another request could modify the balance.

The fix replaced this with PostgreSQL functions that do the read-modify-write in a single atomic operation. Two new migrations: `atomic_credit_operations.sql` adds the functions, `strengthen_rls_policies.sql` tightens the policies around them.

### XSS in Email Templates

Email templates interpolated user-controlled values — names, question titles — without escaping. An expert could set their display name to `<script>alert('xss')</script>` and every email that included their name would carry the payload. Not all email clients execute JavaScript, but some preview rendering engines do, and HTML injection is exploitable even without scripts (think phishing with injected links).

Fix: escape all user-controlled values before interpolation.

### 32 Routes With No Parameter Validation

Next.js dynamic routes like `app/api/qa/[id]/claim/route.ts` receive the `id` parameter from the URL path. None of them validated that `id` was a valid UUID before passing it to Supabase queries. A malformed ID wouldn't cause SQL injection (Supabase parameterizes queries), but it could cause confusing errors, leak internal error messages, or hit unexpected code paths.

The agent globbed all parameterized routes, identified 32 of them, and the fix added UUID validation to every one.

### A Dangerous RLS Policy

The `user_credits` table had an UPDATE policy that let users modify their own rows. This sounds correct — users should be able to update their own data. But credit balances are in that table. Combined with the non-atomic update pattern, a sophisticated attacker could potentially manipulate their own credit balance by timing concurrent requests.

The fix dropped the user-facing UPDATE policy entirely. Credit modifications now go through the atomic PostgreSQL functions, which use the service role internally.

### Other Findings

- **Missing security headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options weren't set. Added via Next.js middleware.
- **Bids endpoint leaked data** — the GET endpoint for Q&A bids didn't verify the requester was a participant in the question. Any authenticated user could read bid details for any question.
- **Open redirect in Stripe flow** — the subscription checkout redirect URL wasn't validated against the production domain.

## The Pattern

Three rounds. Nineteen findings. The severity distribution:

| Round | Date | Critical | High | Medium | Low | Files Changed |
|-------|------|----------|------|--------|-----|---------------|
| 1     | Feb 7 | 0 | 3 | 2 | 2 | 16 |
| 2     | Feb 22 | 0 | 1 | 8 | 1 | 16 |
| 3     | Mar 7 | 1 | 3 | 4 | 1 | 73 |

Each round found issues that the previous round's fixes made possible. Round 1 added auth and rate limiting. Round 2 found gaps in the auth and rate limiting. Round 3 found business logic vulnerabilities that only existed because the marketplace features built between rounds 1 and 2 introduced payment flows.

This is why security review isn't a one-time event. The attack surface grows with every feature.

## Why an Agent, Not a Consultant

A human security auditor would have found the race condition and the RLS policy. Those are the kind of findings that justify a pentest engagement. But they wouldn't have methodically checked all 32 parameterized routes for UUID validation, or cross-referenced every new API handler against the rate limiter config, or noticed that `z.any()` in a validation schema is effectively no validation at all.

The agent's advantage is thoroughness without fatigue. It globs every file in `app/api/`, reads every one, and checks the same list of attack vectors against each. A human gets bored on route 15 of 60. The agent doesn't.

The agent also costs dramatically less. A professional pentest for a Next.js/Supabase application with 60+ endpoints runs $5,000-15,000. We ran three rounds of agent review for under $20 total. The agent won't catch everything a skilled human would — it doesn't probe running systems or test actual network behavior — but it catches the code-level vulnerabilities that represent 80% of real-world exploits.

## The Other Agents

The security reviewer wasn't working alone. The DIY Helper project has 9 Claude Code agents total:

| Agent | Job |
|-------|-----|
| security-veteran-reviewer | Security audits |
| fullstack-veteran-architect | Implementation review |
| veteran-database-architect | Schema and query review |
| silicon-valley-app-architect | Product direction and UX philosophy |
| diy-contractor-architect | Domain expertise (building codes, materials) |
| diy-user-tester | Simulated DIYer testing (3 personas) |
| expert-user-tester | Simulated tradesperson testing (5 trades) |
| user-experience-tester | UX friction evaluation |
| feature-tracker | Documentation maintenance |

The `silicon-valley-app-architect` reviews design specs before implementation — it evaluated the unified landing page design (`99a0c68`) and the marketplace integration spec (`55c2df6`), producing findings that were fixed before code was written. The `fullstack-veteran-architect` reviewed the design system PR (`9088ba4`), catching implementation issues before merge.

Spec review before implementation, code review during implementation, security audit after implementation, user testing after deployment. Four layers. The security agent is the one that found the most consequential bugs, but it's the full pipeline that keeps the codebase sound.

## What We Learned

**Run security reviews early and repeat them.** Round 1 on a 10-route app found 7 issues. If we'd waited until the app had 60 routes and a payment system, the remediation would have been far more expensive.

**The agent needs stack context.** A generic "review this code for security issues" prompt would miss the Supabase-specific findings (RLS policy, service role key exposure). The system prompt's stack-specific context — knowing that `supabaseAdmin` bypasses RLS, knowing the JWT auth pattern — is what makes the findings actionable instead of generic.

**Business logic bugs are the hardest.** The double-charge race condition isn't in any OWASP checklist. It's specific to this app's payment flow. The agent found it because it reads the full claim handler and reasons about what happens when two requests arrive simultaneously. That's the kind of analysis that requires understanding the domain, not just pattern-matching against known vulnerabilities.

**Cheap enough to run often.** At under $10 per full-codebase audit, there's no reason not to run it after every significant feature addition. The cost of a missed vulnerability in a payment system is orders of magnitude higher.
