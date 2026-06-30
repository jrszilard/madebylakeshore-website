# fattamano Visitor Counter — Design

**Date:** 2026-06-29
**App:** `apps/fattamano`
**Branch context:** currently `feat/daos-shop-checkout`; this work will get its own branch.

## Problem

The homepage "visitor no." card is hardcoded to `000042` ("please act normal"). It's a
deliberate 90s hit-counter gag, but it's fake. We want it to actually count traffic, told as
three numbers in the site's anti-analytics voice:

- **total** homepage loads,
- **probably human** (unique humans),
- **probably bots** (the rest).

## Goals

- Real, persistent counts that survive deploys.
- Honestly count non-JS bots/crawlers — the bot joke must be true, not estimated.
- No new infrastructure to provision; reuse what's already wired up.
- The counter can never break or slow the homepage into failure.

## Non-Goals

- Site-wide analytics. `total` = homepage loads only, which matches the card's framing.
- A dashboard, time-series, or per-page breakdown.
- High-throughput counter infrastructure (Redis/KV) — noted as a future upgrade, not built now.
- Bot *blocking* — we count bots, we don't stop them.

## Key Decision: server-side counting → SSR homepage

Real crawlers fetch HTML but almost never run client-side JavaScript, so a browser-side counter
would structurally miss the very bots the joke is about. The increment must happen on the raw
HTML request, server-side.

The homepage is currently **prerendered** (Astro `output: 'hybrid'`, no `prerender = false`), so
Vercel serves it from the CDN and runs no per-request code. We therefore convert the homepage to
an on-demand route with `export const prerender = false`. Its existing build-time Sanity fetch for
featured products simply moves to request-time.

## Architecture

### Data model

One machine-managed singleton document in the shared `production` dataset:

```jsonc
{
  "_id":   "fattamano.visitorStats",      // fixed singleton id, namespaced to this app
  "_type": "fattamanoVisitorStats",
  "total":  0,   // every homepage load
  "humans": 0,   // unique humans: UA not-bot AND no prior ft_visitor cookie
  "bots":   0    // hits whose User-Agent classifies as a bot
}
```

- **Start honest from zero.** No seeding; all counters begin at 0 and only ever reflect real
  traffic. The bot number grows as crawlers arrive.
- No Sanity Studio schema is added for this type — it's backend-only and must not be hand-edited.
  Sanity permits documents of unregistered types; the `fattamano.` id prefix keeps it clear of the
  other apps that share the dataset.
- The three counters are tracked independently and will **not** strictly sum: a returning human
  bumps `total` but neither sub-bucket. This is intentional and matches the loose mental model
  (`5,000 total / 50 human / 4,550 bots`).

### Atomic increment

Sanity's `.inc()` patch is applied atomically on the server, so concurrent visits cannot clobber
each other — no read-modify-write race. The one edge case: `patch()` on a not-yet-existing
document throws, so the first-ever visit must `createIfNotExists` first.

Steady-state path (one network write per hit):

```
try {
  doc = await writeClient
    .patch(DOC_ID)
    .inc(increments)                      // { total: 1, bots: 1 }  OR  { total: 1, humans: 1 }  OR { total: 1 }
    .commit({ returnDocuments: true });   // returns fresh totals to render
} catch (missingDoc) {
  await writeClient.createIfNotExists({ _id: DOC_ID, _type: TYPE, total: 0, humans: 0, bots: 0 });
  doc = await writeClient.patch(DOC_ID).inc(increments).commit({ returnDocuments: true });
}
```

Uses the existing `sanityWriteClient()` (`SANITY_WRITE_TOKEN`) from
`src/lib/server/sanityWrite.ts` — no new credentials.

### Module: `src/lib/server/visitorStats.ts`

Small, testable surface:

```ts
export type VisitorKind = 'bot' | 'human';
export interface VisitorStats { total: number; humans: number; bots: number; }

// Pure, unit-testable.
export function classifyVisitor(userAgent: string | null): VisitorKind;

// Performs the atomic increment; returns fresh totals and whether to set the human cookie.
export async function recordVisit(opts: {
  userAgent: string | null;
  hasVisitorCookie: boolean;
}): Promise<{ stats: VisitorStats; setHumanCookie: boolean }>;
```

Increment rules:

| kind  | cookie present | increments              | setHumanCookie |
|-------|----------------|-------------------------|----------------|
| bot   | n/a            | `{ total, bots }`       | false          |
| human | no             | `{ total, humans }`     | true           |
| human | yes            | `{ total }`             | false          |

### Bot detection

Use the **`isbot`** npm package (tiny, maintained for exactly this) inside `classifyVisitor`. An
empty/missing UA is treated as a bot. `classifyVisitor` stays pure so the bot/human table is unit
tested. (Fallback option if we want zero dependencies: an inline UA regex — not chosen.)

### Cookie

First-party `ft_visitor` cookie, set only for new humans:
`Path=/`, `HttpOnly`, `SameSite=Lax`, `Secure`, `Max-Age` = 1 year, value `"1"`.
No PII, no third-party — uniqueness dedup only. (It makes "please act normal" literally true.)

### Page integration (`src/pages/index.astro`)

1. `export const prerender = false;`
2. Read `Astro.request.headers.get('user-agent')` and `Astro.cookies.has('ft_visitor')`.
3. `const { stats, setHumanCookie } = await recordVisit({ ... })` inside a `try/catch`.
4. If `setHumanCookie`, `Astro.cookies.set('ft_visitor', '1', { ...options })`.
5. Set `Astro.response.headers.set('Cache-Control', 'no-store')` so the CDN never freezes the
   number or skips the counting function.
6. On any error, render a graceful fallback (em-dashes) — the homepage must never 500 over a
   counter.

### Display

The dark "visitor no." stat card shows three values, keeping the retro odometer feel for the
headline total:

```
VISITOR NO.
004550                          ← total, zero-padded to 6 digits
probably human ……… 50
probably bots ………… 4,500
please act normal
```

- `total`: zero-padded to 6 digits (odometer).
- `humans` / `bots`: comma-grouped (`toLocaleString('en-US')`).
- Labels and "please act normal" footer keep the existing `font-mono`, uppercase, tracked styling.

## Error handling & resilience

- All Sanity interaction is wrapped; failure renders the fallback, never an error page.
- `recordVisit` may throw; `index.astro` is the single catch site.
- Counter inaccuracy (e.g. a dropped write) is acceptable — this is a gag, not billing.

## Security & privacy

- Single first-party cookie, no PII, no third-party trackers — consistent with the site's
  anti-surveillance ethos.
- Write token stays server-side (already the case via `sanityWriteClient`).
- No CSP change needed: counting is server-side; no new client `connect-src` origins.

## Known limitations / future

- Every homepage hit (including each bot hit) is now a serverless invocation + one Sanity write.
  Fine at boutique-art-site traffic. Sanity is not a high-throughput counter; if traffic ever
  spikes, migrate the three counters to Vercel KV / Upstash behind the same `recordVisit` API.
- `no-store` removes the homepage's static-CDN speed — the inherent cost of a live counter.

## Testing (TDD)

Vitest (`npm test` → `vitest run`). New file `apps/fattamano/test/visitor/visitorStats.test.ts`,
matching the existing domain-grouped layout (`test/cart/`, `test/commerce/`):

- `classifyVisitor`: table of real bot UAs (Googlebot, GPTBot, ClaudeBot, bingbot,
  facebookexternalhit, curl/python-requests, empty) vs. real browser UAs.
- Increment-builder logic: each `(kind, hasCookie)` row above → correct `inc` object and
  `setHumanCookie` flag, with the Sanity write client mocked.

## Files changed

- **new** `apps/fattamano/src/lib/server/visitorStats.ts`
- **edit** `apps/fattamano/src/pages/index.astro` (SSR + counter wiring + display)
- **new** `apps/fattamano/test/visitor/visitorStats.test.ts`
- **edit** `apps/fattamano/package.json` (add `isbot`)
