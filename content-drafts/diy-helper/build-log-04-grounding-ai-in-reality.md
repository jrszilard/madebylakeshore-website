---
title: "Grounding AI in Reality: Building Codes, Store Prices, and the Tools in Your Garage"
slug: "diy-helper-build-log-04-grounding-ai-in-reality"
series: "Building DIY Helper"
seriesOrder: 4
project: "diy-helper"
publishedAt: "2026-03-13"
---

In [post 1](/blog/diy-helper-build-log-01) we laid the foundation. [Post 2](/blog/diy-helper-build-log-02) covered the agent pipeline. [Post 3](/blog/diy-helper-build-log-03) went deep on the intelligence layer. All of that is useless if the AI hallucinates a building code that doesn't exist.

This post is about the unglamorous work that makes an AI home improvement assistant trustworthy: grounding every answer in real, verifiable data.

## The Hallucination Problem, but With Fire Hazards

Large language models confidently generate wrong answers. In most domains, a wrong answer is inconvenient. In home improvement, a wrong answer about electrical wiring can burn down a house.

When someone asks "What wire gauge do I need for a 30-amp circuit running 75 feet?", the AI can't guess. It needs the actual NEC 310.16 ampacity table, real copper resistance values for voltage drop calculation, and the judgment to say "10 AWG meets ampacity, but at 75 feet your voltage drop hits 3.6% -- consider upsizing to 8 AWG."

So we built a search and data integration layer covering three categories: building codes, product pricing, and tool inventory.

## Three Kinds of Search for Three Kinds of Questions

The agent has access to 12 tools, but the search tools are the ones that keep answers grounded. We split building code lookups into two separate tools with distinct instructions:

**National codes** (`search_building_codes`) queries against NEC, IRC, and IBC standards. **Local codes** (`search_local_codes`) fires parallel searches against municipal sources whenever a user mentions a city or state:

```typescript
async function handleSearchLocalCodes(input) {
  const { query, city, state } = input;
  const [officialResults, permitResults] = await Promise.all([
    webSearch(`${city} ${state} building code ${query} site:gov OR site:municode.com OR site:ecode360.com`),
    webSearch(`${city} ${state} permit requirements ${query}`),
  ]);
  // ...merge and present with disclaimer
}
```

The `site:gov OR site:municode.com` targeting is deliberate -- we want official sources, not SEO-optimized blog posts. The parallel execution means both queries complete in one network round-trip, not two.

All of this runs through the Brave Search API with built-in retry logic: exponential backoff (1s, 2s delays), retries only on 5xx or empty results, immediate failure on 4xx client errors.

## Real Store Prices, Not AI Estimates

When DIY Helper generates a materials list, it doesn't just use the AI's training data for prices. It does live price lookups against Home Depot, Lowe's, Ace Hardware, and Menards.

The price extraction pipeline tries four methods in order of reliability: JSON-LD structured data (Schema.org product markup), store-specific DOM parsers (e.g., Home Depot's `window.__PRELOADED_STATE__`), OpenGraph meta tags, and HTML pattern matching. When page scraping fails -- retailers frequently block automated requests -- we fall back to extracting prices from search result snippets.

To filter noise from related products and bundles, we take only the **first price** from each search result, run IQR outlier filtering, and compute a median-based final price. If the coefficient of variation exceeds 0.8, we discard the data entirely -- high variance means unreliable data.

```typescript
// Tighter sanity check: reject if lookup is >3x or <0.33x the AI estimate
if (aiEstimate > 0 && (bestPrice > aiEstimate * 3 || bestPrice < aiEstimate * 0.33)) {
  continue;
}
```

The AI provides an initial estimate, and the live lookup either confirms or corrects it. Wildly divergent prices get discarded rather than confusing the user.

## Your Garage Knows What You Own

When a user says "I have a cordless drill and safety glasses," the AI detects that and saves those items to their Supabase-backed inventory automatically.

The engineering problem is matching. "Drill driver" on a materials list and "cordless drill" in your inventory are the same thing. We handle this with a three-tier system:

**Tier 1: Alias groups.** Hardcoded groups of equivalent tool names:

```typescript
const ALIAS_GROUPS = [
  ['drill', 'cordless drill', 'power drill', 'drill driver', 'impact driver'],
  ['saw', 'circular saw', 'miter saw', 'table saw', 'reciprocating saw', 'jigsaw'],
  ['voltage tester', 'circuit tester', 'non-contact voltage tester', 'multimeter'],
  // ...13 groups total
];
```

**Tier 2: Fuzzy matching.** A custom matcher combining bigram similarity (Dice coefficient) with token overlap, weighted 40/60. The normalization handles real-world messiness: `1/2` becomes `0.5`, `10-mm` becomes `10mm`, `set of screwdrivers` becomes `screwdriver`, and basic plurals get singularized.

**Tier 3: Substring containment with length weighting.** "Drill" is a substring of "drill press," but they're different tools. The length ratio prevents false positives on short substrings.

The match threshold is 0.75, tuned against a test suite of known pairs. The result: when you ask for a materials list, owned items appear struck through and the shopping list only includes what you need to buy.

## Graceful Degradation: When Everything Goes Wrong

In production, things break. Brave Search has outages. Supabase connections time out. Anthropic returns 529 (overloaded). The design principle is simple: **never let a supporting service failure block the core experience.**

The retry utility is a generic wrapper used across every external call:

```typescript
export async function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
  const maxRetries = options?.maxRetries ?? 2;
  const baseDelayMs = options?.baseDelayMs ?? 1000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxRetries || !shouldRetry(error)) throw error;
      const delay = baseDelayMs * Math.pow(2, attempt); // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

The `shouldRetry` predicate is context-aware. For Anthropic, it retries on 429, 529 (overloaded), and 5xx. For Brave Search, on 5xx and empty results. Never on 4xx client errors. When retries are exhausted, errors get classified and translated -- the user sees "Service temporarily unavailable," not `ECONNREFUSED`.

Inventory prefetch is explicitly non-blocking: it runs in parallel with the agent's planning phase with a 3-second timeout. If it fails, the pipeline continues without inventory data. The user gets a full shopping list instead of one with owned items subtracted.

## Rate Limiting and Input Validation

Every API endpoint is rate-limited using a token bucket algorithm backed by Upstash Redis in production (for distributed state that survives serverless cold starts) with an in-memory fallback for local development. Different endpoints get different budgets -- chat gets 10 requests per minute, agent runs get 5 per hour (they're expensive), store searches get 20 per minute. Authenticated users are tracked by user ID; anonymous users by IP.

There's also a global circuit breaker per endpoint. If the chat endpoint sees 200 requests in 60 seconds across all users, everyone gets throttled. That's the coordinated-attack defense.

Every endpoint also runs Zod schema validation before doing any work -- message length, history depth, image size, media type, store selection. Bad input gets a clear 400, not a cryptic 500 three functions deep.

## What's Next

All of this means the AI can confidently say "this is what the NEC requires," "here's what it costs at Home Depot," and "you already own three of these items." But sometimes the right answer isn't a web search result -- it's a licensed electrician saying "don't touch that panel yourself."

In the final post: the expert escalation system and two-sided marketplace that connects users with verified professionals when the AI reaches the limits of what it should answer.
