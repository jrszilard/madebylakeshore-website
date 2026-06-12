# fattamano — Commerce / Checkout Design Spec

**Date:** 2026-06-12
**Status:** Draft (awaiting approval)
**App:** `apps/fattamano/` (live at fattamano.com)
**Builds on:** [2026-05-11-fattamano-design.md](./2026-05-11-fattamano-design.md)

## Overview

fattamano v1 shipped as a catalog with a deliberately platform-agnostic buy flow: each product carries a `buyUrl` that redirects to wherever a sale happens (Etsy, a Payment Link, a `mailto:`). This spec replaces that redirect model with a **real on-site checkout** so customers can buy directly on `fattamano.com`, combine multiple items into one order, and pay with a card (Apple/Google Pay/Link included).

The chosen mechanism is **Stripe Embedded Checkout** with Stripe's **dynamic ("custom") shipping options** feature, a client-side cart, and **server-side stock tracking** that auto-marks items sold out. The same machinery is designed to be reused later on Design & Other Stories (DAOS), where a one-of-a-kind original is simply a product with `stock: 1`.

Venmo (Wilma's current method) is intentionally retired as the primary path; it is not supported by Stripe and is not a launch requirement.

## Decisions (locked during brainstorming)

| Decision | Choice | Rationale |
|---|---|---|
| Fulfillment | Wilma makes & ships herself | No inventory sync / POD machinery needed → rules out Shopify-class platforms |
| Cart | Real combined cart, one order | Stickers are low-priced and bought in multiples; one combined shipping charge is fair |
| Platform | Stripe Embedded Checkout + custom cart | No monthly fee, full control, reuses existing serverless pattern, on-brand domain, generalizes to DAOS |
| Variants | None | Every product is a single option; keeps the cart line `{ productId, qty }` |
| Shipping | Dynamic, editable **zone table** | Small light items vary by destination zone, not US zip; Wilma edits rates in Studio; upgradeable to live carrier rates behind the same callback |
| Ship-to | US + a curated country shortlist | Maximize reach for easy-to-ship items while keeping destinations Wilma is comfortable with |
| Inventory | Track real stock counts, auto-sold-out | Same mechanism DAOS originals will need; prevents (most) double-sales |
| Tax | None at v1 | Stripe Tax is a later toggle |
| Stock holds | None (decrement on payment) | Reservation is real complexity for an edge case (two buyers, last unit) that's a refund at this volume |

## Scope

**In:** client cart (localStorage) · `/api/checkout` (Embedded Checkout session) · on-page embedded checkout · `/api/calculate-shipping-options` (dynamic zone shipping) · `/api/stripe-webhook` (stock decrement) · `stock` field + shipping-zone settings in Sanity · success/return page · Stripe test-mode build then live cutover · security review.

**Out (YAGNI — each addable later without rework):** product variants · live carrier postage (Shippo/USPS/EasyPost) · on-site browsable order history · automated sales tax · stock reservation/holds · customer accounts/login · discount codes · multi-currency (USD only at v1).

## Architecture

```
Browser (fattamano.com)                         Serverless (Astro hybrid, Vercel)        External
─────────────────────────                        ──────────────────────────────────      ─────────
[Catalog] --add to cart--> [Cart island]
   (localStorage)               |
                                | POST {items:[{productId,qty}]}
                                v
                         /api/checkout  --- re-fetch prices+stock (server) ---> Sanity (read)
                                |        --- create Checkout Session ----------> Stripe
                                |             ui_mode:'embedded'
                                |             permissions.update_shipping_details:'server_only'
                                |             shipping_address_collection.allowed_countries
                                | { clientSecret }
                                v
                    [EmbeddedCheckout iframe] (Stripe-hosted UI, on our page)
                                |
              customer enters address -> onShippingDetailsChange
                                |
                                | POST {sessionId, shippingDetails}
                                v
              /api/calculate-shipping-options -- zone lookup --> Sanity (settings, read)
                                |              -- sessions.update(shipping_options) --> Stripe
                                | { type:'accept' | 'reject' }
                                v
                       customer pays (card / wallet, handled in Stripe iframe)
                                |
                  return_url -> /checkout/return?session_id=...   (retrieve status, clear cart)
                                .
Stripe -- checkout.session.completed (webhook) --> /api/stripe-webhook
                                                        verify signature
                                                        idempotency check
                                                        decrement stock (Sanity WRITE token)
                                                        set status='sold_out' at 0
```

Key property: **price, stock, and shipping rate are computed server-side every time.** The browser only ever sends product ids + quantities and a shipping address. Nothing the client sends can change what is charged.

## Data model (Sanity)

### `fattamanoProduct` — add one field
| Field | Type | Required | Notes |
|---|---|---|---|
| `stock` | number (int ≥ 0) | yes (going forward) | Units available. Purchasable iff `status === 'available' && stock > 0`. Decremented by the webhook; `0` flips `status` to `sold_out`. |

- `priceCents` remains the **single source of price truth** — products are **not** mirrored into Stripe; the checkout endpoint builds line items from `priceCents` via inline `price_data`.
- `buyUrl` is **preserved as an escape hatch**: if set, the product renders an external "buy it" link (legacy/other-marketplace path) instead of "add to cart". Both models coexist.
- **Migration:** backfill `stock` on the two existing published products (`japanese-america-flag`, `permanent-underclass`).

### `fattamanoSettings` (singleton) — add shipping config
| Field | Type | Notes |
|---|---|---|
| `shippingZones` | array of `{ label: string, countryCodes: string[] (ISO-3166-1 alpha-2), rateCents: int ≥ 0 }` | Ordered list; first zone whose `countryCodes` contains the destination wins. |
| `shippingFallbackBehavior` | string enum `reject` \| `flatRate` | If a destination matches no zone. Default `reject` (shouldn't occur — `allowedCountries` is derived from the zones). |

- **`allowedCountries`** passed to Stripe's `shipping_address_collection` is **derived** = the union of all `shippingZones[].countryCodes`. No separate field — the zone table is the single source for "where we ship + what it costs."
- **Seed zones (placeholders Wilma edits):** `US → $5` · `Canada [CA] → $10` · `UK [GB] → $12` · `Europe [DE,FR,IT,ES,NL,IE,SE,...] → $15` · `Australia/NZ [AU,NZ] → $18`.

### `fattamanoCheckoutSession` (internal plumbing doc — no UI)
Created by `/api/checkout` and consumed by the webhook. It exists for correctness, **not** as customer-facing order history (Stripe Dashboard remains the order source of truth), and stores **no customer PII** (address/email live in Stripe only).

| Field | Type | Notes |
|---|---|---|
| `_id` | string | **Set to the Stripe session id** → uniqueness gives free idempotency. |
| `items` | array of `{ productId, qty }` | The validated cart; the webhook's authoritative source of what to decrement. Removes any dependence on Stripe `metadata` size limits. |
| `status` | enum `pending` \| `fulfilled` | Webhook flips `pending → fulfilled` exactly once. |
| `createdAt` | datetime | For housekeeping/cleanup of abandoned `pending` docs. |

## Components & endpoints

### Cart island (`src/components/cart/*.tsx`)
- React island; cart state in a small store, persisted to `localStorage` (survives refresh). Line: `{ productId, slug, title, priceCents, image, qty }`.
- UI: "Add to cart" (replaces the buy CTA for in-stock, non-`buyUrl` products), quantity stepper, remove, a cart drawer/page with item list + **display-only** subtotal, and a "Checkout" button.
- On checkout: POST `items: [{ productId, qty }]` to `/api/checkout` (no prices, no titles trusted).

### `POST /api/checkout.ts`
1. Validate request shape (array of `{ productId, qty:int>0 }`, sane length cap).
2. Re-fetch each product from Sanity by `_id` → authoritative `priceCents`, `title`, `image`, `status`, `stock`.
3. Reject if any item is missing, `status !== 'available'`, or `qty > stock` → structured error so the cart can flag the offending line ("X is sold out / only N left").
4. Read `fattamanoSettings` → derive `allowedCountries`.
5. Create a Stripe Checkout Session:
   - `ui_mode: 'embedded'`
   - `mode: 'payment'`
   - `line_items` via inline `price_data` (currency `usd`, `unit_amount = priceCents`, product name/image), `quantity`
   - `permissions: { update_shipping_details: 'server_only' }`
   - `shipping_address_collection: { allowed_countries }`
   - `shipping_options`: one placeholder rate (replaced live by the shipping callback)
   - `return_url: https://fattamano.com/checkout/return?session_id={CHECKOUT_SESSION_ID}`
6. `createIfNotExists` a `fattamanoCheckoutSession` doc (`_id = session.id`, `items`, `status:'pending'`) via the **write token** — this is the webhook's cart source and idempotency key.
7. Return `{ clientSecret: session.client_secret }`.

### Embedded checkout (`/checkout` page + `src/components/checkout/EmbeddedCheckout.tsx`)
- Client loads Stripe.js with `PUBLIC_STRIPE_PUBLISHABLE_KEY`, calls `/api/checkout`, then mounts `EmbeddedCheckoutProvider` (`@stripe/react-stripe-js`) with `{ clientSecret, onShippingDetailsChange }` wrapping `<EmbeddedCheckout />`. Payment UI is Stripe's, rendered in an iframe on our page — **we never handle card data** (PCI SAQ-A).
- `onShippingDetailsChange(shippingDetails)` → POST `/api/calculate-shipping-options` with `{ sessionId, shippingDetails }` → resolve with the returned `{ type }`.

### `POST /api/calculate-shipping-options.ts` (dynamic shipping)
- Per Stripe's custom-shipping-options flow (embedded UI). Steps: retrieve the session, validate the destination country, look up the matching `shippingZones` entry, then `stripe.checkout.sessions.update(sessionId, { shipping_options: [zoneRate], collected_information.shipping_details })`.
- Returns `{ type: 'accept' }`, or `{ type: 'reject', errorMessage }` if the destination is unsupported (defense-in-depth; `allowedCountries` should already prevent it).
- Reference: https://docs.stripe.com/payments/checkout/custom-shipping-options (embedded) and https://docs.stripe.com/payments/advanced/shipping. Exact callback/handler signatures pinned via Context7/Stripe docs during implementation.

### `POST /api/stripe-webhook.ts`
- Verify the Stripe signature with `STRIPE_WEBHOOK_SECRET` (read the **raw** request body — Astro/Vercel must not pre-parse it).
- Handle `checkout.session.completed` with `payment_status === 'paid'`.
- **Idempotency + cart source:** load the `fattamanoCheckoutSession` doc by `_id = session.id`. If it's missing or already `fulfilled`, no-op. Otherwise, in a **single Sanity transaction**, decrement each `items[].stock` (clamp at 0, set `status='sold_out'` at 0) **and** flip the doc to `fulfilled`. Doing both in one transaction means a Stripe retry can never decrement twice.
- Decrement uses the **server-only write token**.
- Return 2xx quickly; rely on Stripe retries for transient failures (safe because of the transactional idempotency).

### `/checkout/return` page
- Reads `session_id`, calls a tiny server route to retrieve session `status`/`payment_status`, shows a branded thank-you (or "still processing"), and **clears the cart** on success.

## Stock & availability logic (single definition, reused everywhere)
```
isPurchasable(product) = product.status === 'available' && (product.stock ?? 0) > 0
```
- Catalog/detail render: "add to cart" only when `isPurchasable` and no `buyUrl`; otherwise the existing status labels (`sold out`, `coming soon`, `tell me you want this`) or the external buy link.
- `/api/checkout` re-checks `isPurchasable` + `qty <= stock` server-side (the browser's view may be stale).

## Security model
- **No trusted client input affecting money:** prices from Sanity, shipping from the zone table, stock checked server-side. A tampered cart can at most get rejected.
- **Webhook authenticity:** signature verified against raw body; unsigned/invalid → 400.
- **Secret scoping:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SANITY_WRITE_TOKEN` are server-only (never `PUBLIC_`, never in the client bundle). `PUBLIC_STRIPE_PUBLISHABLE_KEY` is safe to expose by design.
- **Write-token least privilege:** the Sanity token is write-scoped to the dataset; used only by the two server endpoints that need it (`/api/checkout` to create the checkout-session doc, `/api/stripe-webhook` to decrement).
- **Minimal data retention:** the internal checkout-session doc stores only `{ items, status }` — no customer name/email/address. All PII stays in Stripe.
- **Transactional idempotency** prevents double-decrement on Stripe retries.
- **Gate:** the `security-veteran-reviewer` agent reviews `/api/checkout`, `/api/calculate-shipping-options`, and `/api/stripe-webhook` before the live-key cutover.

## Config & secrets (Vercel env)
| Var | Scope | Purpose |
|---|---|---|
| `STRIPE_SECRET_KEY` | server-only (Prod+Preview) | Create/update sessions, verify in webhook handlers |
| `STRIPE_WEBHOOK_SECRET` | server-only | Verify webhook signatures |
| `SANITY_WRITE_TOKEN` | server-only | Webhook stock decrement (write-scoped) |
| `PUBLIC_STRIPE_PUBLISHABLE_KEY` | public | Mount Embedded Checkout client-side |

Existing `PUBLIC_SANITY_PROJECT_ID` / `PUBLIC_SANITY_DATASET` already set. Build against **Stripe test mode** first (test keys + test cards + `stripe listen`/Stripe CLI to forward both the webhook and the shipping callback locally), then add live keys and register the production webhook endpoint before cutover.

## Testing strategy (TDD)
Implementation follows test-first for the pure logic units (the parts that hold money correct):
1. **Zone lookup** — country → correct `rateCents`; unsupported country → reject; ordering/precedence; fallback behavior.
2. **Checkout validation** — rejects unknown product, non-available status, `qty > stock`, malformed payload; never reads price from the request.
3. **Webhook decrement** — decrements correct quantities; sets `sold_out` at 0; never goes negative.
4. **Webhook idempotency** — replaying `checkout.session.completed` for the same session id decrements exactly once (driven by the `pending → fulfilled` transition).
- Manual end-to-end in Stripe test mode: add to cart → embedded checkout → enter US + an intl address (verify rate changes) → pay with a test card → confirm stock decrements and item flips to sold out at 0.

## DAOS reuse path (not built in v1)
The cart, `/api/checkout`, `/api/calculate-shipping-options`, and `/api/stripe-webhook` are written to take the **product source (Sanity query) and settings source as parameters**, with no fattamano-specific assumptions in the money path. Bringing checkout to DAOS later = point the same flow at the DAOS catalog (where an original is `stock: 1`) and give DAOS its own Stripe keys + zone settings. Shared logic candidates (zone lookup, checkout validation, stock decrement) may be lifted into `@lakeshore/shared-ui` at that point.

## Acceptance criteria (definition of done for v1)
1. A visitor can add multiple in-stock products to a cart that survives refresh.
2. Checkout renders Stripe Embedded Checkout **on fattamano.com** (no redirect to checkout.stripe.com).
3. Entering a US address vs. an international (shortlist) address shows the **correct zone shipping rate**, recalculated live.
4. Paying with a Stripe **test** card completes the order and lands on the branded return page; the cart clears.
5. The purchased product's `stock` decrements by the bought quantity; at `0` it shows as sold out across catalog + detail.
6. Replayed/duplicate webhook events do **not** double-decrement.
7. No secret (Stripe secret/webhook, Sanity write token) appears in the client bundle; prices/shipping cannot be altered from the browser.
8. `security-veteran-reviewer` has reviewed all three endpoints with no unresolved high-severity findings.
9. Wilma can edit shipping zones/rates and a product's stock entirely in Sanity Studio, no deploy.

## Open questions / to confirm with Wilma (non-blocking)
- Exact country shortlist + per-zone rates (placeholders above; she sets real values in Studio).
- Order notification preference: Stripe's built-in receipt + Dashboard email is the v1 default; a custom "you got an order" email is a later add.
