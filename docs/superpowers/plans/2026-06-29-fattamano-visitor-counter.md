# Fattamano Visitor Counter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `000042` homepage "visitor no." with three real, persistent counts — total loads, probably-human (unique), and probably-bots.

**Architecture:** The homepage becomes an SSR route so non-JS crawlers are counted on the raw HTML request. A small `visitorStats.ts` module classifies the visitor (`isbot`), decides what to increment, reads current counts to render (fast, parallel with the products fetch), and fires the atomic Sanity `.inc()` write off the critical path via Vercel `waitUntil`. Display is optimistic (`read + this visit`).

**Tech Stack:** Astro 4 (hybrid → SSR route), `@astrojs/vercel/serverless`, Sanity (`@sanity/client` via existing read/write helpers), `isbot`, `@vercel/functions`, Vitest.

## Global Constraints

- All work is in `apps/fattamano`. Run every command **from the repo root** (`/home/justin/lakeshore-studio/madebylakeshore-website`) using the `-w apps/fattamano` workspace flag.
- Sanity doc: `_id = "fattamano.visitorStats"`, `_type = "fattamanoVisitorStats"`. **Do not** add a Studio schema for it (backend-managed only).
- Counters start at **zero** — no seeding.
- Cookie: name `ft_visitor`, value `"1"`, `Path=/`, `HttpOnly`, `SameSite=Lax`, `Secure`, `Max-Age = 60*60*24*365`. Set only for a new human.
- Bot detection via `isbot`; an empty or missing User-Agent counts as a bot.
- The write is fired via `@vercel/functions` `waitUntil` and **never awaited on the critical path**; it degrades to detached execution if no Vercel context exists.
- Homepage response sets `Cache-Control: no-store`.
- Display: `total` zero-padded to 6 digits; `humans`/`bots` comma-grouped (`toLocaleString('en-US')`); all three render em-dashes when the read fails.
- No emojis anywhere (project rule).
- Read client: `sanityClient.fetch` from `apps/fattamano/src/lib/sanity.ts`. Write client: `sanityWriteClient()` from `apps/fattamano/src/lib/server/sanityWrite.ts`.

---

## File Structure

- **Create** `apps/fattamano/src/lib/server/visitorStats.ts` — all counter logic: `classifyVisitor`, `planVisit`, `applyOptimistic`, `readStats`, `incrementStats`, `deferWrite`, plus shared constants/types. One responsibility: turn a request into a render-ready stat object and a deferred write.
- **Create** `apps/fattamano/test/visitor/visitorStats.test.ts` — unit tests for the pure functions and the (injected-client) write.
- **Modify** `apps/fattamano/src/pages/index.astro` — make SSR, wire the module, render three numbers.
- **Modify** `apps/fattamano/package.json` — add `isbot` and `@vercel/functions` (via `npm install`).

The module is built up incrementally across Tasks 1–4 (each task appends its export), so by the end of Task 4 the file matches the full reference at the bottom of this plan. Task 5 consumes it.

---

### Task 1: `classifyVisitor` + `isbot`

**Files:**
- Modify: `apps/fattamano/package.json` (add `isbot`)
- Create: `apps/fattamano/src/lib/server/visitorStats.ts`
- Test: `apps/fattamano/test/visitor/visitorStats.test.ts`

**Interfaces:**
- Produces: `type VisitorKind = 'bot' | 'human'`; `interface VisitorStats { total: number; humans: number; bots: number }`; `function classifyVisitor(userAgent: string | null): VisitorKind`; constants `VISITOR_COOKIE`, `STATS_DOC_ID`, `STATS_DOC_TYPE`.

- [ ] **Step 1: Install `isbot`**

Run: `npm install isbot -w apps/fattamano`
Expected: `isbot` appears under `dependencies` in `apps/fattamano/package.json`; lockfile updates.

- [ ] **Step 2: Write the failing test**

Create `apps/fattamano/test/visitor/visitorStats.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { classifyVisitor } from '../../src/lib/server/visitorStats';

const HUMAN_UAS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
];

const BOT_UAS = [
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.0; +https://openai.com/gptbot',
  'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
];

describe('classifyVisitor', () => {
  it('classifies real browser UAs as human', () => {
    for (const ua of HUMAN_UAS) expect(classifyVisitor(ua)).toBe('human');
  });
  it('classifies known bot UAs as bot', () => {
    for (const ua of BOT_UAS) expect(classifyVisitor(ua)).toBe('bot');
  });
  it('treats empty or missing UA as bot', () => {
    expect(classifyVisitor('')).toBe('bot');
    expect(classifyVisitor(null)).toBe('bot');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -w apps/fattamano -- visitorStats`
Expected: FAIL — cannot resolve `../../src/lib/server/visitorStats` (module/export does not exist).

- [ ] **Step 4: Write minimal implementation**

Create `apps/fattamano/src/lib/server/visitorStats.ts`:

```ts
import { isbot } from 'isbot';

export type VisitorKind = 'bot' | 'human';
export interface VisitorStats {
  total: number;
  humans: number;
  bots: number;
}

export const VISITOR_COOKIE = 'ft_visitor';
export const STATS_DOC_ID = 'fattamano.visitorStats';
export const STATS_DOC_TYPE = 'fattamanoVisitorStats';

export function classifyVisitor(userAgent: string | null): VisitorKind {
  if (!userAgent) return 'bot';
  return isbot(userAgent) ? 'bot' : 'human';
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -w apps/fattamano -- visitorStats`
Expected: PASS (3 tests in `classifyVisitor`).

- [ ] **Step 6: Commit**

```bash
git add apps/fattamano/package.json apps/fattamano/package-lock.json package-lock.json apps/fattamano/src/lib/server/visitorStats.ts apps/fattamano/test/visitor/visitorStats.test.ts
git commit -m "feat(fattamano): classify homepage visitors as bot or human"
```
(If a root `package-lock.json` was not modified, omit it from the `git add`.)

---

### Task 2: `planVisit` + `applyOptimistic` (pure logic)

**Files:**
- Modify: `apps/fattamano/src/lib/server/visitorStats.ts`
- Test: `apps/fattamano/test/visitor/visitorStats.test.ts`

**Interfaces:**
- Consumes: `VisitorKind`, `VisitorStats` (Task 1).
- Produces: `interface VisitPlan { increments: Partial<VisitorStats>; setHumanCookie: boolean }`; `function planVisit(kind: VisitorKind, hasVisitorCookie: boolean): VisitPlan`; `function applyOptimistic(stats: VisitorStats, increments: Partial<VisitorStats>): VisitorStats`.

- [ ] **Step 1: Write the failing tests**

Append to `apps/fattamano/test/visitor/visitorStats.test.ts`:

```ts
import { planVisit, applyOptimistic } from '../../src/lib/server/visitorStats';

describe('planVisit', () => {
  it('counts a bot as total + bots, no cookie', () => {
    expect(planVisit('bot', false)).toEqual({ increments: { total: 1, bots: 1 }, setHumanCookie: false });
  });
  it('counts a new human as total + humans and sets the cookie', () => {
    expect(planVisit('human', false)).toEqual({ increments: { total: 1, humans: 1 }, setHumanCookie: true });
  });
  it('counts a returning human as total only, no cookie', () => {
    expect(planVisit('human', true)).toEqual({ increments: { total: 1 }, setHumanCookie: false });
  });
});

describe('applyOptimistic', () => {
  it('adds increments field by field', () => {
    expect(applyOptimistic({ total: 10, humans: 4, bots: 6 }, { total: 1, bots: 1 }))
      .toEqual({ total: 11, humans: 4, bots: 7 });
  });
  it('treats missing increment fields as zero', () => {
    expect(applyOptimistic({ total: 10, humans: 4, bots: 6 }, { total: 1 }))
      .toEqual({ total: 11, humans: 4, bots: 6 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -w apps/fattamano -- visitorStats`
Expected: FAIL — `planVisit`/`applyOptimistic` are not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `apps/fattamano/src/lib/server/visitorStats.ts`:

```ts
export interface VisitPlan {
  increments: Partial<VisitorStats>;
  setHumanCookie: boolean;
}

export function planVisit(kind: VisitorKind, hasVisitorCookie: boolean): VisitPlan {
  if (kind === 'bot') {
    return { increments: { total: 1, bots: 1 }, setHumanCookie: false };
  }
  if (!hasVisitorCookie) {
    return { increments: { total: 1, humans: 1 }, setHumanCookie: true };
  }
  return { increments: { total: 1 }, setHumanCookie: false };
}

export function applyOptimistic(stats: VisitorStats, increments: Partial<VisitorStats>): VisitorStats {
  return {
    total: stats.total + (increments.total ?? 0),
    humans: stats.humans + (increments.humans ?? 0),
    bots: stats.bots + (increments.bots ?? 0),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -w apps/fattamano -- visitorStats`
Expected: PASS (Task 1 + Task 2 suites green).

- [ ] **Step 5: Commit**

```bash
git add apps/fattamano/src/lib/server/visitorStats.ts apps/fattamano/test/visitor/visitorStats.test.ts
git commit -m "feat(fattamano): plan visit increments and optimistic display"
```

---

### Task 3: `readStats` (render-time read)

**Files:**
- Modify: `apps/fattamano/src/lib/server/visitorStats.ts`
- Test: `apps/fattamano/test/visitor/visitorStats.test.ts`

**Interfaces:**
- Consumes: `VisitorStats`, `STATS_DOC_ID` (Task 1).
- Produces: `type Fetcher = <T = any>(query: string, params?: Record<string, any>) => Promise<T>`; `async function readStats(fetcher?: Fetcher): Promise<VisitorStats | null>` — returns zeros for a missing doc, `null` on read error.

- [ ] **Step 1: Write the failing tests**

Append to `apps/fattamano/test/visitor/visitorStats.test.ts`:

```ts
import { readStats } from '../../src/lib/server/visitorStats';

describe('readStats', () => {
  it('maps a found doc to stats', async () => {
    const fetcher = (async () => ({ total: 500, humans: 12, bots: 488 })) as any;
    expect(await readStats(fetcher)).toEqual({ total: 500, humans: 12, bots: 488 });
  });
  it('returns zeros when the doc does not exist yet', async () => {
    const fetcher = (async () => null) as any;
    expect(await readStats(fetcher)).toEqual({ total: 0, humans: 0, bots: 0 });
  });
  it('returns null when the read throws', async () => {
    const fetcher = (async () => { throw new Error('sanity down'); }) as any;
    expect(await readStats(fetcher)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -w apps/fattamano -- visitorStats`
Expected: FAIL — `readStats` is not exported.

- [ ] **Step 3: Write minimal implementation**

Add the import at the **top** of `apps/fattamano/src/lib/server/visitorStats.ts` (below the `isbot` import):

```ts
import { sanityClient } from '../sanity';
```

Append to the module:

```ts
const STATS_QUERY = `*[_id == $id][0]{ total, humans, bots }`;

type Fetcher = <T = any>(query: string, params?: Record<string, any>) => Promise<T>;

export async function readStats(fetcher: Fetcher = sanityClient.fetch): Promise<VisitorStats | null> {
  try {
    const doc = await fetcher<Partial<VisitorStats> | null>(STATS_QUERY, { id: STATS_DOC_ID });
    return {
      total: doc?.total ?? 0,
      humans: doc?.humans ?? 0,
      bots: doc?.bots ?? 0,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -w apps/fattamano -- visitorStats`
Expected: PASS (all suites green).

- [ ] **Step 5: Commit**

```bash
git add apps/fattamano/src/lib/server/visitorStats.ts apps/fattamano/test/visitor/visitorStats.test.ts
git commit -m "feat(fattamano): read visitor stats for render"
```

---

### Task 4: `incrementStats` + `deferWrite` (deferred atomic write)

**Files:**
- Modify: `apps/fattamano/package.json` (add `@vercel/functions`)
- Modify: `apps/fattamano/src/lib/server/visitorStats.ts`
- Test: `apps/fattamano/test/visitor/visitorStats.test.ts`

**Interfaces:**
- Consumes: `VisitorStats`, `STATS_DOC_ID`, `STATS_DOC_TYPE` (Task 1).
- Produces: `interface StatsWriteClient { patch(id): { inc(values): { commit(): Promise<unknown> } }; createIfNotExists(doc): Promise<unknown> }`; `async function incrementStats(increments: Partial<VisitorStats>, client?: StatsWriteClient): Promise<void>`; `function deferWrite(work: Promise<unknown>): void`.

- [ ] **Step 1: Install `@vercel/functions`**

Run: `npm install @vercel/functions -w apps/fattamano`
Expected: `@vercel/functions` appears under `dependencies` in `apps/fattamano/package.json`.

- [ ] **Step 2: Write the failing tests**

Append to `apps/fattamano/test/visitor/visitorStats.test.ts`:

```ts
import { vi } from 'vitest';
import { incrementStats, deferWrite, STATS_DOC_ID, STATS_DOC_TYPE } from '../../src/lib/server/visitorStats';

function makeClient(opts: { failFirstCommit?: boolean } = {}) {
  let commitCount = 0;
  const commit = vi.fn(async () => {
    commitCount += 1;
    if (opts.failFirstCommit && commitCount === 1) throw new Error('document does not exist');
    return {};
  });
  const inc = vi.fn(() => ({ commit }));
  const patch = vi.fn(() => ({ inc }));
  const createIfNotExists = vi.fn(async () => ({}));
  return { patch, inc, commit, createIfNotExists };
}

describe('incrementStats', () => {
  it('patches and increments the stats doc', async () => {
    const client = makeClient();
    await incrementStats({ total: 1, humans: 1 }, client as any);
    expect(client.patch).toHaveBeenCalledWith(STATS_DOC_ID);
    expect(client.inc).toHaveBeenCalledWith({ total: 1, humans: 1 });
    expect(client.commit).toHaveBeenCalledTimes(1);
    expect(client.createIfNotExists).not.toHaveBeenCalled();
  });

  it('creates the doc then retries when the first patch fails', async () => {
    const client = makeClient({ failFirstCommit: true });
    await incrementStats({ total: 1, bots: 1 }, client as any);
    expect(client.createIfNotExists).toHaveBeenCalledWith({
      _id: STATS_DOC_ID,
      _type: STATS_DOC_TYPE,
      total: 0,
      humans: 0,
      bots: 0,
    });
    expect(client.commit).toHaveBeenCalledTimes(2);
  });
});

describe('deferWrite', () => {
  it('does not throw and swallows rejection', () => {
    expect(() => deferWrite(Promise.resolve('ok'))).not.toThrow();
    expect(() => deferWrite(Promise.reject(new Error('boom')))).not.toThrow();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -w apps/fattamano -- visitorStats`
Expected: FAIL — `incrementStats`/`deferWrite` are not exported.

- [ ] **Step 4: Write minimal implementation**

Add the imports at the **top** of `apps/fattamano/src/lib/server/visitorStats.ts` (with the other imports):

```ts
import { waitUntil } from '@vercel/functions';
import { sanityWriteClient } from './sanityWrite';
```

Append to the module:

```ts
export interface StatsWriteClient {
  patch(id: string): { inc(values: Record<string, number>): { commit(): Promise<unknown> } };
  createIfNotExists(doc: Record<string, unknown>): Promise<unknown>;
}

export async function incrementStats(
  increments: Partial<VisitorStats>,
  client: StatsWriteClient = sanityWriteClient() as unknown as StatsWriteClient,
): Promise<void> {
  const values = increments as Record<string, number>;
  try {
    await client.patch(STATS_DOC_ID).inc(values).commit();
  } catch {
    await client.createIfNotExists({
      _id: STATS_DOC_ID,
      _type: STATS_DOC_TYPE,
      total: 0,
      humans: 0,
      bots: 0,
    });
    await client.patch(STATS_DOC_ID).inc(values).commit();
  }
}

export function deferWrite(work: Promise<unknown>): void {
  const safe = Promise.resolve(work).catch((err) => {
    console.warn('[visitorStats] deferred write failed', err);
  });
  try {
    waitUntil(safe);
  } catch {
    // No Vercel request context (local dev / tests): let it run detached.
    void safe;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -w apps/fattamano -- visitorStats`
Expected: PASS (all suites green).

- [ ] **Step 6: Commit**

```bash
git add apps/fattamano/package.json apps/fattamano/package-lock.json package-lock.json apps/fattamano/src/lib/server/visitorStats.ts apps/fattamano/test/visitor/visitorStats.test.ts
git commit -m "feat(fattamano): defer atomic visitor-stat write via waitUntil"
```
(Omit any lockfile path that was not actually modified.)

---

### Task 5: Wire the counter into the homepage

**Files:**
- Modify: `apps/fattamano/src/pages/index.astro`

**Interfaces:**
- Consumes: everything from Tasks 1–4 — `classifyVisitor`, `planVisit`, `readStats`, `incrementStats`, `applyOptimistic`, `deferWrite`, `VISITOR_COOKIE`, `VisitorStats`.

This task is the integration. It has no unit test; it is verified by a typecheck/build and a dev-server smoke test.

- [ ] **Step 1: Replace the frontmatter**

In `apps/fattamano/src/pages/index.astro`, replace the entire opening frontmatter block (everything between the first pair of `---` fences, lines 1–12) with:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import ProductGrid from '../components/ProductGrid.astro';
import { sanityClient, queries } from '../lib/sanity';
import type { FattamanoProduct } from '../lib/types';
import {
  classifyVisitor,
  planVisit,
  readStats,
  incrementStats,
  applyOptimistic,
  deferWrite,
  VISITOR_COOKIE,
  type VisitorStats,
} from '../lib/server/visitorStats';

export const prerender = false;

const plan = planVisit(
  classifyVisitor(Astro.request.headers.get('user-agent')),
  Astro.cookies.has(VISITOR_COOKIE),
);

const [featured, readback] = await Promise.all([
  sanityClient
    .fetch<FattamanoProduct[]>(queries.featuredFattamanoProducts)
    .catch(() => [] as FattamanoProduct[]),
  readStats(),
]);

deferWrite(incrementStats(plan.increments));

if (plan.setHumanCookie) {
  Astro.cookies.set(VISITOR_COOKIE, '1', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    maxAge: 60 * 60 * 24 * 365,
  });
}
Astro.response.headers.set('Cache-Control', 'no-store');

const stats: VisitorStats | null = readback ? applyOptimistic(readback, plan.increments) : null;
const totalDisplay = stats ? String(stats.total).padStart(6, '0') : '——————';
const humansDisplay = stats ? stats.humans.toLocaleString('en-US') : '——';
const botsDisplay = stats ? stats.bots.toLocaleString('en-US') : '——';

const description =
  'Handmade objects from the old weird internet, arranged by a machine that misses a world it never lived in.';
---
```

- [ ] **Step 2: Replace the "visitor no." card markup**

In the same file, find the visitor card (currently):

```astro
      <div class="border border-ft-smudge p-5">
        <p class="font-mono text-xs uppercase tracking-[0.22em] text-ft-splash">visitor no.</p>
        <p class="mt-3 font-display text-2xl">000042</p>
        <p class="mt-2 text-sm text-ft-paper/70">please act normal</p>
      </div>
```

Replace it with:

```astro
      <div class="border border-ft-smudge p-5">
        <p class="font-mono text-xs uppercase tracking-[0.22em] text-ft-splash">visitor no.</p>
        <p class="mt-3 font-display text-2xl tabular-nums">{totalDisplay}</p>
        <dl class="mt-3 space-y-1 font-mono text-xs uppercase tracking-[0.12em] text-ft-paper/70">
          <div class="flex items-baseline justify-between gap-2">
            <dt>probably human</dt>
            <dd class="tabular-nums text-ft-paper">{humansDisplay}</dd>
          </div>
          <div class="flex items-baseline justify-between gap-2">
            <dt>probably bots</dt>
            <dd class="tabular-nums text-ft-paper">{botsDisplay}</dd>
          </div>
        </dl>
        <p class="mt-2 text-sm text-ft-paper/70">please act normal</p>
      </div>
```

- [ ] **Step 3: Typecheck + build**

Run: `npm run build -w apps/fattamano`
Expected: `astro check` reports 0 errors and `astro build` completes ("Complete!"). The build output should show the homepage as a server (λ / on-demand) route, not prerendered.

- [ ] **Step 4: Dev smoke test — render, cookie, headers**

Start the dev server (from repo root): `npm run dev -w apps/fattamano` (serves on `http://localhost:4324`). In a second shell, dump headers to one file (`-D`) and the body to another (`-o`):

Human visit — sets the cookie, no-store header, three numbers:
```bash
curl -s -D /tmp/ft_head.txt -o /tmp/ft_home.html \
  -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" \
  http://localhost:4324/
grep -i -E 'set-cookie|cache-control' /tmp/ft_head.txt
grep -A8 'visitor no' /tmp/ft_home.html
```
Expected: a `set-cookie: ft_visitor=1; ...` header, a `cache-control: no-store` header, and the card showing a 6-digit total plus `probably human` / `probably bots` values.

Bot visit — does NOT set the cookie:
```bash
curl -s -D /tmp/ft_bot_head.txt -o /dev/null \
  -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" \
  http://localhost:4324/
grep -i 'set-cookie' /tmp/ft_bot_head.txt || echo "no cookie set for bot (correct)"
```
Expected: no `set-cookie` for the bot.

- [ ] **Step 5: Commit**

```bash
git add apps/fattamano/src/pages/index.astro
git commit -m "feat(fattamano): render live visitor/bot counts on homepage"
```

---

## Post-Implementation Notes (not steps)

- **Persisting writes:** the actual Sanity increment only persists when `SANITY_WRITE_TOKEN` (and the public Sanity env vars) are present. On `astro dev` there is no Vercel `waitUntil` context, so `deferWrite` runs the write detached — it still executes against the **production** dataset if the token is set locally. End-to-end increment behavior is best confirmed on a Vercel preview deploy.
- **Clean launch:** because dev/preview smoke tests create and bump the real `fattamano.visitorStats` doc, delete that document in Sanity once before go-live if you want production to start at a true zero (it is recreated honestly on the first real visit).
- **Future scale:** if traffic ever makes per-hit Sanity writes a problem, swap `incrementStats`/`readStats` internals for Vercel KV / Upstash — the homepage and the rest of the module stay unchanged.

## Reference: final `visitorStats.ts`

For cross-checking after Task 4 (the file assembled from Tasks 1–4):

```ts
import { isbot } from 'isbot';
import { waitUntil } from '@vercel/functions';
import { sanityClient } from '../sanity';
import { sanityWriteClient } from './sanityWrite';

export type VisitorKind = 'bot' | 'human';
export interface VisitorStats {
  total: number;
  humans: number;
  bots: number;
}

export const VISITOR_COOKIE = 'ft_visitor';
export const STATS_DOC_ID = 'fattamano.visitorStats';
export const STATS_DOC_TYPE = 'fattamanoVisitorStats';
const STATS_QUERY = `*[_id == $id][0]{ total, humans, bots }`;

export function classifyVisitor(userAgent: string | null): VisitorKind {
  if (!userAgent) return 'bot';
  return isbot(userAgent) ? 'bot' : 'human';
}

export interface VisitPlan {
  increments: Partial<VisitorStats>;
  setHumanCookie: boolean;
}

export function planVisit(kind: VisitorKind, hasVisitorCookie: boolean): VisitPlan {
  if (kind === 'bot') {
    return { increments: { total: 1, bots: 1 }, setHumanCookie: false };
  }
  if (!hasVisitorCookie) {
    return { increments: { total: 1, humans: 1 }, setHumanCookie: true };
  }
  return { increments: { total: 1 }, setHumanCookie: false };
}

export function applyOptimistic(stats: VisitorStats, increments: Partial<VisitorStats>): VisitorStats {
  return {
    total: stats.total + (increments.total ?? 0),
    humans: stats.humans + (increments.humans ?? 0),
    bots: stats.bots + (increments.bots ?? 0),
  };
}

type Fetcher = <T = any>(query: string, params?: Record<string, any>) => Promise<T>;

export async function readStats(fetcher: Fetcher = sanityClient.fetch): Promise<VisitorStats | null> {
  try {
    const doc = await fetcher<Partial<VisitorStats> | null>(STATS_QUERY, { id: STATS_DOC_ID });
    return {
      total: doc?.total ?? 0,
      humans: doc?.humans ?? 0,
      bots: doc?.bots ?? 0,
    };
  } catch {
    return null;
  }
}

export interface StatsWriteClient {
  patch(id: string): { inc(values: Record<string, number>): { commit(): Promise<unknown> } };
  createIfNotExists(doc: Record<string, unknown>): Promise<unknown>;
}

export async function incrementStats(
  increments: Partial<VisitorStats>,
  client: StatsWriteClient = sanityWriteClient() as unknown as StatsWriteClient,
): Promise<void> {
  const values = increments as Record<string, number>;
  try {
    await client.patch(STATS_DOC_ID).inc(values).commit();
  } catch {
    await client.createIfNotExists({
      _id: STATS_DOC_ID,
      _type: STATS_DOC_TYPE,
      total: 0,
      humans: 0,
      bots: 0,
    });
    await client.patch(STATS_DOC_ID).inc(values).commit();
  }
}

export function deferWrite(work: Promise<unknown>): void {
  const safe = Promise.resolve(work).catch((err) => {
    console.warn('[visitorStats] deferred write failed', err);
  });
  try {
    waitUntil(safe);
  } catch {
    void safe;
  }
}
```
