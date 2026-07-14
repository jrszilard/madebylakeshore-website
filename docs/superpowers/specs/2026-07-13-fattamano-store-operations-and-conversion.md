# fattamano Store Operations, Privacy, and Conversion Audit

**Date:** 2026-07-13
**Status:** Approved / implementation in progress
**App:** `apps/fattamano`

## Existing strengths

- Stripe Embedded Checkout uses server-authoritative prices, stock, countries, and shipping rates.
- Webhook signatures are verified against the raw body.
- Stock decrement and the legacy `status: fulfilled` transition share one revision-guarded Sanity transaction, preventing duplicate stock decrements.
- Customer PII remains in Stripe; Sanity order documents contain only product IDs, quantities, totals, and operational state.
- Free US shipping at the configured threshold is enforced server-side and surfaced in the cart.

## Exact gaps found

### Order operations

1. A successful payment decrements stock but sends no dedicated merchant alert. Stripe dashboard/email is the only notification path.
2. Duplicate webhook deliveries return early after stock fulfillment, so adding a naive notification after the transaction would not retry safely.
3. `status: fulfilled` means “payment/stock processed,” not “packed and shipped.” There is no merchant-editable fulfillment lifecycle.
4. The Studio order schema is globally `readOnly`, preventing operational updates, and the structure exposes only one undifferentiated order list.
5. Order line documents store IDs and quantities but not immutable display titles/unit prices, making the Studio list harder to fulfill after product copy changes.

### Privacy and access

6. The shared `production` Sanity dataset is public. `fattamanoCheckoutSession` documents are therefore queryable without a token. They contain no customer PII but reveal order timing, volume, cart contents, and totals.
7. Sanity dataset ACL is dataset-wide, and this project's plan does not permit private datasets. The compatible token-only mechanism is a dotted document ID, already proven by the backend-only visitor counter.
8. Orders need deterministic hashed dotted IDs so checkout/shipping/webhook code can locate them without storing the raw Stripe ID in the document ID, while stock and order state remain transactionally atomic.

### Conversion and customer experience

9. Product cards say “inspect” rather than clearly signaling that an available item can be purchased; they do not show low-stock state or the free-shipping threshold.
10. Product pages do not clearly state live availability, remaining stock, shipping terms, secure Stripe checkout, or handmade fulfillment expectations.
11. Product pages offer no related-product path, despite the free-shipping threshold intentionally encouraging three-sticker baskets.
12. Checkout lacks an order-context/reassurance panel around the embedded Stripe form.
13. Cart dialog behavior lacks Escape handling, focus movement, scroll locking, and a visible secure-checkout reassurance.

### Measurement

14. There is no conversion funnel measurement. Product views, add-to-cart, checkout starts, and completed purchases cannot be compared.
15. A conventional user analytics profile is unnecessary. Aggregate daily counters can measure the funnel without storing IP addresses, user agents, cookies, customer IDs, or event-level browsing histories.

## Implementation decisions

- Store orders at `fattamano.order.<sha256(checkout-session-id)>`; Sanity excludes dotted IDs from unauthenticated reads while authenticated Studio/server clients retain access.
- Store daily aggregates under `fattamano.analytics.*` dotted IDs for the same token-only behavior.
- Keep product stock, paid order state, and completed-purchase aggregate in one revision-guarded transaction.
- Send merchant order email through Resend's HTTPS API with an idempotency key derived from the Stripe Checkout Session ID. Never store Resend or Stripe secrets in source.
- Retry notification failures through Stripe webhook retries; a paid order whose notification is not `sent` continues returning 500 until the notification succeeds.
- Store `paymentStatus` separately from merchant-editable `fulfillmentStatus` (`new`, `packing`, `shipped`, `cancelled`).
- Record privacy-conscious daily aggregate funnel counters under token-only dotted IDs. Completed purchases increment in the same transaction that marks the order paid.

## External prerequisites / deployment gates

- Production needs Resend configuration: `RESEND_API_KEY`, `FATTAMANO_ORDER_NOTIFICATION_TO`, and a verified `FATTAMANO_ORDER_NOTIFICATION_FROM`.
- Existing public `fattamanoCheckoutSession` documents must be copied to hashed dotted IDs, verified as invisible through an unauthenticated client, and then deleted before the privacy step is complete.
