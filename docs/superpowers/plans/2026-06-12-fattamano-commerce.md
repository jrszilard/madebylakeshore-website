# fattamano Commerce Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fattamano's `buyUrl` redirect with an on-site Stripe Embedded Checkout: a localStorage cart, dynamic zone-based shipping, and server-side stock tracking that auto-marks items sold out.

**Architecture:** Static catalog pages render a React cart island; checkout uses Stripe **Embedded Checkout** (`ui_mode:'embedded'`) on `fattamano.com`. Three serverless endpoints — `/api/checkout` (create session from server-verified prices), `/api/calculate-shipping-options` (live zone rate on address entry), `/api/stripe-webhook` (decrement stock, transactional + idempotent) — plus `/api/availability` (live stock for the otherwise-static catalog). Money-path logic (zone lookup, cart validation, decrement planning) lives in pure, unit-tested functions; Stripe/Sanity I/O is thin glue.

**Tech Stack:** Astro 4 (hybrid, Vercel serverless adapter, already configured) · React 18 islands · `stripe` (server) + `@stripe/stripe-js` + `@stripe/react-stripe-js` (client) · `@sanity/client` (read via shared-ui, write via token) · Vitest (added by this plan) · Tailwind (`ft-*` tokens).

**Spec:** `docs/superpowers/specs/2026-06-12-fattamano-commerce-design.md`

**Reference docs (verify exact signatures with Context7 during implementation):**
- Embedded Checkout (custom shipping): https://docs.stripe.com/payments/checkout/custom-shipping-options?payment-ui=embedded-page
- Advanced shipping / server update: https://docs.stripe.com/payments/advanced/shipping
- Webhook signature verification: https://docs.stripe.com/webhooks/signature

---

## Conventions

- All work happens in the worktree on branch `feat/fattamano-commerce`.
- Run tests with: `npm run test --workspace=apps/fattamano` (added in M0).
- Build check: `npm run build:fattamano` (runs `astro check && astro build`).
- All API routes start with `export const prerender = false;` (required in hybrid mode — see `src/pages/api/og.ts`).
- **Secrets** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SANITY_WRITE_TOKEN`) are read **only** in `src/pages/api/*` and `src/lib/server/*` — never imported into a `.tsx`/client file. `PUBLIC_STRIPE_PUBLISHABLE_KEY` is the only Stripe value allowed client-side.
- Money is always in **integer cents**. Currency is `usd`.

## File Structure (created/modified)

**Studio (data model):**
- Modify `studio/schemas/documents/fattamanoProduct.ts` — add `stock`.
- Modify `studio/schemas/documents/fattamanoSettings.ts` — add `shippingZones`, `shippingFallbackBehavior`.
- Create `studio/schemas/documents/fattamanoCheckoutSession.ts` — internal order/idempotency doc.
- Modify `studio/schemas/index.ts` — register the new doc.
- Modify `studio/fattamanoStructure.ts` — show Settings/Products; add read-only Orders list.
- Create `studio/scripts/backfill-stock.ts` — one-off stock backfill.

**Shared queries / types:**
- Modify `packages/shared-ui/src/sanity.ts` — add `stock`/`shippingZones` to queries; add `fattamanoProductsByIds`, `fattamanoAvailabilityByIds`.
- Modify `apps/fattamano/src/lib/types.ts` — add `_id`, `stock`; add commerce types.

**Pure logic (unit-tested):**
- Create `apps/fattamano/src/lib/commerce/shipping.ts` + `test/commerce/shipping.test.ts`
- Create `apps/fattamano/src/lib/commerce/validateCart.ts` + `test/commerce/validateCart.test.ts`
- Create `apps/fattamano/src/lib/commerce/stock.ts` + `test/commerce/stock.test.ts`

**Server glue:**
- Create `apps/fattamano/src/lib/server/env.ts`, `src/lib/server/stripe.ts`, `src/lib/server/sanityWrite.ts`
- Create `apps/fattamano/src/pages/api/checkout.ts`, `calculate-shipping-options.ts`, `stripe-webhook.ts`, `availability.ts`

**Cart + checkout UI:**
- Create `apps/fattamano/src/lib/cart/cartStore.ts`, `src/lib/cart/useCart.ts`
- Create `apps/fattamano/src/components/cart/AddToCartButton.tsx`, `CartButton.tsx`, `CartDrawer.tsx`
- Create `apps/fattamano/src/components/checkout/CheckoutEmbed.tsx`
- Create `apps/fattamano/src/pages/checkout/index.astro`, `src/pages/checkout/return.astro`
- Modify `apps/fattamano/src/pages/things/[slug].astro`, `src/components/ProductCard.astro`, `src/components/Navigation.astro` — wire add-to-cart + cart button.

**Config:**
- Modify `apps/fattamano/package.json` — deps + test script.
- Create `apps/fattamano/vitest.config.ts`.
- Modify `apps/fattamano/vercel.json` if needed (webhook body — see M8).

---

## Milestone 0 — Tooling & dependencies

### Task 0.1: Add commerce dependencies

**Files:** Modify `apps/fattamano/package.json`

- [ ] **Step 1: Add deps and a test script.** Add to `dependencies`: `"stripe": "^17.0.0"`, `"@stripe/stripe-js": "^4.0.0"`, `"@stripe/react-stripe-js": "^3.0.0"`. Add to `devDependencies`: `"vitest": "^2.0.0"`. Add to `scripts`: `"test": "vitest run"`, `"test:watch": "vitest"`.

> Note: pin to whatever majors `npm install` resolves; the exact patch doesn't matter. After editing, run `npm install` from the repo root (workspaces).

- [ ] **Step 2: Install.** Run: `npm install` (from repo root). Expected: lockfile updates, no errors.

- [ ] **Step 3: Create `apps/fattamano/vitest.config.ts`:**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 4: Smoke-test the runner.** Create `apps/fattamano/test/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
describe('vitest', () => {
  it('runs', () => expect(1 + 1).toBe(2));
});
```

- [ ] **Step 5: Run.** `npm run test --workspace=apps/fattamano` → Expected: 1 passed. Then delete `test/smoke.test.ts`.

- [ ] **Step 6: Commit.**
```bash
git add apps/fattamano/package.json apps/fattamano/vitest.config.ts package-lock.json
git commit -m "build(fattamano): add stripe + vitest for commerce"
```

---

## Milestone 1 — Data model (Studio)

### Task 1.1: Add `stock` to the product schema

**Files:** Modify `studio/schemas/documents/fattamanoProduct.ts`

- [ ] **Step 1:** Insert a `stock` field immediately after the `status` field's `defineField({...})` block:

```ts
    defineField({
      name: 'stock',
      title: 'Stock (units available)',
      type: 'number',
      description:
        'How many you have to sell. Decrements automatically when an order is paid; at 0 the item shows as sold out. A one-of-a-kind piece is 1.',
      initialValue: 0,
      validation: (Rule) => Rule.required().integer().min(0),
    }),
```

- [ ] **Step 2:** Surface stock in the Studio list preview. Replace the existing `preview` block with:
```ts
  preview: {
    select: {
      title: 'title',
      category: 'category',
      status: 'status',
      media: 'images.0',
      stock: 'stock',
    },
    prepare({ title, category, status, media, stock }) {
      const statusLabel = status === 'available' ? '' : ` • ${status}`;
      return {
        title,
        subtitle: `${category || 'uncategorized'}${statusLabel} • stock ${stock ?? '—'}`,
        media,
      };
    },
  },
```

- [ ] **Step 3: Build the studio to typecheck.** Run: `npm run build --workspace=studio` (or `npx sanity build` in `studio/`). Expected: builds without schema errors.

- [ ] **Step 4: Commit.**
```bash
git add studio/schemas/documents/fattamanoProduct.ts
git commit -m "feat(studio): add stock field to fattamanoProduct"
```

### Task 1.2: Add shipping zones to settings

**Files:** Modify `studio/schemas/documents/fattamanoSettings.ts`

- [ ] **Step 1:** Add these two fields to the `fields` array (after `contactEmail`):

```ts
    defineField({
      name: 'shippingZones',
      title: 'Shipping Zones',
      type: 'array',
      description:
        'Destination zones and their flat rate. The first zone whose country list contains the customer’s country wins. The union of all countries here is exactly where checkout will ship.',
      of: [
        {
          type: 'object',
          name: 'shippingZone',
          fields: [
            { name: 'label', title: 'Label', type: 'string', validation: (R) => R.required() },
            {
              name: 'countryCodes',
              title: 'Country codes (ISO-3166-1 alpha-2, e.g. US, CA, GB)',
              type: 'array',
              of: [{ type: 'string' }],
              options: { layout: 'tags' },
              validation: (R) => R.required().min(1),
            },
            {
              name: 'rateCents',
              title: 'Flat rate (cents)',
              type: 'number',
              description: 'e.g. 500 = $5.00',
              validation: (R) => R.required().integer().min(0),
            },
          ],
          preview: {
            select: { label: 'label', rate: 'rateCents', countries: 'countryCodes' },
            prepare: ({ label, rate, countries }) => ({
              title: `${label} — $${((rate ?? 0) / 100).toFixed(2)}`,
              subtitle: (countries || []).join(', '),
            }),
          },
        },
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'shippingFallbackBehavior',
      title: 'If a destination matches no zone',
      type: 'string',
      options: { list: [{ title: 'Reject (do not ship)', value: 'reject' }], layout: 'radio' },
      initialValue: 'reject',
    }),
```

- [ ] **Step 2: Build studio.** Run: `npm run build --workspace=studio`. Expected: no errors.

- [ ] **Step 3: Commit.**
```bash
git add studio/schemas/documents/fattamanoSettings.ts
git commit -m "feat(studio): add editable shipping zones to fattamanoSettings"
```

### Task 1.3: Internal checkout-session document

**Files:** Create `studio/schemas/documents/fattamanoCheckoutSession.ts`; Modify `studio/schemas/index.ts`, `studio/fattamanoStructure.ts`

- [ ] **Step 1: Create `studio/schemas/documents/fattamanoCheckoutSession.ts`:**

```ts
import { defineType, defineField } from 'sanity';

// Internal plumbing doc. _id is set to the Stripe Checkout Session id, which
// gives free idempotency. Stores no customer PII (address/email live in Stripe).
export default defineType({
  name: 'fattamanoCheckoutSession',
  title: 'fattamano Order (internal)',
  type: 'document',
  readOnly: true,
  fields: [
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'productId', type: 'string' },
            { name: 'qty', type: 'number' },
          ],
        },
      ],
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: { list: ['pending', 'fulfilled'] },
      initialValue: 'pending',
    }),
    defineField({ name: 'createdAt', title: 'Created At', type: 'datetime' }),
  ],
  preview: {
    select: { status: 'status', createdAt: 'createdAt' },
    prepare: ({ status, createdAt }) => ({
      title: `${status ?? 'pending'}`,
      subtitle: createdAt ?? '',
    }),
  },
});
```

- [ ] **Step 2:** In `studio/schemas/index.ts`, import and register it. Add after the `fattamanoSettings` import:
```ts
import fattamanoCheckoutSession from './documents/fattamanoCheckoutSession';
```
and add `fattamanoCheckoutSession,` to the `schemaTypes` array in the `// fattamano documents` group.

- [ ] **Step 3:** In `studio/fattamanoStructure.ts`, add an Orders list. Insert before the closing `]);`:
```ts
      S.divider(),
      S.listItem()
        .title('Orders (internal)')
        .schemaType('fattamanoCheckoutSession')
        .child(
          S.documentTypeList('fattamanoCheckoutSession')
            .title('Orders')
            .defaultOrdering([{ field: 'createdAt', direction: 'desc' }])
        ),
```

- [ ] **Step 4: Build studio.** Run: `npm run build --workspace=studio`. Expected: no errors; the doc auto-routes to the fattamano workspace (name starts with `fattamano`).

- [ ] **Step 5: Commit.**
```bash
git add studio/schemas/documents/fattamanoCheckoutSession.ts studio/schemas/index.ts studio/fattamanoStructure.ts
git commit -m "feat(studio): internal fattamanoCheckoutSession doc + Orders list"
```

### Task 1.4: Backfill stock on existing products

**Files:** Create `studio/scripts/backfill-stock.ts`

- [ ] **Step 1: Create the script.** (Run with the Sanity CLI which injects a token. Mirrors the existing seed script pattern.)

```ts
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2024-01-01' });

async function run() {
  const products = await client.fetch(
    `*[_type == "fattamanoProduct" && !defined(stock)]{ _id, title }`
  );
  console.log(`Backfilling stock on ${products.length} product(s)...`);
  let tx = client.transaction();
  for (const p of products) {
    tx = tx.patch(p._id, (patch) => patch.set({ stock: 10 }));
    console.log(`  ${p.title} -> stock 10`);
  }
  if (products.length) await tx.commit();
  console.log('Done. Adjust real counts in Studio.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Run it.** From `studio/`: `npx sanity exec scripts/backfill-stock.ts --with-user-token`. Expected: logs each product, sets `stock: 10` (placeholder Wilma adjusts).

- [ ] **Step 3: Verify in Studio** that both existing products now have a stock value.

- [ ] **Step 4: Commit.**
```bash
git add studio/scripts/backfill-stock.ts
git commit -m "chore(studio): one-off stock backfill script"
```

---

## Milestone 2 — Queries & types

### Task 2.1: Extend GROQ queries

**Files:** Modify `packages/shared-ui/src/sanity.ts`

- [ ] **Step 1:** Add `stock` to the field list of `allFattamanoProducts`, `featuredFattamanoProducts`, `fattamanoProductBySlug`, and `fattamanoProductsByCategory` (append `, stock` to each projection).

- [ ] **Step 2:** Add `shippingZones` + fallback to the `fattamanoSettings` query. Replace it with:
```ts
  fattamanoSettings: `*[_type == "fattamanoSettings"][0] {
    heroHeadline, heroSubcopy, aboutBody, footerCopy, notFoundCopy, contactEmail,
    shippingZones[]{ label, countryCodes, rateCents }, shippingFallbackBehavior
  }`,
```

- [ ] **Step 3:** Add two new queries to the `queries` object (in the `// fattamano queries` group):
```ts
  // Server-side checkout: authoritative price/stock/status by id
  fattamanoProductsByIds: `*[_type == "fattamanoProduct" && _id in $ids]{
    _id, title, priceCents, status, stock, "image": images[0]
  }`,

  // Public live availability for the otherwise-static catalog
  fattamanoAvailabilityByIds: `*[_type == "fattamanoProduct" && _id in $ids]{
    _id, status, stock
  }`,
```

- [ ] **Step 4: Typecheck.** Run: `npm run build --workspace=packages/shared-ui` if such a script exists, else `npx tsc --noEmit -p packages/shared-ui` (or rely on the app build in 2.2). Expected: no TS errors.

- [ ] **Step 5: Commit.**
```bash
git add packages/shared-ui/src/sanity.ts
git commit -m "feat(shared-ui): stock + shipping zones + by-id fattamano queries"
```

### Task 2.2: Extend app types

**Files:** Modify `apps/fattamano/src/lib/types.ts`

- [ ] **Step 1:** Add `_id` and `stock` to `FattamanoProduct` and add commerce types at the end of the file:

```ts
// add to FattamanoProduct interface:
//   _id: string;
//   stock?: number;

export interface ShippingZone {
  label: string;
  countryCodes: string[];
  rateCents: number;
}

export interface FattamanoSettings {
  heroHeadline?: string;
  heroSubcopy?: string;
  contactEmail?: string;
  shippingZones?: ShippingZone[];
  shippingFallbackBehavior?: 'reject';
}

// One line in the cart (client) and the unit the checkout validates.
export interface CartItem {
  productId: string; // Sanity _id
  slug: string;
  title: string;
  priceCents: number;
  image?: SanityImageLike | null;
  qty: number;
}

// Authoritative product row fetched server-side at checkout.
export interface ProductRow {
  _id: string;
  title: string;
  priceCents?: number;
  status: FattamanoProductStatus;
  stock?: number;
  image?: SanityImageLike | null;
}
```

- [ ] **Step 2:** Edit the `FattamanoProduct` interface to add `_id: string;` (first field) and `stock?: number;` (after `status`).

- [ ] **Step 3: Build.** Run: `npm run build:fattamano`. Expected: `astro check` passes (existing pages still typecheck; `_id` is now available where products are fetched).

- [ ] **Step 4: Commit.**
```bash
git add apps/fattamano/src/lib/types.ts
git commit -m "feat(fattamano): product _id/stock + commerce types"
```

---

## Milestone 3 — Pure commerce logic (TDD)

> These three files hold every decision that affects money or inventory. They are pure (no I/O), so they get strict TDD. Endpoints in later milestones are thin wrappers over them.

### Task 3.1: Shipping zone resolver

**Files:** Create `apps/fattamano/src/lib/commerce/shipping.ts`; Test `apps/fattamano/test/commerce/shipping.test.ts`

- [ ] **Step 1: Write the failing test:**

```ts
import { describe, it, expect } from 'vitest';
import { resolveShippingOption, allowedCountries } from '../../src/lib/commerce/shipping';
import type { ShippingZone } from '../../src/lib/types';

const ZONES: ShippingZone[] = [
  { label: 'US', countryCodes: ['US'], rateCents: 500 },
  { label: 'Canada', countryCodes: ['CA'], rateCents: 1000 },
  { label: 'Europe', countryCodes: ['DE', 'FR', 'GB'], rateCents: 1500 },
];

describe('resolveShippingOption', () => {
  it('matches the first zone containing the country', () => {
    expect(resolveShippingOption('US', ZONES)).toEqual({ label: 'US', rateCents: 500 });
    expect(resolveShippingOption('FR', ZONES)).toEqual({ label: 'Europe', rateCents: 1500 });
  });
  it('is case-insensitive on the country code', () => {
    expect(resolveShippingOption('gb', ZONES)).toEqual({ label: 'Europe', rateCents: 1500 });
  });
  it('returns null for an unsupported destination', () => {
    expect(resolveShippingOption('JP', ZONES)).toBeNull();
  });
  it('returns null for empty/garbage input', () => {
    expect(resolveShippingOption('', ZONES)).toBeNull();
    expect(resolveShippingOption('US', [])).toBeNull();
  });
});

describe('allowedCountries', () => {
  it('returns the de-duplicated, upper-cased union', () => {
    expect(allowedCountries(ZONES).sort()).toEqual(['CA', 'DE', 'FR', 'GB', 'US']);
  });
});
```

- [ ] **Step 2: Run → fail.** `npm run test --workspace=apps/fattamano` → Expected: FAIL (module not found).

- [ ] **Step 3: Implement `apps/fattamano/src/lib/commerce/shipping.ts`:**

```ts
import type { ShippingZone } from '../types';

export function resolveShippingOption(
  country: string,
  zones: ShippingZone[]
): { label: string; rateCents: number } | null {
  const code = (country || '').trim().toUpperCase();
  if (!code) return null;
  for (const zone of zones) {
    if (zone.countryCodes.some((c) => c.trim().toUpperCase() === code)) {
      return { label: zone.label, rateCents: zone.rateCents };
    }
  }
  return null;
}

export function allowedCountries(zones: ShippingZone[]): string[] {
  const set = new Set<string>();
  for (const zone of zones) {
    for (const c of zone.countryCodes) set.add(c.trim().toUpperCase());
  }
  return [...set];
}
```

- [ ] **Step 4: Run → pass.** `npm run test --workspace=apps/fattamano` → Expected: PASS.

- [ ] **Step 5: Commit.**
```bash
git add apps/fattamano/src/lib/commerce/shipping.ts apps/fattamano/test/commerce/shipping.test.ts
git commit -m "feat(fattamano): shipping zone resolver (tested)"
```

### Task 3.2: Cart validation & order-line builder

**Files:** Create `apps/fattamano/src/lib/commerce/validateCart.ts`; Test `apps/fattamano/test/commerce/validateCart.test.ts`

- [ ] **Step 1: Write the failing test:**

```ts
import { describe, it, expect } from 'vitest';
import { normalizeCartItems, buildOrderLines } from '../../src/lib/commerce/validateCart';
import type { ProductRow } from '../../src/lib/types';

const ROWS: ProductRow[] = [
  { _id: 'a', title: 'Sticker A', priceCents: 500, status: 'available', stock: 3 },
  { _id: 'b', title: 'Shirt B', priceCents: 2500, status: 'available', stock: 0 },
  { _id: 'c', title: 'Concept C', priceCents: 800, status: 'concept', stock: 5 },
];

describe('normalizeCartItems', () => {
  it('accepts a well-formed array', () => {
    expect(normalizeCartItems([{ productId: 'a', qty: 2 }])).toEqual([{ productId: 'a', qty: 2 }]);
  });
  it('rejects non-arrays, empty carts, bad qty, missing id', () => {
    expect(() => normalizeCartItems(null)).toThrow();
    expect(() => normalizeCartItems([])).toThrow();
    expect(() => normalizeCartItems([{ productId: 'a', qty: 0 }])).toThrow();
    expect(() => normalizeCartItems([{ productId: 'a', qty: 1.5 }])).toThrow();
    expect(() => normalizeCartItems([{ qty: 1 }])).toThrow();
  });
  it('caps absurd quantities', () => {
    expect(() => normalizeCartItems([{ productId: 'a', qty: 100000 }])).toThrow();
  });
  it('caps the number of distinct lines', () => {
    const many = Array.from({ length: 51 }, (_, i) => ({ productId: `p${i}`, qty: 1 }));
    expect(() => normalizeCartItems(many)).toThrow();
  });
  it('collapses duplicate productIds by summing qty (no split-line oversell)', () => {
    expect(
      normalizeCartItems([
        { productId: 'a', qty: 1 },
        { productId: 'a', qty: 2 },
      ])
    ).toEqual([{ productId: 'a', qty: 3 }]);
  });
  it('rejects a collapsed qty that exceeds the per-product cap', () => {
    expect(() =>
      normalizeCartItems([
        { productId: 'a', qty: 30 },
        { productId: 'a', qty: 30 },
      ])
    ).toThrow();
  });
  it('trims and rejects a whitespace-only productId', () => {
    expect(() => normalizeCartItems([{ productId: '   ', qty: 1 }])).toThrow();
  });
});

describe('buildOrderLines', () => {
  it('builds priced lines from authoritative rows (ignores any client price)', () => {
    const { lines, unavailable } = buildOrderLines([{ productId: 'a', qty: 2 }], ROWS);
    expect(unavailable).toEqual([]);
    expect(lines).toEqual([
      { productId: 'a', title: 'Sticker A', unitAmountCents: 500, qty: 2, image: undefined },
    ]);
  });
  it('flags out-of-stock, non-available, missing, and over-qty items', () => {
    const { unavailable } = buildOrderLines(
      [
        { productId: 'b', qty: 1 }, // stock 0
        { productId: 'c', qty: 1 }, // concept
        { productId: 'z', qty: 1 }, // missing
        { productId: 'a', qty: 9 }, // over stock (3)
      ],
      ROWS
    );
    expect(unavailable.map((u) => u.productId).sort()).toEqual(['a', 'b', 'c', 'z']);
  });
  it('rejects non-integer prices so no float reaches Stripe unit_amount', () => {
    const rows = [
      { _id: 'a', title: 'A', priceCents: 500.7, status: 'available', stock: 3 },
    ] as ProductRow[];
    const { lines, unavailable } = buildOrderLines([{ productId: 'a', qty: 1 }], rows);
    expect(lines).toEqual([]);
    expect(unavailable).toEqual([{ productId: 'a', reason: 'no_price' }]);
  });
});
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement `apps/fattamano/src/lib/commerce/validateCart.ts`:**

```ts
import type { CartItem, ProductRow } from '../types';

const MAX_QTY_PER_LINE = 50;
const MAX_LINES = 50; // bound work + the idempotency doc size; abuse guard

export class BadCartError extends Error {}

export interface NormalizedItem {
  productId: string;
  qty: number;
}

export function normalizeCartItems(body: unknown): NormalizedItem[] {
  if (!Array.isArray(body) || body.length === 0) {
    throw new BadCartError('Cart must be a non-empty array');
  }
  if (body.length > MAX_LINES) {
    throw new BadCartError(`Cart cannot exceed ${MAX_LINES} distinct items`);
  }
  // Collapse duplicate productIds by summing qty. The authoritative money path
  // must not trust the client to send one line per product — split lines
  // ({a:2},{a:2}) would otherwise each pass the per-line stock check and
  // oversell, and each decrement from the same base stock.
  const byId = new Map<string, number>();
  for (const raw of body) {
    const productId =
      typeof (raw as any)?.productId === 'string' ? (raw as any).productId.trim() : '';
    const qty = (raw as any)?.qty;
    if (!productId) {
      throw new BadCartError('Each item needs a productId');
    }
    if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
      throw new BadCartError(`qty must be an integer 1..${MAX_QTY_PER_LINE}`);
    }
    byId.set(productId, (byId.get(productId) ?? 0) + qty);
  }
  const items = [...byId.entries()].map(([productId, qty]) => ({ productId, qty }));
  for (const item of items) {
    if (item.qty > MAX_QTY_PER_LINE) {
      throw new BadCartError(`Total qty for a product cannot exceed ${MAX_QTY_PER_LINE}`);
    }
  }
  return items;
}

export interface OrderLine {
  productId: string;
  title: string;
  unitAmountCents: number;
  qty: number;
  image?: unknown;
}

export interface Unavailable {
  productId: string;
  reason: 'missing' | 'not_available' | 'no_price' | 'out_of_stock';
}

export function buildOrderLines(
  items: NormalizedItem[],
  rows: ProductRow[]
): { lines: OrderLine[]; unavailable: Unavailable[] } {
  const byId = new Map(rows.map((r) => [r._id, r]));
  const lines: OrderLine[] = [];
  const unavailable: Unavailable[] = [];

  for (const item of items) {
    const row = byId.get(item.productId);
    if (!row) {
      unavailable.push({ productId: item.productId, reason: 'missing' });
      continue;
    }
    if (row.status !== 'available') {
      unavailable.push({ productId: item.productId, reason: 'not_available' });
      continue;
    }
    if (typeof row.priceCents !== 'number' || !Number.isInteger(row.priceCents) || row.priceCents <= 0) {
      // Reject non-integer cents so a float never reaches Stripe's unit_amount.
      unavailable.push({ productId: item.productId, reason: 'no_price' });
      continue;
    }
    if ((row.stock ?? 0) < item.qty) {
      unavailable.push({ productId: item.productId, reason: 'out_of_stock' });
      continue;
    }
    lines.push({
      productId: row._id,
      title: row.title,
      unitAmountCents: row.priceCents,
      qty: item.qty,
      image: row.image ?? undefined,
    });
  }
  return { lines, unavailable };
}
```
> `CartItem` is imported only to keep the module's domain types co-located; if lint flags it as unused, drop the import.

- [ ] **Step 4: Run → pass.**

- [ ] **Step 5: Commit.**
```bash
git add apps/fattamano/src/lib/commerce/validateCart.ts apps/fattamano/test/commerce/validateCart.test.ts
git commit -m "feat(fattamano): server-side cart validation + order lines (tested)"
```

### Task 3.3: Stock decrement planner

**Files:** Create `apps/fattamano/src/lib/commerce/stock.ts`; Test `apps/fattamano/test/commerce/stock.test.ts`

- [ ] **Step 1: Write the failing test:**

```ts
import { describe, it, expect } from 'vitest';
import { planStockDecrements } from '../../src/lib/commerce/stock';
import type { ProductRow } from '../../src/lib/types';

const ROWS: ProductRow[] = [
  { _id: 'a', title: 'A', status: 'available', stock: 3, priceCents: 500 },
  { _id: 'b', title: 'B', status: 'available', stock: 1, priceCents: 900 },
];

describe('planStockDecrements', () => {
  it('computes new stock and soldOut flags', () => {
    const plan = planStockDecrements([{ productId: 'a', qty: 2 }, { productId: 'b', qty: 1 }], ROWS);
    expect(plan).toEqual([
      { productId: 'a', newStock: 1, soldOut: false },
      { productId: 'b', newStock: 0, soldOut: true },
    ]);
  });
  it('never goes below zero', () => {
    const plan = planStockDecrements([{ productId: 'b', qty: 5 }], ROWS);
    expect(plan).toEqual([{ productId: 'b', newStock: 0, soldOut: true }]);
  });
  it('skips unknown products', () => {
    expect(planStockDecrements([{ productId: 'z', qty: 1 }], ROWS)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement `apps/fattamano/src/lib/commerce/stock.ts`:**

```ts
import type { ProductRow } from '../types';

export interface StockChange {
  productId: string;
  newStock: number;
  soldOut: boolean;
}

export function planStockDecrements(
  items: { productId: string; qty: number }[],
  rows: ProductRow[]
): StockChange[] {
  const byId = new Map(rows.map((r) => [r._id, r]));
  const changes: StockChange[] = [];
  for (const item of items) {
    const row = byId.get(item.productId);
    if (!row) continue;
    const newStock = Math.max(0, (row.stock ?? 0) - item.qty);
    changes.push({ productId: item.productId, newStock, soldOut: newStock === 0 });
  }
  return changes;
}
```

- [ ] **Step 4: Run → pass.**

- [ ] **Step 5: Commit.**
```bash
git add apps/fattamano/src/lib/commerce/stock.ts apps/fattamano/test/commerce/stock.test.ts
git commit -m "feat(fattamano): stock decrement planner (tested)"
```

---

## Milestone 4 — Server clients

### Task 4.1: Server env accessor

**Files:** Create `apps/fattamano/src/lib/server/env.ts`

- [ ] **Step 1: Create it** (process.env first for Vercel runtime secrets, import.meta.env fallback for local dev):

```ts
export function requireServerEnv(name: string): string {
  const fromProcess = typeof process !== 'undefined' ? process.env?.[name] : undefined;
  const fromImport =
    typeof import.meta !== 'undefined' ? (import.meta as any).env?.[name] : undefined;
  const value = fromProcess || fromImport;
  if (!value) throw new Error(`Missing required server env var: ${name}`);
  return value;
}
```

- [ ] **Step 2: Commit.**
```bash
git add apps/fattamano/src/lib/server/env.ts
git commit -m "feat(fattamano): server env accessor"
```

### Task 4.2: Stripe server client

**Files:** Create `apps/fattamano/src/lib/server/stripe.ts`

- [ ] **Step 1: Create it** (lazy, server-only):

```ts
import Stripe from 'stripe';
import { requireServerEnv } from './env';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(requireServerEnv('STRIPE_SECRET_KEY'));
  }
  return _stripe;
}
```
> We intentionally do not pin `apiVersion` — the installed SDK's default is fine. If `astro check` complains about the Stripe types, pin to the version string the SDK suggests in its error.

- [ ] **Step 2: Commit.**
```bash
git add apps/fattamano/src/lib/server/stripe.ts
git commit -m "feat(fattamano): lazy Stripe server client"
```

### Task 4.3: Sanity write client

**Files:** Create `apps/fattamano/src/lib/server/sanityWrite.ts`

- [ ] **Step 1: Create it** (reuses shared-ui's `createServerSanityClient`, which returns the raw `.client` for transactions):

```ts
import { createServerSanityClient } from '@lakeshore/shared-ui/sanity';
import { requireServerEnv } from './env';

let _bundle: ReturnType<typeof createServerSanityClient> | null = null;

function bundle() {
  if (!_bundle) {
    _bundle = createServerSanityClient({
      projectId:
        requireServerEnv('PUBLIC_SANITY_PROJECT_ID'),
      dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
      token: requireServerEnv('SANITY_WRITE_TOKEN'),
    });
  }
  return _bundle;
}

// Read with the write client (no CDN -> always fresh, critical for stock checks).
export function sanityWriteFetch<T = any>(query: string, params?: Record<string, any>): Promise<T> {
  return bundle().fetch<T>(query, params);
}

// Raw @sanity/client for transactions/patches/createIfNotExists.
export function sanityWriteClient() {
  return bundle().client;
}
```

- [ ] **Step 2: Build.** Run: `npm run build:fattamano`. Expected: typechecks (the import path `@lakeshore/shared-ui/sanity` matches `src/lib/sanity.ts`).

- [ ] **Step 3: Commit.**
```bash
git add apps/fattamano/src/lib/server/sanityWrite.ts
git commit -m "feat(fattamano): server-only Sanity write client"
```

---

## Milestone 5 — Cart (client store + components)

### Task 5.1: Cart store

**Files:** Create `apps/fattamano/src/lib/cart/cartStore.ts`; Test `apps/fattamano/test/cart/cartStore.test.ts`

- [ ] **Step 1: Write the failing test** (the store's reducer logic is pure and testable; localStorage is guarded):

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { cartReducer, type CartState } from '../../src/lib/cart/cartStore';
import type { CartItem } from '../../src/lib/types';

const A: CartItem = { productId: 'a', slug: 'a', title: 'A', priceCents: 500, qty: 1 };

describe('cartReducer', () => {
  let s: CartState;
  beforeEach(() => { s = { items: [] }; });

  it('adds and merges quantities', () => {
    s = cartReducer(s, { type: 'add', item: A });
    s = cartReducer(s, { type: 'add', item: A });
    expect(s.items).toEqual([{ ...A, qty: 2 }]);
  });
  it('sets qty and removes at 0', () => {
    s = cartReducer({ items: [{ ...A, qty: 3 }] }, { type: 'setQty', productId: 'a', qty: 1 });
    expect(s.items[0].qty).toBe(1);
    s = cartReducer(s, { type: 'setQty', productId: 'a', qty: 0 });
    expect(s.items).toEqual([]);
  });
  it('removes and clears', () => {
    s = cartReducer({ items: [{ ...A, qty: 1 }] }, { type: 'remove', productId: 'a' });
    expect(s.items).toEqual([]);
  });
});
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement `apps/fattamano/src/lib/cart/cartStore.ts`** (pure reducer + a tiny external store with localStorage + cross-island sync):

```ts
import type { CartItem } from '../types';

export interface CartState {
  items: CartItem[];
}

export type CartAction =
  | { type: 'add'; item: CartItem }
  | { type: 'setQty'; productId: string; qty: number }
  | { type: 'remove'; productId: string }
  | { type: 'clear' }
  | { type: 'replace'; state: CartState };

const MAX_QTY = 50;

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      const existing = state.items.find((i) => i.productId === action.item.productId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === action.item.productId
              ? { ...i, qty: Math.min(MAX_QTY, i.qty + action.item.qty) }
              : i
          ),
        };
      }
      return { items: [...state.items, { ...action.item, qty: Math.min(MAX_QTY, action.item.qty) }] };
    }
    case 'setQty': {
      if (action.qty <= 0) {
        return { items: state.items.filter((i) => i.productId !== action.productId) };
      }
      return {
        items: state.items.map((i) =>
          i.productId === action.productId ? { ...i, qty: Math.min(MAX_QTY, action.qty) } : i
        ),
      };
    }
    case 'remove':
      return { items: state.items.filter((i) => i.productId !== action.productId) };
    case 'clear':
      return { items: [] };
    case 'replace':
      return action.state;
  }
}

// ---- external store (browser only) ----
const KEY = 'ft_cart_v1';
let state: CartState = { items: [] };
const listeners = new Set<() => void>();

function load(): CartState {
  if (typeof localStorage === 'undefined') return { items: [] };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartState) : { items: [] };
  } catch {
    return { items: [] };
  }
}

function persist() {
  if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(state));
}

if (typeof window !== 'undefined') {
  state = load();
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      state = load();
      listeners.forEach((l) => l());
    }
  });
}

export function dispatch(action: CartAction) {
  state = cartReducer(state, action);
  persist();
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): CartState {
  return state;
}

export function cartCount(s: CartState): number {
  return s.items.reduce((n, i) => n + i.qty, 0);
}

export function cartSubtotalCents(s: CartState): number {
  return s.items.reduce((n, i) => n + i.priceCents * i.qty, 0);
}
```

- [ ] **Step 4: Run → pass.**

- [ ] **Step 5: Commit.**
```bash
git add apps/fattamano/src/lib/cart/cartStore.ts apps/fattamano/test/cart/cartStore.test.ts
git commit -m "feat(fattamano): cart store (pure reducer tested) + localStorage sync"
```

### Task 5.2: useCart hook

**Files:** Create `apps/fattamano/src/lib/cart/useCart.ts`

- [ ] **Step 1: Create it:**

```ts
import { useSyncExternalStore } from 'react';
import { subscribe, getSnapshot, dispatch, cartCount, cartSubtotalCents } from './cartStore';

export function useCart() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => ({ items: [] }));
  return {
    items: state.items,
    count: cartCount(state),
    subtotalCents: cartSubtotalCents(state),
    dispatch,
  };
}
```

- [ ] **Step 2: Commit.**
```bash
git add apps/fattamano/src/lib/cart/useCart.ts
git commit -m "feat(fattamano): useCart hook"
```

### Task 5.3: AddToCartButton, CartButton, CartDrawer

**Files:** Create `apps/fattamano/src/components/cart/AddToCartButton.tsx`, `CartButton.tsx`, `CartDrawer.tsx`

- [ ] **Step 1: Create `AddToCartButton.tsx`** (revalidates live availability on mount; falls back to "sold out"):

```tsx
import { useEffect, useState } from 'react';
import type { CartItem } from '../../lib/types';
import { dispatch } from '../../lib/cart/cartStore';

interface Props {
  item: CartItem; // qty defaults to 1 when added
  initialAvailable: boolean;
}

export default function AddToCartButton({ item, initialAvailable }: Props) {
  const [available, setAvailable] = useState(initialAvailable);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/availability?ids=${encodeURIComponent(item.productId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((rows: { _id: string; status: string; stock: number }[] | null) => {
        if (!active || !rows) return;
        const row = rows.find((x) => x._id === item.productId);
        if (row) setAvailable(row.status === 'available' && row.stock > 0);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [item.productId]);

  if (!available) {
    return (
      <span className="inline-block bg-ft-smudge text-ft-paper font-display px-6 py-3 text-lg">
        sold out
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        dispatch({ type: 'add', item: { ...item, qty: 1 } });
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
      className="inline-block bg-ft-shout text-ft-paper font-display px-6 py-3 text-lg hover:bg-ft-ink transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ft-ink focus-visible:outline-offset-2"
    >
      {added ? 'added ✓' : 'add to cart'}
    </button>
  );
}
```

- [ ] **Step 2: Create `CartButton.tsx`** (header button + drawer open state via a window event):

```tsx
import { useCart } from '../../lib/cart/useCart';

export default function CartButton() {
  const { count } = useCart();
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('ft-cart-open'))}
      className="relative font-body text-sm text-ft-ink hover:text-ft-shout"
      aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
    >
      cart{count > 0 ? ` (${count})` : ''}
    </button>
  );
}
```

- [ ] **Step 3: Create `CartDrawer.tsx`** (listens for `ft-cart-open`, lists items, links to `/checkout`):

```tsx
import { useEffect, useState } from 'react';
import { useCart } from '../../lib/cart/useCart';

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CartDrawer() {
  const { items, subtotalCents, dispatch } = useCart();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('ft-cart-open', onOpen);
    return () => window.removeEventListener('ft-cart-open', onOpen);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-label="Cart">
      <div className="absolute inset-0 bg-ft-ink/40" onClick={() => setOpen(false)} />
      <aside className="relative bg-ft-paper w-full max-w-md h-full p-6 overflow-y-auto border-l-2 border-ft-ink">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display text-2xl">your cart</h2>
          <button onClick={() => setOpen(false)} aria-label="Close cart" className="text-ft-smudge hover:text-ft-shout text-xl">×</button>
        </div>

        {items.length === 0 ? (
          <p className="font-body text-ft-smudge">nothing in here yet.</p>
        ) : (
          <>
            <ul className="space-y-4">
              {items.map((i) => (
                <li key={i.productId} className="flex justify-between items-center gap-3">
                  <div>
                    <p className="font-body text-ft-ink">{i.title}</p>
                    <p className="font-body text-sm text-ft-smudge">{money(i.priceCents)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={i.qty}
                      onChange={(e) => dispatch({ type: 'setQty', productId: i.productId, qty: parseInt(e.target.value || '0', 10) })}
                      className="w-14 border border-ft-ink px-2 py-1 font-body"
                      aria-label={`Quantity for ${i.title}`}
                    />
                    <button onClick={() => dispatch({ type: 'remove', productId: i.productId })} aria-label={`Remove ${i.title}`} className="text-ft-smudge hover:text-ft-shout">remove</button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-8 border-t-2 border-ft-ink pt-4">
              <p className="flex justify-between font-display text-lg">
                <span>subtotal</span><span>{money(subtotalCents)}</span>
              </p>
              <p className="font-body text-sm text-ft-smudge mt-1">shipping calculated at checkout</p>
              <a href="/checkout" className="mt-4 block text-center bg-ft-shout text-ft-paper font-display px-6 py-3 text-lg hover:bg-ft-ink transition-colors">
                checkout
              </a>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
```

- [ ] **Step 4: Build.** Run: `npm run build:fattamano`. Expected: typechecks (components compile; not yet mounted).

- [ ] **Step 5: Commit.**
```bash
git add apps/fattamano/src/components/cart/
git commit -m "feat(fattamano): cart UI components"
```

---

## Milestone 6 — Checkout endpoint + embed page

### Task 6.1: `/api/checkout`

**Files:** Create `apps/fattamano/src/pages/api/checkout.ts`

- [ ] **Step 1: Create it.** Verifies prices/stock server-side, creates the embedded session, writes the idempotency doc.

```ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { getStripe } from '../../lib/server/stripe';
import { sanityWriteFetch, sanityWriteClient } from '../../lib/server/sanityWrite';
import { queries } from '@lakeshore/shared-ui/sanity';
import { normalizeCartItems, buildOrderLines, BadCartError } from '../../lib/commerce/validateCart';
import { allowedCountries } from '../../lib/commerce/shipping';
import type { ProductRow, FattamanoSettings } from '../../lib/types';

const SITE = 'https://fattamano.com';

export const POST: APIRoute = async ({ request }) => {
  let items;
  try {
    items = normalizeCartItems(await request.json());
  } catch (e) {
    const msg = e instanceof BadCartError ? e.message : 'Invalid request';
    return Response.json({ error: msg }, { status: 400 });
  }

  // Authoritative product data (no CDN -> fresh stock).
  const ids = items.map((i) => i.productId);
  const rows = await sanityWriteFetch<ProductRow[]>(queries.fattamanoProductsByIds, { ids });
  const { lines, unavailable } = buildOrderLines(items, rows);
  if (unavailable.length) {
    return Response.json({ error: 'Some items are unavailable', unavailable }, { status: 409 });
  }

  const settings = await sanityWriteFetch<FattamanoSettings>(queries.fattamanoSettings);
  const zones = settings?.shippingZones ?? [];
  const countries = allowedCountries(zones);
  if (!countries.length) {
    return Response.json({ error: 'Shipping not configured' }, { status: 500 });
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    mode: 'payment',
    line_items: lines.map((l) => ({
      quantity: l.qty,
      price_data: {
        currency: 'usd',
        unit_amount: l.unitAmountCents,
        product_data: { name: l.title },
      },
    })),
    shipping_address_collection: { allowed_countries: countries as any },
    permissions: { update_shipping_details: 'server_only' },
    // Placeholder rate; replaced live by /api/calculate-shipping-options.
    shipping_options: [
      {
        shipping_rate_data: {
          display_name: 'Shipping',
          type: 'fixed_amount',
          fixed_amount: { amount: 0, currency: 'usd' },
        },
      },
    ],
    return_url: `${SITE}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
  });

  // Idempotency + cart source for the webhook. _id = Stripe session id.
  await sanityWriteClient().createIfNotExists({
    _id: session.id,
    _type: 'fattamanoCheckoutSession',
    items: lines.map((l) => ({ _key: l.productId, productId: l.productId, qty: l.qty })),
    status: 'pending',
    createdAt: new Date().toISOString(),
  } as any);

  return Response.json({ clientSecret: session.client_secret });
};
```
> **Verify at implementation:** the exact shape of `permissions.update_shipping_details` and `shipping_options` for embedded mode against the custom-shipping-options doc (Context7). The pure logic (`buildOrderLines`, `allowedCountries`) is already tested; only the Stripe call shape needs confirming.

- [ ] **Step 2: Build.** Run: `npm run build:fattamano`. Expected: typechecks. (Stripe types may want `as any` on `allowed_countries`/`shipping_options` — acceptable, noted.)

- [ ] **Step 3: Commit.**
```bash
git add apps/fattamano/src/pages/api/checkout.ts
git commit -m "feat(fattamano): /api/checkout creates embedded session from verified prices"
```

### Task 6.2: Checkout embed component + page

**Files:** Create `apps/fattamano/src/components/checkout/CheckoutEmbed.tsx`, `apps/fattamano/src/pages/checkout/index.astro`

- [ ] **Step 1: Create `CheckoutEmbed.tsx`:**

```tsx
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { useCallback } from 'react';
import { getSnapshot } from '../../lib/cart/cartStore';

interface Props {
  publishableKey: string;
}

const stripePromiseCache: { p?: ReturnType<typeof loadStripe> } = {};

export default function CheckoutEmbed({ publishableKey }: Props) {
  const stripePromise = (stripePromiseCache.p ??= loadStripe(publishableKey));

  const fetchClientSecret = useCallback(async () => {
    const items = getSnapshot().items.map((i) => ({ productId: i.productId, qty: i.qty }));
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items),
    });
    if (!res.ok) throw new Error('Could not start checkout');
    const { clientSecret } = await res.json();
    return clientSecret as string;
  }, []);

  // Stripe calls this when the customer enters/changes their shipping address.
  const onShippingDetailsChange = useCallback(async (event: any) => {
    const res = await fetch('/api/calculate-shipping-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checkoutSessionId: event.checkoutSessionId,
        shippingDetails: event.shippingDetails,
      }),
    });
    if (!res.ok) return { type: 'reject' };
    return { type: 'accept' };
  }, []);

  return (
    <EmbeddedCheckoutProvider
      stripe={stripePromise}
      options={{ fetchClientSecret, onShippingDetailsChange } as any}
    >
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}
```
> **Verify at implementation:** confirm `onShippingDetailsChange` is accepted by `EmbeddedCheckoutProvider` options and its event/return shape against the embedded custom-shipping-options doc (Context7). If the installed `@stripe/react-stripe-js` exposes it differently, adjust this thin wrapper — the server endpoint contract stays the same.

- [ ] **Step 2: Create `apps/fattamano/src/pages/checkout/index.astro`:**

```astro
---
export const prerender = false;
import BaseLayout from '../../layouts/BaseLayout.astro';
import CheckoutEmbed from '../../components/checkout/CheckoutEmbed.tsx';

const publishableKey = import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
---
<BaseLayout title="checkout" description="Complete your fattamano order.">
  <section class="max-w-3xl mx-auto px-6 py-12">
    <a href="/things" class="inline-block mb-8 font-body text-sm text-ft-smudge hover:text-ft-shout">← keep shopping</a>
    {publishableKey
      ? <CheckoutEmbed client:only="react" publishableKey={publishableKey} />
      : <p class="font-body text-ft-shout">Checkout is temporarily unavailable.</p>}
  </section>
</BaseLayout>
```
> `client:only="react"` because the cart lives in `localStorage` (browser-only) — no SSR of the embed.

- [ ] **Step 3: Build.** Run: `npm run build:fattamano`. Expected: typechecks.

- [ ] **Step 4: Commit.**
```bash
git add apps/fattamano/src/components/checkout/CheckoutEmbed.tsx apps/fattamano/src/pages/checkout/index.astro
git commit -m "feat(fattamano): embedded checkout page"
```

---

## Milestone 7 — Dynamic shipping endpoint

### Task 7.1: `/api/calculate-shipping-options`

**Files:** Create `apps/fattamano/src/pages/api/calculate-shipping-options.ts`

- [ ] **Step 1: Create it** (pure zone lookup is already tested; this is the Stripe glue):

```ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { getStripe } from '../../lib/server/stripe';
import { sanityWriteFetch } from '../../lib/server/sanityWrite';
import { queries } from '@lakeshore/shared-ui/sanity';
import { resolveShippingOption } from '../../lib/commerce/shipping';
import type { FattamanoSettings } from '../../lib/types';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  const sessionId = body?.checkoutSessionId;
  const country = body?.shippingDetails?.address?.country;
  if (typeof sessionId !== 'string') {
    return Response.json({ type: 'reject' }, { status: 400 });
  }

  const settings = await sanityWriteFetch<FattamanoSettings>(queries.fattamanoSettings);
  const option = resolveShippingOption(country ?? '', settings?.shippingZones ?? []);
  if (!option) {
    return Response.json({ type: 'reject', message: 'We can’t ship there yet.' }, { status: 200 });
  }

  await getStripe().checkout.sessions.update(sessionId, {
    shipping_options: [
      {
        shipping_rate_data: {
          display_name: `Shipping — ${option.label}`,
          type: 'fixed_amount',
          fixed_amount: { amount: option.rateCents, currency: 'usd' },
        },
      },
    ],
  } as any);

  return Response.json({ type: 'accept' });
};
```
> **Verify at implementation:** whether `sessions.update` also needs `collected_information.shipping_details` echoed back for embedded custom shipping (per the doc). The zone→rate decision is already unit-tested; only the update payload shape needs confirming.

- [ ] **Step 2: Build.** Run: `npm run build:fattamano`. Expected: typechecks.

- [ ] **Step 3: Commit.**
```bash
git add apps/fattamano/src/pages/api/calculate-shipping-options.ts
git commit -m "feat(fattamano): dynamic zone shipping endpoint"
```

---

## Milestone 8 — Webhook + availability

### Task 8.1: `/api/availability`

**Files:** Create `apps/fattamano/src/pages/api/availability.ts`

- [ ] **Step 1: Create it** (public; fresh-ish stock for the static catalog). **Security: uses the PUBLIC read client — never the write token — because this endpoint is unauthenticated.**

```ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { sanityClient, queries } from '../../lib/sanity';

export const GET: APIRoute = async ({ url }) => {
  const ids = (url.searchParams.get('ids') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100); // bound the query
  if (!ids.length) return Response.json([]);
  const rows = await sanityClient.fetch<{ _id: string; status: string; stock: number }[]>(
    queries.fattamanoAvailabilityByIds,
    { ids }
  );
  return new Response(JSON.stringify(rows), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=15' },
  });
};
```
> Uses the public CDN read client (`src/lib/sanity.ts`). Availability may lag real stock by up to ~60s (CDN) — acceptable because **checkout re-validates stock server-side with the no-CDN client** before charging. The `ids` param is GROQ-parameterized (`$ids`), so no query injection. Read-only projection of non-sensitive fields, bounded to 100 ids.

- [ ] **Step 2: Commit.**
```bash
git add apps/fattamano/src/pages/api/availability.ts
git commit -m "feat(fattamano): live availability endpoint"
```

### Task 8.2: `/api/stripe-webhook`

**Files:** Create `apps/fattamano/src/pages/api/stripe-webhook.ts`

- [ ] **Step 1: Create it.** Verifies signature on the **raw** body, then transactionally decrements stock and flips the doc to `fulfilled` (idempotent).

```ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { getStripe } from '../../lib/server/stripe';
import { sanityWriteFetch, sanityWriteClient } from '../../lib/server/sanityWrite';
import { requireServerEnv } from '../../lib/server/env';
import { queries } from '@lakeshore/shared-ui/sanity';
import { planStockDecrements } from '../../lib/commerce/stock';
import type { ProductRow } from '../../lib/types';

export const POST: APIRoute = async ({ request }) => {
  const stripe = getStripe();
  const sig = request.headers.get('stripe-signature') || '';
  const raw = await request.text(); // RAW body — required for signature verification

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, requireServerEnv('STRIPE_WEBHOOK_SECRET'));
  } catch {
    return new Response('Bad signature', { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return new Response('ignored', { status: 200 });
  }
  const session = event.data.object as any;
  if (session.payment_status !== 'paid') return new Response('not paid', { status: 200 });

  const client = sanityWriteClient();
  const doc = await sanityWriteFetch<{ _id: string; _rev: string; status: string; items: { productId: string; qty: number }[] } | null>(
    `*[_type == "fattamanoCheckoutSession" && _id == $id][0]{ _id, _rev, status, items }`,
    { id: session.id }
  );
  if (!doc || doc.status === 'fulfilled') {
    return new Response('already handled', { status: 200 }); // idempotent fast path
  }

  const ids = doc.items.map((i) => i.productId);
  const rows = await sanityWriteFetch<ProductRow[]>(queries.fattamanoProductsByIds, { ids });
  const changes = planStockDecrements(doc.items, rows);

  // One transaction: all decrements + flip to fulfilled, GUARDED by the doc's
  // revision (ifRevisionId). If a concurrent duplicate delivery already flipped
  // it, the revision won't match and the ENTIRE transaction is rejected — so
  // stock is never decremented twice. This closes the read-check-then-write race
  // that a plain status check leaves open (Stripe can deliver an event >once).
  try {
    let tx = client.transaction();
    for (const c of changes) {
      tx = tx.patch(c.productId, (p) =>
        p.set({ stock: c.newStock, ...(c.soldOut ? { status: 'sold_out' } : {}) })
      );
    }
    tx = tx.patch(doc._id, (p) => p.ifRevisionId(doc._rev).set({ status: 'fulfilled' }));
    await tx.commit();
  } catch (err: any) {
    // Revision mismatch / 409 === another delivery won the race -> already handled.
    const msg = String(err?.message || '');
    if (err?.statusCode === 409 || msg.toLowerCase().includes('revision')) {
      return new Response('already handled (raced)', { status: 200 });
    }
    return new Response('error', { status: 500 }); // real error -> let Stripe retry
  }

  return new Response('ok', { status: 200 });
};
```

- [ ] **Step 2: Ensure the raw body reaches us.** Astro's `request.text()` gives the raw body for API routes (no global parser), so no extra config is normally needed. If a future middleware pre-reads the body, add a note in `vercel.json`. Verify during M10 E2E.

- [ ] **Step 3: Build.** Run: `npm run build:fattamano`. Expected: typechecks.

- [ ] **Step 4: Commit.**
```bash
git add apps/fattamano/src/pages/api/stripe-webhook.ts
git commit -m "feat(fattamano): stripe webhook decrements stock (transactional + idempotent)"
```

---

## Milestone 9 — Wire the UI

### Task 9.1: Product detail page

**Files:** Modify `apps/fattamano/src/pages/things/[slug].astro`

- [ ] **Step 1:** Add `_id`, `stock` to the `getStaticPaths` query usage (already in the query from M2) and compute availability. Replace the `<BuyButton .../>` block (lines ~83-90) with logic: if `full.buyUrl` → keep `BuyButton`; else → `AddToCartButton` island.

Add imports at top of the frontmatter:
```astro
import AddToCartButton from '../../components/cart/AddToCartButton.tsx';
```
Replace the buy block:
```astro
        <div class="mt-8">
          {full.buyUrl ? (
            <BuyButton status={full.status} buyUrl={full.buyUrl} title={full.title} contactEmail={contactEmail} />
          ) : (
            <AddToCartButton
              client:visible
              initialAvailable={full.status === 'available' && (full.stock ?? 0) > 0}
              item={{
                productId: full._id,
                slug: full.slug.current,
                title: full.title,
                priceCents: full.priceCents ?? 0,
                image: images[0] ?? null,
                qty: 1,
              }}
            />
          )}
        </div>
```

- [ ] **Step 2: Build.** Run: `npm run build:fattamano`. Expected: typechecks.

- [ ] **Step 3: Commit.**
```bash
git add apps/fattamano/src/pages/things/[slug].astro
git commit -m "feat(fattamano): add-to-cart on product detail"
```

### Task 9.2: Navigation cart button + drawer mount

**Files:** Modify `apps/fattamano/src/components/Navigation.astro`, `apps/fattamano/src/layouts/BaseLayout.astro`

- [ ] **Step 1:** In `Navigation.astro`, import and render the cart button island in the nav bar:
```astro
import CartButton from './cart/CartButton.tsx';
```
Add `<CartButton client:load />` in the nav links area (match existing markup placement).

- [ ] **Step 2:** In `BaseLayout.astro`, mount the drawer once near the end of `<body>`:
```astro
import CartDrawer from '../components/cart/CartDrawer.tsx';
```
Add `<CartDrawer client:load />` before `</body>`.

- [ ] **Step 3: Build + manual check.** Run: `npm run build:fattamano`, then `npm run dev:fattamano`, open the site, add an item on a product page, confirm the cart count updates and the drawer opens.

- [ ] **Step 4: Commit.**
```bash
git add apps/fattamano/src/components/Navigation.astro apps/fattamano/src/layouts/BaseLayout.astro
git commit -m "feat(fattamano): cart button in nav + drawer in layout"
```

### Task 9.3: Catalog cards reflect availability (optional but recommended)

**Files:** Modify `apps/fattamano/src/components/ProductCard.astro`

- [ ] **Step 1:** If the card shows a CTA, gate it the same way (external `buyUrl` → link; else an `AddToCartButton` island with `client:visible`). If the card is purely a link to the detail page, skip — availability is enforced on detail + checkout. Decide based on current card markup; keep it minimal.

- [ ] **Step 2: Build + commit** (if changed):
```bash
git add apps/fattamano/src/components/ProductCard.astro
git commit -m "feat(fattamano): card-level add-to-cart"
```

### Task 9.4: Return page

**Files:** Create `apps/fattamano/src/pages/checkout/return.astro`

- [ ] **Step 1: Create it** (SSR; retrieves session status, clears cart on success):

```astro
---
export const prerender = false;
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getStripe } from '../../lib/server/stripe';

const sessionId = Astro.url.searchParams.get('session_id');
let paid = false;
if (sessionId) {
  try {
    const s = await getStripe().checkout.sessions.retrieve(sessionId);
    paid = s.payment_status === 'paid' || s.status === 'complete';
  } catch {}
}
---
<BaseLayout title={paid ? 'thank you' : 'order status'} description="Order confirmation.">
  <section class="max-w-2xl mx-auto px-6 py-20 text-center">
    {paid ? (
      <>
        <h1 class="font-display text-big">thank you 🎉</h1>
        <p class="font-body text-ft-ink mt-4">your order is in. Wilma will pack it by hand and ship it your way.</p>
        <a href="/things" class="inline-block mt-8 bg-ft-shout text-ft-paper font-display px-6 py-3 text-lg hover:bg-ft-ink transition-colors">back to things</a>
        <script is:inline>
          try { localStorage.removeItem('ft_cart_v1'); } catch (e) {}
        </script>
      </>
    ) : (
      <>
        <h1 class="font-display text-big">still processing…</h1>
        <p class="font-body text-ft-ink mt-4">if you were charged, you’ll get an email receipt. Refresh in a moment.</p>
      </>
    )}
  </section>
</BaseLayout>
```
> The `ft_cart_v1` key must match `cartStore.ts`. Clearing via `localStorage.removeItem` is simplest; other open tabs sync via the `storage` event.

- [ ] **Step 2: Build + commit.**
```bash
git add apps/fattamano/src/pages/checkout/return.astro
git commit -m "feat(fattamano): checkout return/thank-you page"
```

---

## Milestone 10 — Config, security, go-live

### Task 10.1: Stripe + Sanity setup (test mode)

- [ ] **Step 1:** In Stripe Dashboard (test mode): copy `pk_test_...` and `sk_test_...`. Create a write-scoped Sanity token in Sanity manage (Editor/write).
- [ ] **Step 2:** Add to Vercel (project `madebylakeshore-website-fattamano`, Production + Preview), via `npx vercel env add` from `apps/fattamano`:
  - `STRIPE_SECRET_KEY` (test), `PUBLIC_STRIPE_PUBLISHABLE_KEY` (test), `SANITY_WRITE_TOKEN`.
  - `STRIPE_WEBHOOK_SECRET` — fill after Step 4.
- [ ] **Step 3:** Local `.env` in `apps/fattamano` with the same (test) values for `npm run dev:fattamano`.
- [ ] **Step 4:** Run `stripe listen --forward-to localhost:4324/api/stripe-webhook` (Stripe CLI); copy the `whsec_...` it prints into `STRIPE_WEBHOOK_SECRET` (local + Vercel). For shipping callback forwarding, the embedded checkout calls `/api/calculate-shipping-options` directly over HTTP (no CLI needed).

### Task 10.2: End-to-end in test mode

- [ ] **Step 1:** `npm run dev:fattamano`. Add 2+ items to cart → drawer → checkout.
- [ ] **Step 2:** Confirm Embedded Checkout renders **in-page** (not a redirect). Enter a US address → see the US zone rate; switch to a shortlist intl address → rate updates. Enter an unsupported country → it's not selectable / rejected.
- [ ] **Step 3:** Pay with `4242 4242 4242 4242`. Land on `/checkout/return` thank-you; cart clears.
- [ ] **Step 4:** Confirm in Studio: the purchased product's `stock` dropped by the bought qty; an item taken to 0 shows `sold_out`; an `Orders (internal)` doc exists with status `fulfilled`.
- [ ] **Step 5:** Re-send the same `checkout.session.completed` from the Stripe CLI (`stripe events resend <id>`); confirm stock does **not** drop again (idempotency).
- [ ] **Step 6:** Run the full unit suite: `npm run test --workspace=apps/fattamano` → all pass.

### Task 10.3: Security review (REQUIRED before live keys)

- [ ] **Step 1:** Dispatch the **security-veteran-reviewer** agent over `src/pages/api/checkout.ts`, `calculate-shipping-options.ts`, `stripe-webhook.ts`, `availability.ts`, and `src/lib/server/*`. Focus: price/stock/shipping computed server-side only; webhook signature on raw body; no secret in the client bundle (`grep -r STRIPE_SECRET_KEY dist/` after build returns nothing); write-token least privilege; idempotency; input validation; no PII persisted.
- [ ] **Step 2:** Triage findings with the `superpowers:receiving-code-review` skill; fix high-severity items; re-run tests + build. Commit fixes.

### Task 10.4: Go live

- [ ] **Step 1:** Swap Vercel env to live Stripe keys (`sk_live`, `pk_live`). In Stripe (live mode) add a webhook endpoint → `https://fattamano.com/api/stripe-webhook` for `checkout.session.completed`; copy its `whsec_...` into `STRIPE_WEBHOOK_SECRET` (Production).
- [ ] **Step 2:** Set real shipping zones/rates + stock in Studio (Wilma).
- [ ] **Step 3:** Merge `feat/fattamano-commerce` → `main` (PR). Vercel auto-deploys.
- [ ] **Step 4:** Live smoke: one real low-value purchase end-to-end; confirm stock decrement + email receipt; refund it in Stripe.
- [ ] **Step 5:** Update `apps/fattamano/DEPLOYMENT.md` and the spec status to **Shipped**.

---

## Security notes & residual risks (threat model)

**Enforced (must hold — the security-review gate in 10.3 checks these):**
1. **Price/stock integrity:** charged prices and purchasability are computed server-side in `buildOrderLines` from a **no-CDN fresh read** (`fattamanoProductsByIds` via the write client) — the browser only sends `{productId, qty}`. A tampered cart can at most be rejected.
2. **Webhook authenticity + idempotency:** signature verified on the **raw** body; stock decrement + `fulfilled` flip happen in **one revision-guarded transaction**, so duplicate/concurrent deliveries can't double-decrement.
3. **Secret hygiene:** `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `SANITY_WRITE_TOKEN` are imported **only** by `src/lib/server/*` and `src/pages/api/*` (server-rendered). `.tsx` islands import only `cartStore`/`useCart`/`types` — never `server/*`. Verify post-build: `npm run build:fattamano && grep -rE 'sk_(test|live)|SANITY_WRITE_TOKEN' apps/fattamano/dist apps/fattamano/.vercel/output/static 2>/dev/null` returns nothing. The only client-side Stripe value is `PUBLIC_STRIPE_PUBLISHABLE_KEY`.
4. **Least privilege:** the public `/api/availability` uses the **public read client**, not the write token. The write token is used only by `/api/checkout` (create idempotency doc) and `/api/stripe-webhook` (decrement).
5. **PII minimization:** the internal `fattamanoCheckoutSession` doc stores only `{items, status}` — no name/email/address. All PII lives in Stripe.

**Accepted at v1 (documented, low-severity):**
- **Shipping-rate trust boundary:** the zone rate is derived from the customer-entered country forwarded by Stripe's embedded checkout (the documented embedded custom-shipping flow prices the *in-progress* address before it's committed to the session, so the callback must read it from the event). A determined buyer could understate their zone for a few dollars off shipping. Mitigation: **Wilma sees the real ship-to address in Stripe before she ships**, and the dollar value is small. *Optional later hardening:* at fulfillment, compare the session's final shipping-country against the paid shipping option and flag mismatches.
- **Oversell-by-one:** no stock holds — two buyers can take the last unit concurrently (clamped at 0). Per spec; resolved by refund/remake.

**Deferred (note now, build later):**
- **Rate limiting:** `/api/checkout`, `/api/calculate-shipping-options`, `/api/availability` are unauthenticated and unthrottled (same posture as the existing chat endpoint). Inputs are bounded (≤100 ids, ≤50 lines, ≤50 qty/line). Add Upstash rate limiting if abused.
- **Pending-doc cleanup:** abandoned `fattamanoCheckoutSession` docs (`status: pending`) accrue from un-finished checkouts. Add a scheduled job to delete `pending` docs older than ~7 days once volume warrants.

## Self-Review (completed by author)

- **Spec coverage:** cart (M5) · embedded checkout (M6) · dynamic zone shipping (M7) · stock tracking + auto-sold-out (M1/M8) · idempotency via `fattamanoCheckoutSession` (M1.3/M6.1/M8.2) · US+shortlist via derived `allowedCountries` (M3.1/M6.1) · server-side price/stock enforcement (M3.2/M6.1) · security review gate (M10.3) · Studio-editable zones+stock (M1) · DAOS reuse (pure logic in `lib/commerce`, no fattamano-specifics). All acceptance criteria map to a task.
- **No placeholders:** every code step has full code; the only "verify at implementation" notes are on third-party Stripe SDK call-shapes (checkout session create/update options, embedded `onShippingDetailsChange`), with the tested pure logic isolated from them.
- **Type consistency:** `ProductRow`, `CartItem`, `ShippingZone`, `FattamanoSettings` defined in `types.ts` (M2.2) and used consistently; `normalizeCartItems`/`buildOrderLines`/`planStockDecrements`/`resolveShippingOption`/`allowedCountries` names match across logic, endpoints, and tests; cart key `ft_cart_v1` consistent between `cartStore.ts` and `return.astro`.
- **Security pass (per request):** found + fixed three issues inline — (1) `/api/availability` was using the write token on a public endpoint → switched to the public read client; (2) the webhook's read-check-then-write idempotency had a TOCTOU race → made the fulfill flip revision-guarded (`ifRevisionId`) so duplicate deliveries can't double-decrement; (3) added a distinct-line-count cap to `normalizeCartItems`. Documented the shipping-rate trust boundary, oversell-by-one, and deferred rate-limiting/cleanup in **Security notes** above. The security-review agent (Task 10.3) is a hard gate before live keys.

---

## Implementation amendments (applied during execution — code is the source of truth)

The inline code in some tasks above was refined during execution; the committed code on `feat/fattamano-commerce` supersedes it where they differ:

- **Task 3.2 (`validateCart.ts`):** `normalizeCartItems` now collapses duplicate `productId`s by summing qty (closes a split-line oversell + decrement race); `buildOrderLines` rejects non-integer `priceCents`. (Synced into the Task 3.2 code above + tests; commit `cf3a647`.)
- **Tasks 6.1 / 6.2 / 7.1 (Stripe glue):** verified against installed SDKs (`stripe@17.7.0`, `@stripe/react-stripe-js@3.10.0`) + Stripe docs. Real-API deltas applied: `ui_mode:'embedded'` confirmed; `permissions.update_shipping_details` carried via a whole-literal cast (absent from SDK types); `onShippingDetailsChange` is a real typed provider option (dropped `as any`); reject uses `errorMessage` not `message`; `sessions.update` also echoes `collected_information.shipping_details`. Commits `06caed9`, `ef73f90`, `a47f717`.
- **Security review (commit `b3c2932`):** (a) `apps/fattamano/vercel.json` CSP now allowlists Stripe (`script-src js.stripe.com`, `connect-src api.stripe.com m.stripe.network`, `frame-src js.stripe.com hooks.stripe.com`), keeping `frame-ancestors 'none'` — **required** or Embedded Checkout is blocked in prod. (b) `/api/calculate-shipping-options` now requires a known `pending fattamanoCheckoutSession` doc before calling `sessions.update`.
- **Deferred / out-of-scope (flagged, not in this branch):** `src/pages/api/og.ts` (pre-existing SEO route) interpolates query params into satori markup unescaped/unbounded — low-severity, fix in a separate change. Rate limiting + pending-doc cleanup remain deferred per Security notes.
