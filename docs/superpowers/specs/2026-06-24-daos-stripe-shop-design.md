# DAOS On-Site Stripe Shop — Design Spec

**Date:** 2026-06-24
**App:** `apps/designandotherstories` (DAOS — designandotherstories.com)
**Branch:** `feat/daos-shop-checkout` (off latest `origin/main`)
**Pattern source:** `apps/fattamano` on-site Stripe Embedded Checkout stack

## Goal

Give DAOS a real on-site Stripe checkout — the same owned, embedded purchase
flow fattamano uses — while keeping the gallery pages a formal "art house."
The art pages stay pure presentation; a single button routes buyers to a
structured, ecommerce-oriented shop where the actual purchasing happens.

## Decisions (locked during brainstorming)

1. **Checkout mechanism:** Port fattamano's on-site **Stripe Embedded Checkout**
   stack (cart store, `/api/checkout`, `/api/calculate-shipping-options`,
   `/api/stripe-webhook`, `/api/availability`). Replaces the existing
   Snipcart wiring (`SHOP_PLATFORM = 'snipcart'`).
2. **Gallery stays art-house:** `/gallery/[slug]` loses its inline purchase UI
   and print-options table. It gains one **"Buy this work from our shop →"**
   button (only when `forSale`) linking to `/shop/[slug]`.
3. **Originals get a dedicated shop page:** `/shop/[slug]` resolves **both**
   `artwork` (originals) and `shopProduct` (prints/cards). Originals no longer
   link back to the gallery from the shop.
4. **Multi-item cart** (port `cartStore`/`useCart`/`CartDrawer`): buy a print +
   several postcards + an original in one checkout.
5. **Shipping = single flat rate per order:** one domestic rate, one
   international rate, free above a threshold — modeled as fattamano's
   two-zone `shippingZones[]` (domestic zone + international zone). No
   per-piece shipping fields.
6. **Prints display-only in v1:** buyable items are originals (`artwork`,
   qty-1) and `shopProduct`s. An original's `printOptions` list renders on
   `/shop/[slug]` as information ("Prints available — see Prints & Cards"),
   not as add-to-cart line items.
7. **Stripe account:** DAOS gets its **own Stripe account** under the same
   email login — separate restricted key, webhook secret, payouts, and
   `DESIGNANDOTHERSTORIES` statement descriptor.

## Current state (what already exists on `main`)

- `/shop/index.astro` — Originals + Prints & Cards sections (Wilma, Jun 18).
- `/shop/[slug].astro` — resolves `shopProduct` only.
- `ShopCard` / `PurchaseAction` / `CheckoutButton` / `PurchaseLinks` components,
  driven by `SHOP_PLATFORM` config (snipcart/etsy/inquiry) — **not** Stripe.
- `artwork` schema has `forSale`, `price` (USD), `originalAvailable`,
  `printsAvailable`, `printOptions[]`. `shopProduct` has `price` (USD),
  `available`, `category`, `blurb`, `relatedArtwork`. **No `stock`, no cents.**
- DAOS app is already `output: 'hybrid'` + Vercel serverless adapter
  (`maxDuration: 30`) — serverless API routes work today (`/api/banner.json.ts`).
- Snipcart is loaded via `BaseLayout`'s `showSnipcart` prop.

## Architecture

### Two product types behind one checkout

```
┌─────────────────────────┐        ┌──────────────────────────┐
│  artwork (original)      │        │  shopProduct (print/card)│
│  price (USD), forSale,   │        │  price (USD), available, │
│  originalAvailable       │        │  + NEW optional stock    │
└───────────┬─────────────┘        └────────────┬─────────────┘
            │  normalize (server)                │
            └──────────────┬─────────────────────┘
                           ▼
                 OrderLine { id, type, title, unitAmountCents, qty }
                           ▼
        Stripe Checkout Session (embedded)  +  daosCheckoutSession (Sanity)
                           ▼
        checkout.session.completed webhook → type-aware fulfillment:
          • original    → set originalAvailable = false
          • shopProduct → decrement stock (if numeric) → available=false at 0
```

### Data-model adaptations (DAOS-specific deltas vs fattamano)

| Concern | fattamano | DAOS adaptation |
|---|---|---|
| Price units | `priceCents` (int) | `price` (USD). Convert server-side: `Math.round(price*100)`; reject non-finite or ≤0. No migration. |
| Product types | one (`fattamanoProduct`) | two (`artwork`, `shopProduct`) → discriminated `type` on each order line. |
| Stock | numeric `stock` | originals qty-1 via `originalAvailable`; `shopProduct` gets **optional** `stock` (decrement when set; unlimited-while-`available` when unset → print-on-demand). |
| Sold-out write | set `status:'sold_out'` | original → `originalAvailable:false`; shopProduct → `available:false` when stock hits 0. |
| Shipping config | `shippingZones[]` on `fattamanoSettings` | `shippingZones[]` on new `daosShopSettings` (two zones: domestic + intl). |
| Idempotency doc | `fattamanoCheckoutSession` | new `daosCheckoutSession` (`items[]{id,type,qty}`). |

### Files to CREATE (ported from fattamano, rethemed to `daos-*` tokens)

Client / pure logic (copy ~verbatim, swap types/keys):
- `apps/designandotherstories/src/lib/types.ts` — `DaosProductStatus`, `CartItem`, `OrderLine` (with `type`), `ShippingZone`, `ProductRow` (with `_type`).
- `apps/designandotherstories/src/lib/format.ts`
- `apps/designandotherstories/src/lib/cart/cartStore.ts` — localStorage key `daos_cart_v1`.
- `apps/designandotherstories/src/lib/cart/useCart.ts`
- `apps/designandotherstories/src/lib/commerce/validateCart.ts` — fetch both types; dollars→cents; per-line `type`.
- `apps/designandotherstories/src/lib/commerce/shipping.ts` — **verbatim** (zone resolution + free threshold).
- `apps/designandotherstories/src/lib/commerce/stock.ts` — type-aware decrement plan.

Server:
- `apps/designandotherstories/src/lib/server/env.ts` — `requireServerEnv`.
- `apps/designandotherstories/src/lib/server/stripe.ts` — `getStripe()` reads `STRIPE_SECRET_KEY`.
- `apps/designandotherstories/src/lib/server/sanityWrite.ts` — write client (`SANITY_WRITE_TOKEN`).

API routes (all `export const prerender = false`):
- `apps/designandotherstories/src/pages/api/checkout.ts`
- `apps/designandotherstories/src/pages/api/calculate-shipping-options.ts`
- `apps/designandotherstories/src/pages/api/stripe-webhook.ts`
- `apps/designandotherstories/src/pages/api/availability.ts`

UI islands (React, rethemed):
- `apps/designandotherstories/src/components/cart/CartButton.tsx`
- `apps/designandotherstories/src/components/cart/CartDrawer.tsx`
- `apps/designandotherstories/src/components/cart/AddToCartButton.tsx`
- `apps/designandotherstories/src/components/checkout/CheckoutEmbed.tsx`

Pages:
- `apps/designandotherstories/src/pages/checkout/index.astro` — mounts `CheckoutEmbed`.
- `apps/designandotherstories/src/pages/checkout/return.astro` — confirms payment, clears `daos_cart_v1`.

Sanity schemas:
- `studio/schemas/documents/daosCheckoutSession.ts`
- `studio/schemas/documents/daosShopSettings.ts` (singleton: `shippingZones[]`).

Env:
- `apps/designandotherstories/.env.example`

### Files to MODIFY

- `studio/schemas/documents/shopProduct.ts` — add optional `stock` (number, min 0).
- `studio/schemas/index.ts` — register `daosCheckoutSession`, `daosShopSettings`.
- `studio/sanity.config.ts` / structure — surface `daosShopSettings` singleton (if structure is customized).
- `packages/shared-ui/src/sanity.ts` — add queries: `daosProductsByIds`
  (both `_type`s by `_id`), `daosAvailabilityByIds`, `daosShopSettings`.
  (Existing `artworkForSale`, `shopProducts`, `artworkBySlug`,
  `shopProductBySlug`, `allShopProductSlugs` reused; add `allForSaleArtworkSlugs`.)
- `apps/designandotherstories/src/pages/shop/[slug].astro` — dual-resolve
  (`shopProductBySlug` → fallback `artworkBySlug`); render `AddToCartButton`;
  for artwork, render `printOptions` display-only + availability.
  `getStaticPaths` = forSale-artwork slugs ∪ shopProduct slugs (collision guard:
  prefer `shopProduct`, warn at build on overlap).
- `apps/designandotherstories/src/pages/shop/index.astro` — originals map
  `basePath="/shop"`; remove `showSnipcart`.
- `apps/designandotherstories/src/pages/gallery/[slug].astro` — remove inline
  `PurchaseAction` + print-options section; add "Buy this work from our shop →"
  link button (when `forSale`) → `/shop/[slug]`; remove `showSnipcart`.
- `apps/designandotherstories/src/components/PurchaseAction.astro` /
  `CheckoutButton.astro` — replace Snipcart branch with `AddToCartButton`
  island; retire `SHOP_PLATFORM` snipcart path (keep `inquiry` as graceful
  fallback when price/availability missing).
- `apps/designandotherstories/src/layouts/BaseLayout.astro` — remove Snipcart
  `<link>`/`<script>` + `showSnipcart` prop; mount `CartDrawer` (pass free-shipping
  threshold from `daosShopSettings`); add `CartButton` slot.
- `apps/designandotherstories/src/components/Navigation.astro` — enable the
  (currently hidden) **Shop** nav link; add cart button.
- `apps/designandotherstories/src/lib/config.ts` — remove/neutralize
  `SHOP_PLATFORM` (or set to `'stripe'`).
- `apps/designandotherstories/package.json` — add `stripe ^17`,
  `@stripe/stripe-js ^4`, `@stripe/react-stripe-js ^3`.

## Checkout session (created in `/api/checkout`)

`ui_mode: 'embedded'`, `mode: 'payment'`, `line_items` from server-priced
`OrderLine`s (`unit_amount = unitAmountCents`, `product_data.name = title`),
`shipping_address_collection.allowed_countries` from settings zones,
`permissions.update_shipping_details: 'server_only'`, a `$0` placeholder
`shipping_options` (replaced by `/api/calculate-shipping-options`),
`return_url = {origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`.
Persist a `daosCheckoutSession` (`createIfNotExists`, `_id = session.id`,
`items`, `subtotalCents`, `status:'pending'`).
**Never** pass `payment_method_types` (dynamic payment methods).

## Webhook (`/api/stripe-webhook`)

1. `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`.
2. Ignore non-`checkout.session.completed` / unpaid (200).
3. Load `daosCheckoutSession`; if `fulfilled`, 200 (idempotent fast-path).
4. Type-aware Sanity **transaction** (revision-guarded on the session `_rev`):
   - `type==='original'` → `patch(id).set({ originalAvailable: false })`.
   - `type==='shopProduct'` with numeric stock → `set({ stock: max(0,stock-qty), …available:false at 0 })`; null stock → no change.
   - `patch(sessionId).ifRevisionId(rev).set({ status:'fulfilled' })`.
5. 409/revision-mismatch → 200 (another delivery won). Real error → 500 (Stripe retries).

## Environment variables (DAOS app)

| Var | Scope | Use |
|---|---|---|
| `PUBLIC_STRIPE_PUBLISHABLE_KEY` | public | client `loadStripe` |
| `STRIPE_SECRET_KEY` | server | Stripe SDK — use a **restricted key (`rk_`)** |
| `STRIPE_WEBHOOK_SECRET` | server | webhook signature verify |
| `SANITY_WRITE_TOKEN` | server | stock/sold writes + idempotency doc |
| `PUBLIC_SANITY_PROJECT_ID` / `PUBLIC_SANITY_DATASET` | public | existing |

Stripe dashboard (DAOS account): register webhook
`https://designandotherstories.com/api/stripe-webhook` for
`checkout.session.completed`.

## Security (inherited from fattamano — must preserve)

- Server-priced cart; client prices never trusted (`validateCart` re-fetches Sanity).
- Webhook signature verification; idempotent, revision-guarded fulfillment.
- Shipping recomputed server-side only for sessions we created.
- `/api/availability` uses the read-only public client (no write token).
- Duplicate-line collapse before stock checks; integer-cents guard.

## Out of scope (v1)

- Purchasable per-size `printOptions` (display-only; revisit later).
- Per-piece / weight-based shipping; live carrier rates.
- Order-notification emails to Wilma (Stripe receipts cover the buyer;
  inbound notification is a known fattamano open item too).
- Migrating `price` (USD) → stored cents.

## Build sequence

1. Deps + `.env.example` scaffolding.
2. Schema: `shopProduct.stock`, `daosShopSettings`, `daosCheckoutSession`; register; queries.
3. Port pure logic + server libs (cents conversion, two-type validation, type-aware stock).
4. Port API routes.
5. Port cart + checkout islands (retheme to `daos-*`).
6. Rewire pages: dual-resolve `shop/[slug]`, shop-index links, gallery buy button, checkout pages, nav link + cart, remove Snipcart.
7. `npm run build` (DAOS) + `astro check`; smoke-test with Stripe **test** keys
   (add-to-cart → embedded checkout → test card → return page → webhook flips availability in Sanity).

## Verification

- `astro check` clean; DAOS build succeeds.
- Test-mode purchase end-to-end: original flips `originalAvailable=false`;
  shopProduct with stock decrements; free-shipping threshold applies; "ship
  there?" rejection for disallowed country.
- Gallery detail shows no inline cart — only the "Buy from shop" button.
- No Snipcart assets loaded on any page.
