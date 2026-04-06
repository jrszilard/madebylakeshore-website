---
title: "Teaching an AI to Find and Apply for Contracts"
slug: "build-log-01-ai-powered-contract-hunting"
series: "Building Contract Finder"
seriesOrder: 1
project: "contract-finder"
publishedAt: "2026-03-22"
excerpt: "We built a system that scans Upwork through a real browser, scores contracts by expected ROI, writes tailored proposals grounded in real case studies, and never fabricates a credential. 25 commits, one day, and the question every freelancer asks: can AI do the part of freelancing that nobody enjoys?"
tags: ["ai", "automation", "freelancing", "claude", "mcp", "build-log"]
metaDescription: "Build log 1: How we built an AI-powered freelance contract finder that scans Upwork via Chrome MCP, scores opportunities by ROI, and generates honest proposals from real case studies."
---

Freelancing has a dirty secret: the actual work is the easy part. The hard part is finding it.

Scanning platforms, reading descriptions, deciding if something is worth the connects, writing a proposal that sounds like you but also sounds like what this specific client wants to hear, checking whether you even have bandwidth -- that's a full-time job on top of the full-time job. We spend 5-10 hours a week on it. Every freelancer does.

So we built a system to automate the whole pipeline. One day, 25 commits, design spec to working prototype.

## The Scanner Sees What You See

Most scraping tools hit an API or parse HTML. Upwork doesn't make that easy -- content is dynamically loaded, behind auth, and aggressively rate-limited. Our scanner doesn't scrape. It browses.

The Chrome MCP scanner implements the Model Context Protocol host pattern. Claude controls a real Chrome browser through MCP tools: navigate to a search URL, read the page, click into each listing, extract data, move to the next one. It's an agent loop where Claude decides what to do next based on what it sees.

The system prompt tells Claude exactly what to extract (title, budget, skills, client hire rate, proposals count, connects cost) and how to format it (JSON wrapped in `<contract>` tags for incremental parsing). If it hits a CAPTCHA, it outputs `<captcha/>` and stops. If a page fails to load, it skips and continues.

The MCP client is injected as a dependency. Tests mock it. Production connects to a real Chrome instance. Same code path either way.

## Matching Is Not Just Keyword Overlap

Contract descriptions use every possible variation of a skill name. "Microsoft Power BI Data Visualization" and "Power BI" are the same skill. "Advanced Excel" and "Excel VBA" are both Excel. "Machine Learning" and "Deep Learning" are both data science.

We built a matching engine with three layers:

**Alias mapping.** A dictionary that normalizes variations to canonical skill names. "Microsoft Power BI Development" maps to "power bi." "Google Sheets" maps to "excel." About 40 aliases covering the variations we actually see on Upwork.

**Substring matching.** If the alias map doesn't catch it, we check whether any profile skill appears as a substring of the contract skill (or vice versa). "Power BI Data Visualization" contains "power bi" -- match.

**Fuzzy matching.** For the remaining edge cases, Dice coefficient similarity with a configurable threshold. Catches typos and creative skill naming that exact matching misses.

The result is a match score from 0 to 1 that feeds into the ROI calculation.

## ROI, Not Just Match Score

A 95% skill match on a contract paying $15/hour is worse than a 70% match paying $100/hour. Match score alone doesn't tell you where to spend your connects.

The ROI scoring engine computes expected value:

```
win_probability = base_rate * skill_bonus * competition_penalty * hire_rate_factor
roi_score = (contract_value * win_probability - connects_cost - time_cost) / time_cost
```

Win probability factors in: how well your skills match, how many other proposals are competing, the client's historical hire rate (a client who hires 80% of the time is worth more than one who hires 20%), and a Bayesian shrinkage toward the platform average for clients with limited history.

Contract value estimates the total engagement value -- for hourly contracts, that's rate times estimated weekly hours times expected duration. For fixed-price, it's the budget midpoint.

Time cost is the estimated hours to write a proposal (we use 0.5 hours as the baseline) times your hourly rate. Connects cost is converted to dollars.

The result is a ratio: expected dollars earned per dollar of effort invested. Contracts get ranked and categorized into green/yellow/red indicators using percentile cutoffs across the current batch.

## Proposals That Don't Lie

This is the part we spent the most time on. AI-generated proposals have a reputation problem: they sound plausible but make things up. "We built a similar dashboard for a Fortune 500 client that increased revenue by 40%" -- when that never happened.

Our proposal generator has hard constraints baked into the system prompt:

> "ONLY reference projects, clients, outcomes, and metrics that appear in the CASE STUDIES section below. Do NOT invent, embellish, or fabricate any experience, project names, client names, or metrics."

> "If a case study says '38% reduction in drop ships' -- use that exact number. Do NOT round up, exaggerate, or add details not present."

> "If no case study is relevant to this contract, say so honestly in the experience section and focus on transferable skills instead."

The case studies are loaded from markdown files in the repo -- real projects with real metrics. Wire Belt's data collaboration platform. Fortune Brands' financial reporting automation. The DIY Helper AI agent pipeline. Each has a slug, and the proposal generator must reference slugs that actually exist. A post-generation validator checks that every `case_study_ids` entry maps to a real file.

The output is five sections (hook, experience, approach, differentiator, CTA), each with an annotation explaining *why* it was written that way. The annotations are for us, not the client -- they show up in the proposal review UI so we can evaluate Claude's reasoning before sending anything.

## The Portfolio Connection

The system pulls profile data from a YAML config (skills, rates, positioning) and case study details from either markdown files or the Sanity CMS that powers our main website. The CMS client caches locally so we're not hitting the API on every proposal generation.

This means the proposals stay current automatically. Add a new case study to Sanity, and the next proposal batch picks it up. Update your hourly rate in the YAML, and bid amounts recalibrate.

## The Review UI

The React frontend has four pages:

**Contract Feed.** Cards sorted by ROI score with color-coded indicators, skill match breakdowns, and a scan button that triggers the Chrome MCP scanner.

**Proposal Review.** Side-by-side view: the contract details on the left, the generated proposal on the right with annotations visible. Edit any section before submitting.

**History.** Every contract seen, every proposal generated, every application sent. Sortable, filterable, searchable.

**Settings.** Profile configuration, availability (hours per week, blackout dates, minimum rates), and platform connections.

## What's Next

The scanner works. The matching works. The proposals are honest. The ROI scoring prioritizes correctly. But it's still a "run it and review" workflow.

Next is closing the loop: auto-submitting proposals above a confidence threshold, tracking win rates by contract type to refine the scoring model, and adding more platform adapters beyond Upwork.
