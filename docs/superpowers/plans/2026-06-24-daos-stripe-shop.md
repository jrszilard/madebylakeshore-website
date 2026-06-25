# DAOS On-Site Stripe Shop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give DAOS (`apps/designandotherstories`) a real on-site Stripe Embedded Checkout — ported from `apps/fattamano` — while turning the gallery pages into a pure art house that links out to a structured shop.

**Architecture:** Copy fattamano's commerce stack (cart store, server-priced validation, Stripe Embedded Checkout, signature-verified webhook) into DAOS. Adapt for two differences: DAOS stores `price` in **USD dollars** (convert to integer cents server-side) and has **two product types** — `artwork` (originals, qty-1) and `shopProduct` (prints/cards, optional numeric stock) — behind one checkout, with a **type-aware** webhook. Gallery detail pages drop inline commerce for a single "Buy from shop" button; `/shop/[slug]` becomes the commerce surface for both types.

**Tech Stack:** Astro 4 (hybrid, Vercel serverless adapter), React 18 islands, Stripe Embedded Checkout, Sanity v5 (GROQ), vitest, Tailwind (`daos-*` tokens).

## Global Constraints

- DAOS is `output: 'hybrid'` with `@astrojs/vercel/serverless` (`maxDuration: 30`) — already configured; do not change.
- Dependencies (exact floors): `stripe@^17.0.0`, `@stripe/stripe-js@^4.0.0`, `@stripe/react-stripe-js@^3.0.0`, `vitest@^2.0.0` (dev).
- **Never** pass `payment_method_types` to any Stripe call (dynamic payment methods).
- Sanity `price` is **USD dollars**; Stripe `unit_amount` needs integer cents → `Math.round(price * 100)`, reject non-finite or ≤ 0.
- Originals (`artwork`) are qty-1 and unique; `shopProduct` may have numeric `stock` (decrement) or unset `stock` (unlimited / print-on-demand, never decremented).
- Stripe account: DAOS's **own** account; `STRIPE_SECRET_KEY` should be a **restricted key (`rk_`)**.
- localStorage cart key: `daos_cart_v1`.
- Tailwind: use `daos-*` tokens and existing `btn-warm` / `btn-outline` utility classes; match existing components (`PurchaseAction.astro`, `ShopCard.astro`). No emojis.
- Webhook reads the **raw** request body for signature verification.
- All API routes (`src/pages/api/*.ts`) and the checkout pages export `const prerender = false`.

---

### Task 1: Dependencies, vitest, and env scaffolding

**Files:**
- Modify: `apps/designandotherstories/package.json`
- Create: `apps/designandotherstories/vitest.config.ts`
- Create: `apps/designandotherstories/.env.example`

**Interfaces:**
- Produces: `npm run test --workspace=apps/designandotherstories` (vitest), the commerce dependencies, and a documented env var set used by all later tasks.

- [ ] **Step 1: Add deps + scripts to `apps/designandotherstories/package.json`**

In `"dependencies"` add (keep alphabetical with existing):
```json
"@stripe/react-stripe-js": "^3.0.0",
"@stripe/stripe-js": "^4.0.0",
"stripe": "^17.0.0"
```
In `"devDependencies"` add:
```json
"vitest": "^2.0.0"
```
In `"scripts"`, ensure `build` runs the type check and add test scripts:
```json
"build": "astro check && astro build",
"test": "vitest run",
"test:watch": "vitest"
```
(If `build` is already `astro build` only, prepend `astro check &&`.)

- [ ] **Step 2: Create `apps/designandotherstories/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 3: Create `apps/designandotherstories/.env.example`**

```bash
# Sanity (public)
PUBLIC_SANITY_PROJECT_ID=your_project_id
PUBLIC_SANITY_DATASET=production

# Sanity write token (server-only) — used for stock/sold writes + checkout idempotency
SANITY_WRITE_TOKEN=your_sanity_write_token

# Stripe — DAOS's OWN account (use a restricted key rk_ for the secret)
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=rk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Optional: absolute origin for Stripe return_url (defaults to https://designandotherstories.com)
DAOS_CHECKOUT_RETURN_ORIGIN=https://designandotherstories.com
```

- [ ] **Step 4: Install**

Run: `npm install`
Expected: completes; `apps/designandotherstories/node_modules/stripe` and `.../vitest` resolve.

- [ ] **Step 5: Verify vitest runs (no tests yet)**

Run: `npm run test --workspace=apps/designandotherstories`
Expected: vitest reports "No test files found" (exit 0 or the "no tests" notice) — confirms the runner is wired.

- [ ] **Step 6: Commit**

```bash
git add apps/designandotherstories/package.json apps/designandotherstories/vitest.config.ts apps/designandotherstories/.env.example package-lock.json
git commit -m "chore(daos): add Stripe deps, vitest, and shop env scaffolding"
```

---

### Task 2: Sanity schemas — shopProduct.stock, daosShopSettings, daosCheckoutSession

**Files:**
- Modify: `studio/schemas/documents/shopProduct.ts`
- Create: `studio/schemas/documents/daosShopSettings.ts`
- Create: `studio/schemas/documents/daosCheckoutSession.ts`
- Modify: `studio/schemas/index.ts`

**Interfaces:**
- Produces: `shopProduct.stock` (optional number); `daosShopSettings` singleton with `shippingZones[]{ label, countryCodes[], rateCents, freeShippingThresholdCents? }`; `daosCheckoutSession` doc (`_id` = Stripe session id, `items[]{ productId, type, qty }`, `subtotalCents`, `status`, `createdAt`).

- [ ] **Step 1: Add optional `stock` to `studio/schemas/documents/shopProduct.ts`**

Insert this field immediately after the `available` field (after its closing `}),`):
```ts
    defineField({
      name: 'stock',
      title: 'Stock (optional)',
      type: 'number',
      description:
        'Leave blank for unlimited / print-on-demand. Set a number for limited stock; it decrements on each sale and flips Available off at 0.',
      validation: (Rule) => Rule.min(0).integer(),
    }),
```

- [ ] **Step 2: Create `studio/schemas/documents/daosShopSettings.ts`**

```ts
import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'daosShopSettings',
  title: 'Shop Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Label',
      type: 'string',
      initialValue: 'Shop Settings',
      readOnly: true,
    }),
    defineField({
      name: 'shippingZones',
      title: 'Shipping Zones',
      type: 'array',
      description:
        'Flat shipping rate per zone. Typically one domestic zone (e.g. US) and one international zone. Free shipping kicks in when the order subtotal reaches the threshold.',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'label', title: 'Label', type: 'string', validation: (Rule) => Rule.required() },
            {
              name: 'countryCodes',
              title: 'Country Codes (ISO-3166-1 alpha-2, e.g. US, CA)',
              type: 'array',
              of: [{ type: 'string' }],
              validation: (Rule) => Rule.required().min(1),
            },
            {
              name: 'rateCents',
              title: 'Flat Rate (cents)',
              type: 'number',
              validation: (Rule) => Rule.required().min(0).integer(),
            },
            {
              name: 'freeShippingThresholdCents',
              title: 'Free Shipping Threshold (cents, optional)',
              type: 'number',
              validation: (Rule) => Rule.min(0).integer(),
            },
          ],
          preview: {
            select: { title: 'label', rate: 'rateCents' },
            prepare({ title, rate }) {
              return { title: title || 'Zone', subtitle: rate != null ? `$${(rate / 100).toFixed(2)}` : '' };
            },
          },
        },
      ],
    }),
  ],
  preview: { prepare() { return { title: 'Shop Settings' }; } },
});
```

- [ ] **Step 3: Create `studio/schemas/documents/daosCheckoutSession.ts`**

```ts
import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'daosCheckoutSession',
  title: 'Checkout Session (internal)',
  type: 'document',
  // Internal plumbing: idempotency + cart source for the Stripe webhook.
  fields: [
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'productId', title: 'Product ID', type: 'string' },
            { name: 'type', title: 'Type', type: 'string' },
            { name: 'qty', title: 'Qty', type: 'number' },
          ],
        },
      ],
    }),
    defineField({ name: 'subtotalCents', title: 'Subtotal (cents)', type: 'number' }),
    defineField({ name: 'status', title: 'Status', type: 'string' }),
    defineField({ name: 'createdAt', title: 'Created At', type: 'datetime' }),
  ],
  preview: {
    select: { id: '_id', status: 'status' },
    prepare({ id, status }) { return { title: id, subtitle: status }; },
  },
});
```

- [ ] **Step 4: Register both in `studio/schemas/index.ts`**

Import and add `daosShopSettings` and `daosCheckoutSession` to the exported schema array (follow the file's existing import + array pattern — mirror how `shopProduct` is imported and listed).

- [ ] **Step 5: Verify the studio builds**

Run: `npm run build --workspace=studio`
Expected: build succeeds with no schema/type errors.

- [ ] **Step 6: Commit**

```bash
git add studio/schemas/documents/shopProduct.ts studio/schemas/documents/daosShopSettings.ts studio/schemas/documents/daosCheckoutSession.ts studio/schemas/index.ts
git commit -m "feat(studio): shopProduct.stock + daosShopSettings + daosCheckoutSession schemas"
```

---

### Task 3: Shared-UI GROQ queries

**Files:**
- Modify: `packages/shared-ui/src/sanity.ts` (the `queries` object, starts line 72)
- Test: `apps/designandotherstories/test/queries.test.ts`

**Interfaces:**
- Produces: `queries.daosProductsByIds`, `queries.daosAvailabilityByIds`, `queries.daosShopSettings`, `queries.allForSaleArtworkSlugs`.
- Consumes: existing `queries.shopProductBySlug`, `queries.artworkBySlug`, `queries.allShopProductSlugs`.

- [ ] **Step 1: Write the failing test `apps/designandotherstories/test/queries.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { queries } from '@lakeshore/shared-ui/sanity';

describe('DAOS shop queries', () => {
  it('exposes the new shop queries as non-empty strings', () => {
    for (const k of ['daosProductsByIds', 'daosAvailabilityByIds', 'daosShopSettings', 'allForSaleArtworkSlugs']) {
      expect(typeof (queries as any)[k]).toBe('string');
      expect((queries as any)[k].length).toBeGreaterThan(0);
    }
  });
  it('daosProductsByIds filters both product types and selects price + stock', () => {
    expect(queries.daosProductsByIds).toContain('artwork');
    expect(queries.daosProductsByIds).toContain('shopProduct');
    expect(queries.daosProductsByIds).toContain('price');
    expect(queries.daosProductsByIds).toContain('stock');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=apps/designandotherstories -- queries`
Expected: FAIL (`daosProductsByIds` is undefined / not a string).

- [ ] **Step 3: Add the queries to `packages/shared-ui/src/sanity.ts`**

Inside the `queries` object (e.g. right after `allShopProductSlugs`), add:
```ts
  allForSaleArtworkSlugs: `*[_type == "artwork" && forSale == true]{ slug }`,

  // Authoritative server-side rows for checkout + webhook. Availability normalized
  // here; price stays in dollars and is converted to cents in buildOrderLines.
  daosProductsByIds: `*[_id in $ids && _type in ["artwork","shopProduct"]]{
    _id,
    _type,
    title,
    price,
    "available": select(
      _type == "artwork" => forSale == true && originalAvailable == true,
      _type == "shopProduct" => available == true,
      false
    ),
    "stock": stock
  }`,

  // Public live-availability check for Add-to-Cart buttons (read-only client).
  daosAvailabilityByIds: `*[_id in $ids && _type in ["artwork","shopProduct"]]{
    _id,
    "inStock": select(
      _type == "artwork" => forSale == true && originalAvailable == true,
      _type == "shopProduct" => available == true && (stock == null || stock > 0),
      false
    )
  }`,

  daosShopSettings: `*[_type == "daosShopSettings"][0]{
    shippingZones[]{ label, countryCodes, rateCents, freeShippingThresholdCents }
  }`,
```

Then add `stock,` to the existing `shopProductBySlug` projection (so the detail page reflects a limited-stock sold-out). Find the `shopProductBySlug: \`*[_type == "shopProduct" && slug.current == $slug][0] { ... }\`` query and add `stock,` alongside `price,`/`available,` in its projection.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace=apps/designandotherstories -- queries`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared-ui/src/sanity.ts apps/designandotherstories/test/queries.test.ts
git commit -m "feat(shared-ui): DAOS shop GROQ queries (products/availability/settings/slugs)"
```

---

### Task 4: Types + format

**Files:**
- Create: `apps/designandotherstories/src/lib/types.ts`
- Create: `apps/designandotherstories/src/lib/format.ts`
- Test: `apps/designandotherstories/test/format.test.ts`

**Interfaces:**
- Produces: `DaosProductType`, `ShippingZone`, `DaosShopSettings`, `CartItem`, `ProductRow` types; `formatMoneyCents(cents): string`.

- [ ] **Step 1: Write `apps/designandotherstories/src/lib/types.ts`**

```ts
export type DaosProductType = 'artwork' | 'shopProduct';

export interface ShippingZone {
  label: string;
  countryCodes: string[];
  rateCents: number;
  // When the cart subtotal (cents) reaches this, the zone ships free. Omit to
  // always charge the flat rate.
  freeShippingThresholdCents?: number;
}

export interface DaosShopSettings {
  shippingZones?: ShippingZone[];
}

// One line in the cart (client). `type` is convenience for the UI; the server
// re-derives it authoritatively from Sanity rows.
export interface CartItem {
  productId: string; // Sanity _id
  type: DaosProductType;
  slug: string;
  title: string;
  priceCents: number;
  qty: number;
}

// Authoritative product row fetched server-side at checkout/webhook.
// `price` is USD dollars (converted to cents in buildOrderLines). `available`
// is normalized in GROQ. `stock` is numeric for limited shopProducts, null for
// unlimited shopProducts, and absent/null for artwork.
export interface ProductRow {
  _id: string;
  _type: DaosProductType;
  title: string;
  price?: number;
  available: boolean;
  stock?: number | null;
}
```

- [ ] **Step 2: Write the failing test `apps/designandotherstories/test/format.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { formatMoneyCents } from '../src/lib/format';

describe('formatMoneyCents', () => {
  it('formats whole dollars', () => {
    expect(formatMoneyCents(1200)).toBe('$12.00');
  });
  it('formats cents', () => {
    expect(formatMoneyCents(1999)).toBe('$19.99');
  });
  it('handles zero', () => {
    expect(formatMoneyCents(0)).toBe('$0.00');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test --workspace=apps/designandotherstories -- format`
Expected: FAIL (`formatMoneyCents` not found).

- [ ] **Step 4: Write `apps/designandotherstories/src/lib/format.ts`**

```ts
export function formatMoneyCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test --workspace=apps/designandotherstories -- format`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/designandotherstories/src/lib/types.ts apps/designandotherstories/src/lib/format.ts apps/designandotherstories/test/format.test.ts
git commit -m "feat(daos): commerce types + money formatter"
```

---

### Task 5: Cart store + useCart hook

**Files:**
- Create: `apps/designandotherstories/src/lib/cart/cartStore.ts`
- Create: `apps/designandotherstories/src/lib/cart/useCart.ts`
- Test: `apps/designandotherstories/test/cart/cartStore.test.ts`

**Interfaces:**
- Consumes: `CartItem` (Task 4).
- Produces: `CartState`, `CartAction`, `cartReducer`, `dispatch`, `subscribe`, `getSnapshot`, `cartCount`, `cartSubtotalCents`, `useCart()`.

- [ ] **Step 1: Create `cartStore.ts` by copying fattamano's, with the key change**

Copy `apps/fattamano/src/lib/cart/cartStore.ts` to `apps/designandotherstories/src/lib/cart/cartStore.ts` verbatim, then change exactly one line:
```ts
const KEY = 'daos_cart_v1';
```
(fattamano's value is `'ft_cart_v1'`.) The `import type { CartItem } from '../types';` resolves to the DAOS `types.ts` from Task 4 — no other change.

- [ ] **Step 2: Create `useCart.ts`**

```ts
import { useSyncExternalStore } from 'react';
import { subscribe, getSnapshot, cartCount, cartSubtotalCents, dispatch } from './cartStore';

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
(If fattamano's `useCart.ts` differs, copy it instead and keep imports pointing at the DAOS `cartStore`.)

- [ ] **Step 3: Write the test `apps/designandotherstories/test/cart/cartStore.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { cartReducer, cartCount, cartSubtotalCents } from '../../src/lib/cart/cartStore';
import type { CartState } from '../../src/lib/cart/cartStore';
import type { CartItem } from '../../src/lib/types';

const item = (productId: string, priceCents: number, qty = 1): CartItem => ({
  productId, type: 'shopProduct', slug: productId, title: productId, priceCents, qty,
});
const empty: CartState = { items: [] };

describe('cartReducer', () => {
  it('adds a new item', () => {
    const s = cartReducer(empty, { type: 'add', item: item('a', 500) });
    expect(s.items).toHaveLength(1);
    expect(s.items[0].qty).toBe(1);
  });
  it('merges qty when adding an existing item', () => {
    let s = cartReducer(empty, { type: 'add', item: item('a', 500) });
    s = cartReducer(s, { type: 'add', item: item('a', 500) });
    expect(s.items).toHaveLength(1);
    expect(s.items[0].qty).toBe(2);
  });
  it('setQty to 0 removes the line', () => {
    let s = cartReducer(empty, { type: 'add', item: item('a', 500) });
    s = cartReducer(s, { type: 'setQty', productId: 'a', qty: 0 });
    expect(s.items).toHaveLength(0);
  });
  it('remove and clear work', () => {
    let s = cartReducer(empty, { type: 'add', item: item('a', 500) });
    s = cartReducer(s, { type: 'add', item: item('b', 700) });
    s = cartReducer(s, { type: 'remove', productId: 'a' });
    expect(s.items.map((i) => i.productId)).toEqual(['b']);
    expect(cartReducer(s, { type: 'clear' }).items).toEqual([]);
  });
});

describe('cart totals', () => {
  it('counts and subtotals', () => {
    const s: CartState = { items: [item('a', 500, 2), item('b', 700, 1)] };
    expect(cartCount(s)).toBe(3);
    expect(cartSubtotalCents(s)).toBe(1700);
  });
});
```

- [ ] **Step 4: Run the tests**

Run: `npm run test --workspace=apps/designandotherstories -- cartStore`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/designandotherstories/src/lib/cart apps/designandotherstories/test/cart
git commit -m "feat(daos): cart store + useCart hook (ported from fattamano)"
```

---

### Task 6: Shipping (verbatim) + type-aware fulfillment

**Files:**
- Create: `apps/designandotherstories/src/lib/commerce/shipping.ts`
- Create: `apps/designandotherstories/src/lib/commerce/stock.ts`
- Test: `apps/designandotherstories/test/commerce/shipping.test.ts`
- Test: `apps/designandotherstories/test/commerce/stock.test.ts`

**Interfaces:**
- Consumes: `ShippingZone`, `ProductRow`, `DaosProductType` (Task 4).
- Produces: `resolveShippingOption(country, zones, subtotalCents?)`, `allowedCountries(zones)`; `FulfillmentPatch`, `planFulfillment(items, rows)`.

- [ ] **Step 1: Create `shipping.ts` (verbatim copy)**

Copy `apps/fattamano/src/lib/commerce/shipping.ts` to `apps/designandotherstories/src/lib/commerce/shipping.ts` with no changes (its only import is `ShippingZone` from `../types`, which now resolves to DAOS types).

- [ ] **Step 2: Write `apps/designandotherstories/src/lib/commerce/stock.ts`**

```ts
import type { ProductRow, DaosProductType } from '../types';

export interface FulfillmentPatch {
  productId: string;
  set: Record<string, unknown>;
}

// Type-aware fulfillment: originals are unique (mark sold), shopProducts with a
// numeric stock decrement (and flip available off at 0); unlimited shopProducts
// (null/absent stock) are never written back.
export function planFulfillment(
  items: { productId: string; type: DaosProductType; qty: number }[],
  rows: ProductRow[]
): FulfillmentPatch[] {
  const byId = new Map(rows.map((r) => [r._id, r]));
  const patches: FulfillmentPatch[] = [];
  for (const item of items) {
    const row = byId.get(item.productId);
    if (!row) continue;
    if (row._type === 'artwork') {
      patches.push({ productId: item.productId, set: { originalAvailable: false } });
    } else if (typeof row.stock === 'number') {
      const newStock = Math.max(0, row.stock - item.qty);
      patches.push({
        productId: item.productId,
        set: { stock: newStock, ...(newStock === 0 ? { available: false } : {}) },
      });
    }
  }
  return patches;
}
```

- [ ] **Step 3: Write `apps/designandotherstories/test/commerce/shipping.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { resolveShippingOption, allowedCountries } from '../../src/lib/commerce/shipping';
import type { ShippingZone } from '../../src/lib/types';

const zones: ShippingZone[] = [
  { label: 'US', countryCodes: ['US'], rateCents: 800, freeShippingThresholdCents: 10000 },
  { label: 'International', countryCodes: ['GB', 'CA'], rateCents: 2500 },
];

describe('resolveShippingOption', () => {
  it('charges the flat domestic rate under the threshold', () => {
    expect(resolveShippingOption('US', zones, 5000)).toEqual({ label: 'US', rateCents: 800 });
  });
  it('ships free at/above the threshold', () => {
    expect(resolveShippingOption('US', zones, 10000)).toEqual({ label: 'US', rateCents: 0 });
  });
  it('charges international flat (no threshold)', () => {
    expect(resolveShippingOption('GB', zones, 99999)).toEqual({ label: 'International', rateCents: 2500 });
  });
  it('rejects unknown country and empty', () => {
    expect(resolveShippingOption('FR', zones, 5000)).toBeNull();
    expect(resolveShippingOption('', zones)).toBeNull();
  });
});

describe('allowedCountries', () => {
  it('unions and upper-cases zone codes', () => {
    expect(allowedCountries(zones).sort()).toEqual(['CA', 'GB', 'US']);
  });
});
```

- [ ] **Step 4: Write `apps/designandotherstories/test/commerce/stock.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { planFulfillment } from '../../src/lib/commerce/stock';
import type { ProductRow } from '../../src/lib/types';

const rows: ProductRow[] = [
  { _id: 'orig', _type: 'artwork', title: 'Original', price: 1200, available: true, stock: null },
  { _id: 'lim', _type: 'shopProduct', title: 'Limited Print', price: 40, available: true, stock: 3 },
  { _id: 'pod', _type: 'shopProduct', title: 'POD Card', price: 5, available: true, stock: null },
];

describe('planFulfillment', () => {
  it('marks an original sold (originalAvailable=false)', () => {
    expect(planFulfillment([{ productId: 'orig', type: 'artwork', qty: 1 }], rows)).toEqual([
      { productId: 'orig', set: { originalAvailable: false } },
    ]);
  });
  it('decrements a limited shopProduct', () => {
    expect(planFulfillment([{ productId: 'lim', type: 'shopProduct', qty: 1 }], rows)).toEqual([
      { productId: 'lim', set: { stock: 2 } },
    ]);
  });
  it('flips available off when limited stock hits 0', () => {
    expect(planFulfillment([{ productId: 'lim', type: 'shopProduct', qty: 3 }], rows)).toEqual([
      { productId: 'lim', set: { stock: 0, available: false } },
    ]);
  });
  it('never writes back an unlimited (null-stock) shopProduct', () => {
    expect(planFulfillment([{ productId: 'pod', type: 'shopProduct', qty: 9 }], rows)).toEqual([]);
  });
});
```

- [ ] **Step 5: Run the tests**

Run: `npm run test --workspace=apps/designandotherstories -- commerce/shipping commerce/stock`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/designandotherstories/src/lib/commerce/shipping.ts apps/designandotherstories/src/lib/commerce/stock.ts apps/designandotherstories/test/commerce/shipping.test.ts apps/designandotherstories/test/commerce/stock.test.ts
git commit -m "feat(daos): shipping resolver + type-aware fulfillment planner"
```

---

### Task 7: Cart validation (two types + dollars→cents)

**Files:**
- Create: `apps/designandotherstories/src/lib/commerce/validateCart.ts`
- Test: `apps/designandotherstories/test/commerce/validateCart.test.ts`

**Interfaces:**
- Consumes: `ProductRow`, `DaosProductType` (Task 4).
- Produces: `BadCartError`, `NormalizedItem`, `normalizeCartItems(body)`, `OrderLine` (with `type`), `Unavailable`, `cartSubtotalCents(lines)`, `buildOrderLines(items, rows)`.

- [ ] **Step 1: Write `apps/designandotherstories/src/lib/commerce/validateCart.ts`**

```ts
import type { ProductRow, DaosProductType } from '../types';

const MAX_QTY_PER_LINE = 50;
const MAX_LINES = 50; // bound work + idempotency doc size; abuse guard

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
  // Collapse duplicate productIds by summing qty so split lines can't oversell.
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
  type: DaosProductType;
  title: string;
  unitAmountCents: number;
  qty: number;
}

export interface Unavailable {
  productId: string;
  reason: 'missing' | 'not_available' | 'no_price' | 'out_of_stock';
}

export function cartSubtotalCents(lines: OrderLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitAmountCents * l.qty, 0);
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
    if (!row.available) {
      unavailable.push({ productId: item.productId, reason: 'not_available' });
      continue;
    }
    // DAOS stores price in USD dollars; Stripe needs integer cents.
    const unitAmountCents = Math.round((row.price ?? 0) * 100);
    if (!Number.isFinite(unitAmountCents) || unitAmountCents <= 0) {
      unavailable.push({ productId: item.productId, reason: 'no_price' });
      continue;
    }
    // Originals are unique: qty must be 1.
    if (row._type === 'artwork' && item.qty > 1) {
      unavailable.push({ productId: item.productId, reason: 'out_of_stock' });
      continue;
    }
    // Limited shopProducts must have enough stock; null stock = unlimited.
    if (row._type === 'shopProduct' && typeof row.stock === 'number' && row.stock < item.qty) {
      unavailable.push({ productId: item.productId, reason: 'out_of_stock' });
      continue;
    }
    lines.push({
      productId: row._id,
      type: row._type,
      title: row.title,
      unitAmountCents,
      qty: item.qty,
    });
  }
  return { lines, unavailable };
}
```

- [ ] **Step 2: Write the test `apps/designandotherstories/test/commerce/validateCart.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { normalizeCartItems, buildOrderLines, cartSubtotalCents } from '../../src/lib/commerce/validateCart';
import type { OrderLine } from '../../src/lib/commerce/validateCart';
import type { ProductRow } from '../../src/lib/types';

const ROWS: ProductRow[] = [
  { _id: 'orig', _type: 'artwork', title: 'Sunset', price: 1200, available: true, stock: null },
  { _id: 'sold', _type: 'artwork', title: 'Dawn', price: 900, available: false, stock: null },
  { _id: 'lim', _type: 'shopProduct', title: 'Print', price: 40, available: true, stock: 2 },
  { _id: 'pod', _type: 'shopProduct', title: 'Postcard', price: 4, available: true, stock: null },
];

describe('normalizeCartItems', () => {
  it('accepts a well-formed array and collapses duplicates', () => {
    expect(normalizeCartItems([{ productId: 'a', qty: 1 }, { productId: 'a', qty: 2 }])).toEqual([
      { productId: 'a', qty: 3 },
    ]);
  });
  it('rejects empty / bad qty / missing id', () => {
    expect(() => normalizeCartItems([])).toThrow();
    expect(() => normalizeCartItems([{ productId: 'a', qty: 0 }])).toThrow();
    expect(() => normalizeCartItems([{ productId: 'a', qty: 1.5 }])).toThrow();
    expect(() => normalizeCartItems([{ qty: 1 }])).toThrow();
  });
});

describe('buildOrderLines', () => {
  it('prices from authoritative dollars → integer cents, tags type', () => {
    const { lines, unavailable } = buildOrderLines(
      [{ productId: 'orig', qty: 1 }, { productId: 'pod', qty: 3 }],
      ROWS
    );
    expect(unavailable).toEqual([]);
    expect(lines).toEqual([
      { productId: 'orig', type: 'artwork', title: 'Sunset', unitAmountCents: 120000, qty: 1 },
      { productId: 'pod', type: 'shopProduct', title: 'Postcard', unitAmountCents: 400, qty: 3 },
    ]);
  });
  it('rounds fractional dollars correctly (19.99 → 1999)', () => {
    const rows: ProductRow[] = [{ _id: 'x', _type: 'shopProduct', title: 'X', price: 19.99, available: true, stock: null }];
    const { lines } = buildOrderLines([{ productId: 'x', qty: 1 }], rows);
    expect(lines[0].unitAmountCents).toBe(1999);
  });
  it('flags sold original, over-stock limited print, qty>1 original, missing, no-price', () => {
    const rows: ProductRow[] = [...ROWS, { _id: 'free', _type: 'shopProduct', title: 'Free', price: 0, available: true, stock: null }];
    const { unavailable } = buildOrderLines(
      [
        { productId: 'sold', qty: 1 }, // not_available
        { productId: 'lim', qty: 5 },  // out_of_stock (stock 2)
        { productId: 'orig', qty: 2 }, // out_of_stock (unique)
        { productId: 'zzz', qty: 1 },  // missing
        { productId: 'free', qty: 1 }, // no_price (0)
      ],
      rows
    );
    expect(unavailable.map((u) => `${u.productId}:${u.reason}`).sort()).toEqual([
      'free:no_price', 'lim:out_of_stock', 'orig:out_of_stock', 'sold:not_available', 'zzz:missing',
    ]);
  });
});

describe('cartSubtotalCents', () => {
  it('sums unit price × qty', () => {
    const line = (c: number, q: number): OrderLine => ({ productId: 'x', type: 'shopProduct', title: 'X', unitAmountCents: c, qty: q });
    expect(cartSubtotalCents([line(400, 3), line(120000, 1)])).toBe(121200);
    expect(cartSubtotalCents([])).toBe(0);
  });
});
```

- [ ] **Step 3: Run the test**

Run: `npm run test --workspace=apps/designandotherstories -- validateCart`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/designandotherstories/src/lib/commerce/validateCart.ts apps/designandotherstories/test/commerce/validateCart.test.ts
git commit -m "feat(daos): cart validation — two product types + dollars→cents"
```

---

### Task 8: Server libs (env, stripe, sanityWrite)

**Files:**
- Create: `apps/designandotherstories/src/lib/server/env.ts`
- Create: `apps/designandotherstories/src/lib/server/stripe.ts`
- Create: `apps/designandotherstories/src/lib/server/sanityWrite.ts`
- Test: `apps/designandotherstories/test/server/env.test.ts`

**Interfaces:**
- Produces: `requireServerEnv(name)`, `getStripe()`, `sanityWriteFetch(query, params?)`, `sanityWriteClient()`.

- [ ] **Step 1: Create the three server libs (verbatim copies)**

Copy each fattamano file to the DAOS path, unchanged:
- `apps/fattamano/src/lib/server/env.ts` → `apps/designandotherstories/src/lib/server/env.ts`
- `apps/fattamano/src/lib/server/stripe.ts` → `apps/designandotherstories/src/lib/server/stripe.ts`
- `apps/fattamano/src/lib/server/sanityWrite.ts` → `apps/designandotherstories/src/lib/server/sanityWrite.ts`

(All env var names — `STRIPE_SECRET_KEY`, `PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET`, `SANITY_WRITE_TOKEN` — are identical for DAOS.)

- [ ] **Step 2: Write the test `apps/designandotherstories/test/server/env.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { requireServerEnv } from '../../src/lib/server/env';

describe('requireServerEnv', () => {
  it('returns a present env var', () => {
    process.env.DAOS_TEST_ENV = 'hello';
    expect(requireServerEnv('DAOS_TEST_ENV')).toBe('hello');
  });
  it('throws on a missing env var', () => {
    delete process.env.DAOS_TEST_MISSING;
    expect(() => requireServerEnv('DAOS_TEST_MISSING')).toThrow(/Missing required server env var/);
  });
});
```

- [ ] **Step 3: Run the test**

Run: `npm run test --workspace=apps/designandotherstories -- server/env`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/designandotherstories/src/lib/server apps/designandotherstories/test/server
git commit -m "feat(daos): server libs — env, stripe singleton, sanity write client"
```

---

### Task 9: `/api/availability`

**Files:**
- Create: `apps/designandotherstories/src/pages/api/availability.ts`

**Interfaces:**
- Consumes: `queries.daosAvailabilityByIds` (Task 3), `sanityClient` from `../../lib/sanity`.
- Produces: `GET /api/availability?ids=a,b` → `[{ _id, inStock }]`.

- [ ] **Step 1: Write `apps/designandotherstories/src/pages/api/availability.ts`**

```ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { sanityClient, queries } from '../../lib/sanity';

export const GET: APIRoute = async ({ url }) => {
  const ids = (url.searchParams.get('ids') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100);
  if (!ids.length) return Response.json([]);

  const rows = await sanityClient.fetch<{ _id: string; inStock: boolean }[]>(
    queries.daosAvailabilityByIds,
    { ids }
  );

  return new Response(JSON.stringify(rows), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=15' },
  });
};
```

- [ ] **Step 2: Verify it type-checks in the build**

Run: `npm run build --workspace=apps/designandotherstories`
Expected: `astro check` + build pass (route compiles). (A live data check happens in Task 17.)

- [ ] **Step 3: Commit**

```bash
git add apps/designandotherstories/src/pages/api/availability.ts
git commit -m "feat(daos): /api/availability live stock endpoint"
```

---

### Task 10: `/api/checkout`

**Files:**
- Create: `apps/designandotherstories/src/pages/api/checkout.ts`

**Interfaces:**
- Consumes: `getStripe`, `sanityWriteFetch`/`sanityWriteClient`, `normalizeCartItems`/`buildOrderLines`/`cartSubtotalCents`/`BadCartError`, `allowedCountries`, `queries.daosProductsByIds`/`daosShopSettings`, `ProductRow`/`DaosShopSettings`.
- Produces: `POST /api/checkout` → `{ clientSecret }`; creates a `daosCheckoutSession` doc (`_id` = Stripe session id, `items[]{ productId, type, qty }`).

- [ ] **Step 1: Write `apps/designandotherstories/src/pages/api/checkout.ts`**

```ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { getStripe } from '../../lib/server/stripe';
import { sanityWriteFetch, sanityWriteClient } from '../../lib/server/sanityWrite';
import { queries } from '@lakeshore/shared-ui/sanity';
import { normalizeCartItems, buildOrderLines, cartSubtotalCents, BadCartError } from '../../lib/commerce/validateCart';
import { allowedCountries } from '../../lib/commerce/shipping';
import type Stripe from 'stripe';
import type { ProductRow, DaosShopSettings } from '../../lib/types';

const DEFAULT_RETURN_ORIGIN = 'https://designandotherstories.com';

function normalizeOrigin(value: string | undefined, label: string): string | null {
  if (!value?.trim()) return null;
  try {
    const u = new URL(value.trim());
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error(`${label} must use http or https`);
    return u.origin;
  } catch (error) {
    if (error instanceof Error && error.message.includes('must use')) throw error;
    throw new Error(`${label} must be a valid absolute URL`);
  }
}

function checkoutReturnUrl(request: Request): string {
  const configured = normalizeOrigin(import.meta.env.DAOS_CHECKOUT_RETURN_ORIGIN, 'DAOS_CHECKOUT_RETURN_ORIGIN');
  const fromRequest = normalizeOrigin(request.url, 'request.url');
  const origin = configured ?? fromRequest ?? DEFAULT_RETURN_ORIGIN;
  return `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`;
}

export const POST: APIRoute = async ({ request }) => {
  let items;
  try {
    items = normalizeCartItems(await request.json());
  } catch (e) {
    const msg = e instanceof BadCartError ? e.message : 'Invalid request';
    return Response.json({ error: msg }, { status: 400 });
  }

  // Prices/stock/availability come ONLY from this authoritative server read.
  const ids = items.map((i) => i.productId);
  const rows = await sanityWriteFetch<ProductRow[]>(queries.daosProductsByIds, { ids });
  const { lines, unavailable } = buildOrderLines(items, rows);
  if (unavailable.length) {
    return Response.json({ error: 'Some items are unavailable', unavailable }, { status: 409 });
  }

  const settings = await sanityWriteFetch<DaosShopSettings>(queries.daosShopSettings);
  const zones = settings?.shippingZones ?? [];
  const countries = allowedCountries(zones);
  if (!countries.length) {
    return Response.json({ error: 'Shipping not configured' }, { status: 500 });
  }

  const stripe = getStripe();
  const sessionParams = {
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
    shipping_options: [
      {
        shipping_rate_data: {
          display_name: 'Shipping',
          type: 'fixed_amount',
          fixed_amount: { amount: 0, currency: 'usd' },
        },
      },
    ],
    return_url: checkoutReturnUrl(request),
  } as unknown as Stripe.Checkout.SessionCreateParams;
  const session = await stripe.checkout.sessions.create(sessionParams);

  // Idempotency + cart source for the webhook. _id = Stripe session id.
  await sanityWriteClient().createIfNotExists({
    _id: session.id,
    _type: 'daosCheckoutSession',
    items: lines.map((l) => ({ _key: l.productId, productId: l.productId, type: l.type, qty: l.qty })),
    subtotalCents: cartSubtotalCents(lines),
    status: 'pending',
    createdAt: new Date().toISOString(),
  } as any);

  return Response.json({ clientSecret: session.client_secret });
};
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build --workspace=apps/designandotherstories`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add apps/designandotherstories/src/pages/api/checkout.ts
git commit -m "feat(daos): /api/checkout — server-priced Stripe Embedded session"
```

---

### Task 11: `/api/calculate-shipping-options`

**Files:**
- Create: `apps/designandotherstories/src/pages/api/calculate-shipping-options.ts`

**Interfaces:**
- Consumes: `getStripe`, `sanityWriteFetch`, `resolveShippingOption`, `queries.daosShopSettings`, `DaosShopSettings`.
- Produces: `POST /api/calculate-shipping-options` → `{ type: 'accept' | 'reject' }`; updates the Stripe session shipping option for our-own pending sessions.

- [ ] **Step 1: Create by copying fattamano's, with three renames**

Copy `apps/fattamano/src/pages/api/calculate-shipping-options.ts` to the DAOS path, then change:
1. The inline session-lookup GROQ: `"fattamanoCheckoutSession"` → `"daosCheckoutSession"`.
2. `queries.fattamanoSettings` → `queries.daosShopSettings`.
3. The settings type import `FattamanoSettings` → `DaosShopSettings` (from `../../lib/types`).

Everything else (the `server_only` shipping update, the "ship there?" rejection, using the stored `subtotalCents`) stays identical.

- [ ] **Step 2: Verify it builds**

Run: `npm run build --workspace=apps/designandotherstories`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add apps/designandotherstories/src/pages/api/calculate-shipping-options.ts
git commit -m "feat(daos): /api/calculate-shipping-options server-side shipping"
```

---

### Task 12: `/api/stripe-webhook` (type-aware fulfillment)

**Files:**
- Create: `apps/designandotherstories/src/pages/api/stripe-webhook.ts`

**Interfaces:**
- Consumes: `getStripe`, `sanityWriteFetch`/`sanityWriteClient`, `requireServerEnv`, `planFulfillment` (Task 6), `queries.daosProductsByIds`, `ProductRow`, `DaosProductType`.
- Produces: `POST /api/stripe-webhook` handling `checkout.session.completed` with idempotent, revision-guarded, type-aware fulfillment.

- [ ] **Step 1: Write `apps/designandotherstories/src/pages/api/stripe-webhook.ts`**

```ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { getStripe } from '../../lib/server/stripe';
import { sanityWriteFetch, sanityWriteClient } from '../../lib/server/sanityWrite';
import { requireServerEnv } from '../../lib/server/env';
import { queries } from '@lakeshore/shared-ui/sanity';
import { planFulfillment } from '../../lib/commerce/stock';
import type { ProductRow, DaosProductType } from '../../lib/types';

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
  const doc = await sanityWriteFetch<{
    _id: string;
    _rev: string;
    status: string;
    items: { productId: string; type: DaosProductType; qty: number }[];
  } | null>(
    `*[_type == "daosCheckoutSession" && _id == $id][0]{ _id, _rev, status, items[]{ productId, type, qty } }`,
    { id: session.id }
  );
  if (!doc || doc.status === 'fulfilled') {
    return new Response('already handled', { status: 200 }); // idempotent fast path
  }

  const ids = doc.items.map((i) => i.productId);
  const rows = await sanityWriteFetch<ProductRow[]>(queries.daosProductsByIds, { ids });
  const patches = planFulfillment(doc.items, rows);

  // One transaction: all writes + flip to fulfilled, GUARDED by the doc revision.
  // A concurrent duplicate delivery will fail the ifRevisionId check and roll back
  // the entire transaction, so nothing is fulfilled twice.
  try {
    let tx = client.transaction();
    for (const p of patches) {
      tx = tx.patch(p.productId, (patch) => patch.set(p.set));
    }
    tx = tx.patch(doc._id, (patch) => patch.ifRevisionId(doc._rev).set({ status: 'fulfilled' }));
    await tx.commit();
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (err?.statusCode === 409 || msg.toLowerCase().includes('revision')) {
      return new Response('already handled (raced)', { status: 200 });
    }
    return new Response('error', { status: 500 }); // real error → let Stripe retry
  }

  return new Response('ok', { status: 200 });
};
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build --workspace=apps/designandotherstories`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add apps/designandotherstories/src/pages/api/stripe-webhook.ts
git commit -m "feat(daos): /api/stripe-webhook — type-aware idempotent fulfillment"
```

---

### Task 13: Cart UI islands (CartButton, CartDrawer, AddToCartButton)

**Files:**
- Create: `apps/designandotherstories/src/components/cart/CartButton.tsx`
- Create: `apps/designandotherstories/src/components/cart/CartDrawer.tsx`
- Create: `apps/designandotherstories/src/components/cart/AddToCartButton.tsx`

**Interfaces:**
- Consumes: `useCart`/`dispatch` (Task 5), `CartItem` (Task 4), `/api/availability` (Task 9), `formatMoneyCents` (Task 4).
- Produces: `CartButton` (emits `daos-cart-open`), `CartDrawer` (listens for `daos-cart-open`, props `{ freeShippingThresholdCents?: number | null }`), `AddToCartButton` (props `{ item: CartItem; initialAvailable: boolean }`).

- [ ] **Step 1: Copy the three components and retheme**

Copy each fattamano component to the DAOS `components/cart/` path:
- `apps/fattamano/src/components/cart/CartButton.tsx`
- `apps/fattamano/src/components/cart/CartDrawer.tsx`
- `apps/fattamano/src/components/cart/AddToCartButton.tsx`

Apply these mechanical changes to all three:
- Custom event name `ft-cart-open` → `daos-cart-open`.
- Tailwind classes: `ft-ink`→`daos-ink`, `ft-paper`→`daos-paper`, `ft-shout`→`daos-terracotta`, `ft-smudge`→`daos-charcoal`. For the primary action buttons, prefer DAOS's existing `btn-warm` utility (and `btn-outline` for secondary); match the look of `PurchaseAction.astro`/`ShopCard.astro`. Lower-case display copy like "add to cart" should match DAOS's sentence style (e.g. "Add to Cart") — keep it consistent with `CheckoutButton.astro`.
- Money display: if a component formats price inline, use `formatMoneyCents` from `../../lib/format`.
- Imports resolve to DAOS paths automatically (relative imports unchanged).

- [ ] **Step 2: Adapt `AddToCartButton.tsx` to the `inStock` availability shape**

DAOS `/api/availability` returns `[{ _id, inStock }]` (not `{ status, stock }`). In the availability `fetch().then()` handler, replace the fattamano line that computes availability from `status`/`stock` with:
```tsx
const row = rows.find((x) => x._id === item.productId);
if (row) setAvailable(Boolean(row.inStock));
```
and type the response as `{ _id: string; inStock: boolean }[]`.

- [ ] **Step 3: Adapt the cart drawer qty control for unique originals**

In `CartDrawer.tsx`, render the qty stepper only for `shopProduct` lines; for an `artwork` line show a fixed quantity of 1 (no increment control), since originals are unique. Use `item.type === 'artwork'` to branch. Keep the remove control for all lines.

- [ ] **Step 4: Verify build**

Run: `npm run build --workspace=apps/designandotherstories`
Expected: pass (components compile; they aren't mounted yet).

- [ ] **Step 5: Commit**

```bash
git add apps/designandotherstories/src/components/cart
git commit -m "feat(daos): cart UI islands — button, drawer, add-to-cart"
```

---

### Task 14: Checkout island + pages

**Files:**
- Create: `apps/designandotherstories/src/components/checkout/CheckoutEmbed.tsx`
- Create: `apps/designandotherstories/src/pages/checkout/index.astro`
- Create: `apps/designandotherstories/src/pages/checkout/return.astro`

**Interfaces:**
- Consumes: `@stripe/stripe-js`, `@stripe/react-stripe-js`, `getSnapshot` (Task 5), `/api/checkout` + `/api/calculate-shipping-options`.
- Produces: `/checkout` (mounts Embedded Checkout), `/checkout/return` (confirms payment, clears `daos_cart_v1`).

- [ ] **Step 1: Copy `CheckoutEmbed.tsx` and retheme**

Copy `apps/fattamano/src/components/checkout/CheckoutEmbed.tsx` to the DAOS path. It needs **no logic change** (it already posts to `/api/checkout` and `/api/calculate-shipping-options` and reads the cart via `getSnapshot`). Apply only `ft-*`→`daos-*` class renames if any are present.

- [ ] **Step 2: Create `apps/designandotherstories/src/pages/checkout/index.astro`**

```astro
---
export const prerender = false;
import BaseLayout from '../../layouts/BaseLayout.astro';
import CheckoutEmbed from '../../components/checkout/CheckoutEmbed.tsx';

const publishableKey = import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
---
<BaseLayout title="Checkout" description="Complete your order from Design & Other Stories.">
  <section class="section-spacing">
    <div class="container-art max-w-3xl">
      <a href="/shop" class="inline-flex items-center gap-1 font-sans text-sm text-daos-charcoal hover:text-daos-terracotta transition-colors mb-8">
        &larr; Keep shopping
      </a>
      {publishableKey
        ? <CheckoutEmbed client:only="react" publishableKey={publishableKey} />
        : <p class="font-body text-daos-charcoal">Checkout is temporarily unavailable.</p>}
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 3: Create `apps/designandotherstories/src/pages/checkout/return.astro`**

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
<BaseLayout title={paid ? 'Thank you' : 'Order status'} description="Order confirmation.">
  <section class="section-spacing">
    <div class="container-art max-w-2xl text-center py-16">
      {paid ? (
        <>
          <h1 class="font-display italic text-display-lg text-daos-ink mb-6">Thank you</h1>
          <p class="font-body text-daos-charcoal text-lg leading-relaxed">Your order is in. Each piece is wrapped and shipped with care from the studio.</p>
          <a href="/shop" class="btn-warm inline-flex mt-8">Back to the shop</a>
          <script is:inline>try { localStorage.removeItem('daos_cart_v1'); } catch (e) {}</script>
        </>
      ) : (
        <>
          <h1 class="font-display italic text-display-lg text-daos-ink mb-6">Still processing</h1>
          <p class="font-body text-daos-charcoal text-lg leading-relaxed">If you were charged, a receipt is on its way by email. Refresh in a moment.</p>
        </>
      )}
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 4: Verify build**

Run: `npm run build --workspace=apps/designandotherstories`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add apps/designandotherstories/src/components/checkout apps/designandotherstories/src/pages/checkout
git commit -m "feat(daos): Stripe Embedded Checkout island + /checkout + /checkout/return"
```

---

### Task 15: Wire the shop pages (dual-resolve detail, index links, purchase components)

**Files:**
- Rewrite: `apps/designandotherstories/src/pages/shop/[slug].astro`
- Modify: `apps/designandotherstories/src/pages/shop/index.astro`
- Modify: `apps/designandotherstories/src/components/PurchaseAction.astro`

**Interfaces:**
- Consumes: `queries.allShopProductSlugs`/`allForSaleArtworkSlugs`/`shopProductBySlug`/`artworkBySlug`, `AddToCartButton` (Task 13).
- Produces: `/shop/[slug]` serving both `artwork` and `shopProduct`; shop index originals linking to `/shop/[slug]`.

- [ ] **Step 1: Rewrite `apps/designandotherstories/src/pages/shop/[slug].astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import ImageViewer from '../../components/ImageViewer.tsx';
import AddToCartButton from '../../components/cart/AddToCartButton.tsx';
import { sanityClient, urlFor, queries } from '../../lib/sanity';

export async function getStaticPaths() {
  const [products, artworks] = await Promise.all([
    sanityClient.fetch(queries.allShopProductSlugs),
    sanityClient.fetch(queries.allForSaleArtworkSlugs),
  ]);
  const seen = new Set<string>();
  const paths: { params: { slug: string } }[] = [];
  for (const p of products ?? []) {
    const s = p.slug?.current;
    if (s && !seen.has(s)) { seen.add(s); paths.push({ params: { slug: s } }); }
  }
  for (const a of artworks ?? []) {
    const s = a.slug?.current;
    if (!s) continue;
    if (seen.has(s)) { console.warn(`[shop] slug collision: "${s}" — shopProduct wins`); continue; }
    seen.add(s);
    paths.push({ params: { slug: s } });
  }
  return paths;
}

const { slug } = Astro.params;
// shopProduct wins on collision; fall back to artwork.
const product = await sanityClient.fetch(queries.shopProductBySlug, { slug });
const artwork = product ? null : await sanityClient.fetch(queries.artworkBySlug, { slug });
if (!product && !artwork) return Astro.redirect('/shop');

const isArtwork = !product;
const doc: any = product ?? artwork;
const productType: 'artwork' | 'shopProduct' = isArtwork ? 'artwork' : 'shopProduct';

const available = isArtwork
  ? Boolean(artwork.forSale && artwork.originalAvailable)
  : Boolean(product.available && (product.stock == null || product.stock > 0));

const images = (doc.images ?? [])
  .filter((img: any) => img.asset)
  .map((img: any) => ({
    url: urlFor(img).width(800).fit('max').url(),
    alt: img.alt ?? doc.title,
    thumbUrl: urlFor(img).width(160).height(160).fit('crop').url(),
  }));

const priceCents = typeof doc.price === 'number' ? Math.round(doc.price * 100) : null;
const priceDisplay = priceCents != null ? `$${(priceCents / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}` : null;

const cartItem = {
  productId: doc._id,
  type: productType,
  slug,
  title: doc.title,
  priceCents: priceCents ?? 0,
  qty: 1,
};

const categoryLabel = !isArtwork && product.category
  ? product.category.charAt(0).toUpperCase() + product.category.slice(1).replace('-', ' ')
  : (isArtwork ? (artwork.medium ?? null) : null);

const seoTitle = doc.title;
const seoDescription = (isArtwork ? artwork.story : product.blurb) || doc.title;
---

<BaseLayout title={seoTitle} description={seoDescription}>
  <article>
    <section class="section-spacing">
      <div class="container-art">
        <a href="/shop" class="inline-flex items-center gap-1 font-sans text-sm text-daos-charcoal hover:text-daos-terracotta transition-colors mb-10">
          &larr; Back to Shop
        </a>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div><ImageViewer client:visible images={images} /></div>

          <div class="space-y-6">
            {categoryLabel && (
              <span class="inline-block px-3 py-1 border border-daos-warm text-daos-charcoal text-xs font-sans uppercase tracking-wider rounded-sm">
                {categoryLabel}
              </span>
            )}

            <h1 class="font-display text-display md:text-display-lg text-daos-ink leading-tight">{doc.title}</h1>

            {isArtwork && artwork.story && (
              <p class="font-body text-daos-charcoal leading-relaxed italic border-l-2 border-daos-clay pl-4">{artwork.story}</p>
            )}
            {!isArtwork && product.blurb && (
              <p class="font-body text-daos-charcoal leading-relaxed italic border-l-2 border-daos-clay pl-4">{product.blurb}</p>
            )}

            <div class="pt-4 border-t border-daos-warm space-y-4">
              {priceDisplay && (
                <p class="font-sans text-xl font-medium text-daos-ink">
                  {available ? <span>{priceDisplay}</span> : <span class="line-through text-daos-charcoal">{priceDisplay}</span>}
                </p>
              )}
              {available ? (
                <p class="font-sans text-sm text-daos-sage uppercase tracking-wide">Available</p>
              ) : (
                <p class="font-sans text-sm text-daos-charcoal uppercase tracking-wide">Sold</p>
              )}
              {available && priceCents != null && (
                <AddToCartButton client:visible item={cartItem} initialAvailable={available} />
              )}
            </div>

            {isArtwork && artwork.collection?.slug?.current && (
              <p class="font-sans text-sm">
                Part of{' '}
                <a href={`/gallery/collections/${artwork.collection.slug.current}`} class="text-daos-sage underline underline-offset-2 hover:text-daos-terracotta transition-colors">
                  {artwork.collection.title}
                </a>
              </p>
            )}

            {/* Prints are display-only in v1 */}
            {isArtwork && artwork.printsAvailable && artwork.printOptions?.length > 0 && (
              <div class="pt-4 border-t border-daos-warm">
                <h2 class="font-display text-lg text-daos-ink mb-3">Prints available</h2>
                <div class="space-y-2">
                  {artwork.printOptions.map((opt: any) => (
                    <div class="flex items-center justify-between py-2 border-b border-daos-warm/60 font-sans text-sm">
                      <span class="text-daos-charcoal">{opt.size}</span>
                      <span class="text-daos-ink font-medium">${opt.price?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <p class="font-body text-sm text-daos-charcoal italic mt-3">
                  Looking for prints or cards? See <a href="/shop" class="text-daos-terracotta underline underline-offset-2">Prints &amp; Cards</a>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  </article>
</BaseLayout>
```

- [ ] **Step 2: Update `apps/designandotherstories/src/pages/shop/index.astro`**

- Remove `showSnipcart={true}` from the `<BaseLayout ...>` opening tag.
- In the **Originals** section, change the `<ShopCard ... />` for originals to pass `basePath="/shop"` (so they link to `/shop/[slug]`, not `/gallery/[slug]`). The Prints & Cards section already uses `basePath="/shop"`.

- [ ] **Step 3: Retire the Snipcart-branching components**

After Step 1, `/shop/[slug]` uses `AddToCartButton` directly; after Task 16, `/gallery/[slug]` uses a plain link. The old `CheckoutButton.astro` / `PurchaseAction.astro` / `PurchaseLinks.astro` (which branch on `SHOP_PLATFORM` snipcart/etsy/inquiry) are then unreferenced.

Audit and clean up:
```bash
grep -rn "PurchaseAction\|CheckoutButton\|PurchaseLinks" apps/designandotherstories/src
```
- If `ShopCard.astro` renders any of them inline, edit `ShopCard.astro` to remove the inline purchase UI — cards only display image/title/price/availability and **link** to `/shop/[slug]` (where purchasing lives). Cards do not need an Add-to-Cart.
- Once the grep shows no remaining importers, **delete** `CheckoutButton.astro`, `PurchaseAction.astro`, and `PurchaseLinks.astro` (dead Snipcart code). Re-run the grep to confirm zero references before deleting.

- [ ] **Step 4: Verify build + render**

Run: `npm run build --workspace=apps/designandotherstories`
Expected: pass. Then `npm run dev:daos` and load `/shop` and a `/shop/<slug>` for both an original and a card; confirm price, Available/Sold, and an Add-to-Cart button appear; no Snipcart network requests.

- [ ] **Step 5: Commit**

```bash
git add -A apps/designandotherstories/src/pages/shop apps/designandotherstories/src/components
git commit -m "feat(daos): shop detail serves originals + products; cart-based purchase; drop Snipcart components"
```

---

### Task 16: Gallery art-house + layout + nav (remove Snipcart, add cart)

**Files:**
- Modify: `apps/designandotherstories/src/pages/gallery/[slug].astro`
- Modify: `apps/designandotherstories/src/layouts/BaseLayout.astro`
- Modify: `apps/designandotherstories/src/components/Navigation.astro`
- Modify: `apps/designandotherstories/src/lib/config.ts`

**Interfaces:**
- Consumes: `CartButton`/`CartDrawer` (Task 13), `queries.daosShopSettings`.
- Produces: pure art-house gallery detail with a single "Buy from shop" button; a global cart UI; an enabled Shop nav link; no Snipcart.

- [ ] **Step 1: Strip commerce from `gallery/[slug].astro`**

- Remove the `import PurchaseAction` line.
- Remove `showSnipcart={artwork.forSale}` from the `<BaseLayout ...>` tag (leave the rest of the props).
- Replace the entire **Purchase action** block (the `{artwork.forSale && ( ... <PurchaseAction ... /> ... )}`) with:
```astro
{artwork.forSale && (
  <div class="pt-4 border-t border-daos-warm">
    <a href={`/shop/${artwork.slug.current}`} class="btn-warm inline-flex items-center gap-2">
      Buy this work from our shop
      <span aria-hidden="true">&rarr;</span>
    </a>
  </div>
)}
```
- Remove the **Print options** `<section id="prints">...</section>` block entirely (moved to `/shop/[slug]`).
- If `firstImageUrl` is now unused, remove its declaration to keep `astro check` clean.

- [ ] **Step 2: Remove Snipcart from `BaseLayout.astro` and mount the cart**

- Delete the `showSnipcart` prop (line ~11 and its default ~18), the `snipcartApiKey` const (~23), and both `{showSnipcart && ( ... )}` blocks (the `<link>`/preconnect block ~40 and the `<div id="snipcart">`/`<script src=".../snipcart.js">` block ~63-71).
- Fetch the free-shipping threshold once and mount the drawer. Near the top frontmatter:
```ts
import CartDrawer from '../components/cart/CartDrawer.tsx';
import { sanityClient, queries } from '../lib/sanity';
let freeShippingThresholdCents: number | null = null;
try {
  const settings = await sanityClient.fetch(queries.daosShopSettings);
  const usZone = settings?.shippingZones?.find((z: any) => z.countryCodes?.includes('US'));
  freeShippingThresholdCents = usZone?.freeShippingThresholdCents ?? null;
} catch {}
```
Just before `</body>`, mount the drawer:
```astro
<CartDrawer client:idle freeShippingThresholdCents={freeShippingThresholdCents} />
```

- [ ] **Step 3: Enable the Shop nav link + add the cart button in `Navigation.astro`**

- Add/uncomment the **Shop** link pointing to `/shop` in the primary nav list (match the markup of the existing nav links, e.g. Gallery/Writing).
- Add the cart button next to the nav links:
```astro
---
import CartButton from './cart/CartButton.tsx';
---
<CartButton client:idle />
```
Place it where a utility action fits the existing layout (e.g. end of the nav row).

- [ ] **Step 4: Retire the Snipcart config in `lib/config.ts`**

Change the first line so no caller resolves a Snipcart platform:
```ts
export const SHOP_PLATFORM: 'stripe' = 'stripe';
```
(Leave the Substack constants untouched.)

- [ ] **Step 5: Verify**

Run: `npm run build --workspace=apps/designandotherstories`
Expected: pass.
Run: `grep -rn "snipcart\|Snipcart" apps/designandotherstories/src`
Expected: no matches (or only an inert comment).
Then `npm run dev:daos`: a for-sale `/gallery/<slug>` shows only the "Buy this work from our shop" button (no price/cart inline); the nav shows Shop + a cart button; adding an item opens the drawer.

- [ ] **Step 6: Commit**

```bash
git add apps/designandotherstories/src/pages/gallery/[slug].astro apps/designandotherstories/src/layouts/BaseLayout.astro apps/designandotherstories/src/components/Navigation.astro apps/designandotherstories/src/lib/config.ts
git commit -m "feat(daos): art-house gallery + global cart + Shop nav; remove Snipcart"
```

---

### Task 17: Full build + Stripe test-mode end-to-end

**Files:** none (verification + any fixes surfaced).

**Interfaces:**
- Consumes: everything above; DAOS Stripe **test** keys + a `SANITY_WRITE_TOKEN`; a `daosShopSettings` doc with at least one zone; one for-sale `artwork` and one `shopProduct` in Sanity.

- [ ] **Step 1: Run the whole DAOS test suite**

Run: `npm run test --workspace=apps/designandotherstories`
Expected: all unit tests pass.

- [ ] **Step 2: Production build**

Run: `npm run build:daos`
Expected: `astro check` clean + build succeeds.

- [ ] **Step 3: Seed prerequisites in Sanity (test dataset)**

In the studio, create a `daosShopSettings` doc with one US zone (e.g. `rateCents: 800`, `freeShippingThresholdCents: 15000`) and one international zone; ensure one `artwork` has `forSale: true`, `originalAvailable: true`, a `price`, and a slug; ensure one `shopProduct` has `available: true`, a `price`, a slug (optionally a `stock`).

- [ ] **Step 4: Local checkout smoke test with Stripe test keys**

Put DAOS test-mode keys + `SANITY_WRITE_TOKEN` in `apps/designandotherstories/.env`. Run `npm run dev:daos`. In the browser: open a `/shop/<slug>` for the original and one for the card → Add to Cart → open drawer → Checkout → Stripe Embedded form renders → enter a US address (shipping rate appears) → pay with test card `4242 4242 4242 4242` → land on `/checkout/return` showing "Thank you" and an emptied cart.

- [ ] **Step 5: Verify webhook fulfillment**

Run the Stripe CLI to forward events: `stripe listen --forward-to localhost:4322/api/stripe-webhook` (use the dev port from `dev:daos`), set the printed `whsec_…` as `STRIPE_WEBHOOK_SECRET`, and repeat a purchase. Confirm in Sanity: the purchased original now has `originalAvailable: false`; a limited `shopProduct` had its `stock` decremented (and `available:false` at 0); the `daosCheckoutSession` doc flipped to `status: 'fulfilled'`.

- [ ] **Step 6: Negative checks**

Confirm: entering a country not in any zone shows the "can't ship there" rejection; a sold-out item shows "Sold" with no Add-to-Cart; `grep -rn snipcart apps/designandotherstories/src` is empty.

- [ ] **Step 7: Commit any fixes**

```bash
git add -A
git commit -m "test(daos): verify on-site Stripe checkout end-to-end (test mode)"
```

---

## Self-Review

**Spec coverage:**
- Checkout mechanism (full Stripe Embedded) → Tasks 8–14. ✅
- Gallery art-house + Buy-from-shop button → Task 16. ✅
- `/shop/[slug]` dual-resolve (originals + products) → Task 15. ✅
- Multi-item cart → Tasks 5, 13. ✅
- Single flat-rate shipping (two zones) → Tasks 2, 3, 6 (shipping.ts), 11. ✅
- Prints display-only → Task 15 Step 1 (no print line items anywhere). ✅
- DAOS own Stripe account / env → Task 1, restricted-key note in Global Constraints. ✅
- Data adaptations (dollars→cents, type-aware webhook, optional `shopProduct.stock`) → Tasks 2, 6, 7, 12. ✅
- New Sanity docs (`daosCheckoutSession`, `daosShopSettings`) → Task 2. ✅
- Remove Snipcart → Tasks 15, 16. ✅
- Security (server-priced, signature-verified, idempotent, server shipping, read-only availability) → Tasks 7, 9, 10, 11, 12. ✅
- Out-of-scope items (purchasable prints, per-piece shipping, notification emails, cents migration) correctly omitted. ✅

**Placeholder scan:** No "TBD/implement later" — verbatim ports are specified as exact "copy file X → path Y + these deltas"; novel logic is fully inlined.

**Type consistency:** `ProductRow` (`_type`, `price`, `available`, `stock?`), `OrderLine` (with `type`), `CartItem` (with `type`), `FulfillmentPatch` ({productId,set}), and `planFulfillment`/`buildOrderLines` signatures are consistent across Tasks 4, 6, 7, 10, 12. `daos-cart-open` event and `daos_cart_v1` key used consistently in Tasks 5, 13, 14.
