---
title: "Letting AI Test Itself"
slug: "build-log-06-letting-ai-test-itself"
series: "Building DIY Helper"
seriesOrder: 6
project: "diy-helper"
publishedAt: "2026-04-05"
weekCovered: "2026-03-22 to 2026-04-05"
commitsAnalyzed: [79978e2, 9088ba4, 1f289a7, df0f394, f5da077, 2f7adb8, af49f38, 55c2df6, 57f9637, 27a6de1, a4331de, c3335da, b1b0260, a82bc40, f640750, 1c31b4e, be00811, fdb4a80, f326559, 8262e60, 4349bb5, 95f2b87, 67de144, dee170a, d97801f, 64a1b1c, 252609a, b5e9857, 7b7c804, 66d5450, ae68867, 0175bbd, 82e0111, 6586280, 47b865c, ee645d5, 5c4255f, 9f57bb5, 99a0c68, af067e1, 9e08a38, 79758b2, 16c230b, b4450fc, e6625aa, e2f89b9, 9393e3a, 25df86f, b2b5b3e, d5d6308, 2133bd9, fba7d86, 1378b7a, 1f55112, 0e3bbe0, 801a445, 65ca789, 3b5133b, 82599c6, 46c89a9, a85aef2, 6b17ae5, 8311de0, a81931d, 933e10f, 07048bb, 721dfb4, 7ab2c90, 1401413, e38450f, 1ae2418, 84b81a8, 0ac1a7f, 8d40638, 831a82f, 8709292, db22c32, 834d2ab, a16db73, 4eb7d83, 198d575, bb10cbc, 4e56ed4, 5d4ab26, 119110e, 27817d6, b3a1bf3, 9f4d7db, ac5563e, 9c51094, 5105491, a8c891e, 49aeb11, 5c70c12, 0634952, 292b736, a5df0c2, 2309f6f, 499a605, b329094]
excerpt: "We built AI agents that pretend to be users — a beginner DIYer, an experienced renovator, three types of trade professionals — and turned them loose on the app. They found 14 UX bugs that real testing missed. Then we overhauled the landing page, added shopping trips, and gave experts credentials and photo uploads."
tags: ["ai", "testing", "ux", "marketplace", "design-system", "build-log"]
metaDescription: "Build log 6: AI user testing agents found 14 UX issues human testers missed. Plus: unified landing page, shopping trips, expert profile enhancements, and a design system migration."
---

We thought the [DIY Helper series was done](/builds/build-log-05-when-ai-should-step-aside) at post 5. The marketplace was built, the escalation system worked, the fraud detection was in place. Ship it and move on.

Then we started actually using it, and the list of paper cuts grew fast. Two weeks, 100 commits, and the project looks fundamentally different.

## AI Agents as User Testers

This was the experiment that changed the trajectory. Instead of manually clicking through flows, we built Claude-powered testing agents that impersonate specific user personas and systematically exercise the app.

Eight test accounts seeded via a script: three DIYers (beginner, intermediate, expert homeowner) and five trade professionals (electrician, plumber, carpenter, HVAC tech, general contractor). Each agent has a system prompt that defines their knowledge level, typical questions, and what they'd find confusing.

The beginner DIYer agent starts a conversation about replacing a light fixture, navigates the escalation flow, tries the expert Q&A, and reports every point of friction. The electrician agent signs up as an expert, fills out the profile, browses the Q&A queue, and answers questions — noting everywhere the expert experience is unclear.

The agent reports are structured: each finding has a severity (critical/major/minor), a reproduction path, and a suggested fix. We ran a full sweep and got back consolidated evaluations.

## 14 Bugs That Humans Missed

The DIYer sweep found issues that real testing glossed over:

- Chat localStorage wasn't scoped by user ID. Log in as one user, log out, log in as another — you see the first user's conversation history. Cross-account data leak.
- The landing page chat leaked raw JSON into the conversation. Materials lists and structured data from the AI agent pipeline showed up as unformatted JSON blobs instead of rendered content.
- The "For Pros" expert directory had no discoverable entry point. The link existed but wasn't in the main navigation.
- Q&A pricing display showed "Pool" and "Standard" tags that meant nothing to experts. Replaced with payout badges showing the actual dollar amount they'd earn.
- The Q&A threaded view showed the question card twice — once at the top and once in the thread. Duplicate content, confusing navigation.
- The dashboard "Recent Questions" widget was reading from a cached field that was always empty instead of fetching from the Q&A queue.

Fourteen issues total, resolved in a single commit (`198d575` — 749 insertions across 17 files). Some were embarrassing. The localStorage scoping bug is a security issue that should have been caught in the first code review. But that's the value of testing with agents that actually exercise flows end-to-end instead of spot-checking individual pages.

## The Unified Landing Page

The old architecture had a landing page, a separate `/chat` page with the AI assistant, and a guided bot wizard that walked users through project setup. Three entry points for what should be one experience.

We killed the guided bot (1,542 lines deleted in one commit, no mourning) and merged everything into a unified landing page. The hero section morphs: start as a marketing hero with value props, then transition into the chat interface when you engage. The chat *is* the landing page, not a separate destination.

The hero has three tabs — Quick Answer, Plan a Project, and Ask an Expert — that set the conversation's intent before the first message. Intent classification (`a4331de`) uses Haiku to classify the user's first message into one of six intent types, and the system prompt adapts accordingly. A "quick answer" conversation is casual and direct. A "planning" conversation is structured and thorough.

## Shopping Trips

Materials lists were already a feature — the AI generates a list of what you need for a project, with quantities and price estimates. But the list just sat there. No workflow for actually going to the store.

Shopping trips group materials by store (Home Depot, Lowes, local hardware) and create a checklist you can use in the aisle. Each item has a checkbox, the estimated price, and notes from the AI ("get exterior grade if it'll be exposed to weather"). The trip view shows total estimated cost and lets you mark items as purchased with the actual price, so you can track budget drift.

The drawer slides in from the app header. Shopping trips persist per-project via Supabase, with an API layer (`useShoppingTrips` hook) that handles CRUD operations, per-item status updates, and store assignment.

## Expert Profile Enhancements

The expert side of the marketplace got attention from the testing agents too. The carpenter and electrician agents both flagged that the profile was bare — name and trade, nothing else.

We added credential fields (license number, certifications, years of experience, insurance status), a photo upload endpoint that stores images in a Supabase `expert-photos` storage bucket, and a markdown-supported answer form with a 5,000-character limit and live preview. The answer form also supports photo uploads now — an electrician can annotate a panel photo instead of describing it in text.

Expert-specific settings now show up only when the logged-in user is an expert, replacing the generic settings page with trade-specific configuration.

## The Interesting Part: Design System as Foundation

Buried under all the feature work was a design system migration (`79978e2` through `f5da077`) that rebuilt the component library from scratch. CSS tokens, dark theme support, component primitives (buttons, inputs, cards, modals, badges), and a reference page.

This is the least exciting work to write about and the most important work we did. Before the DS migration, every new component reinvented colors, spacing, and hover states. After it, Wilma's design updates and Justin's feature additions use the same vocabulary. The dark theme for the expert dashboard came together in hours instead of days because every component already understood what "dark mode" meant.

The FileUpload component (`8262e60`) is representative: drop zone, thumbnail previews, progress bars, validation, all built on DS tokens. It gets reused in the Q&A submit form, the expert answer form, and the profile photo uploader — three features that share one component.

## What's Next

The user testing agents are still running periodic sweeps. The expert profile enhancements surfaced a bigger question: should the Expert Co-Pilot (a side panel we built with code lookup, draft assistance, and licensing tools) be a core feature or a gimmick? Early data from the testing agents suggests experts want it — but we need real experts, not simulated ones, to validate that.
