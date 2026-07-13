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
7. Sanity dataset ACL is dataset-wide; it cannot hide one document type while keeping public product documents readable. Internal orders must move to a private dataset (or another private store).
8. Moving orders introduces a cross-dataset idempotency boundary. A minimal public stock receipt is required so product stock and the receipt can still commit atomically while detailed order data stays private.

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

- Use a private Sanity dataset named `fattamano-orders` for detailed order and aggregate analytics documents.
- Keep a minimal `fattamanoStockReceipt` document in public `production`; its hashed ID and applied state contain no cart, total, Stripe ID, or PII. It exists only to preserve atomic stock idempotency.
- Send merchant order email through Resend's HTTPS API with an idempotency key derived from the Stripe Checkout Session ID. Never store Resend or Stripe secrets in source.
- Retry notification failures through Stripe webhook retries; a paid order whose notification is not `sent` continues returning 500 until the notification succeeds.
- Store `paymentStatus` separately from merchant-editable `fulfillmentStatus` (`new`, `packing`, `shipped`, `cancelled`).
- Record privacy-conscious daily aggregate funnel counters in the private dataset. Completed purchases are incremented transactionally with the private paid-order transition.

## External prerequisites / deployment gates

- A Sanity project administrator must create private dataset `fattamano-orders`; the current Editor token can list datasets but lacks `sanity.project.datasets/create`.
- The production Sanity write token must have read/write access to both `production` and `fattamano-orders`.
- Production needs `SANITY_ORDER_DATASET=fattamano-orders`.
- Production needs Resend configuration: `RESEND_API_KEY`, `FATTAMANO_ORDER_NOTIFICATION_TO`, and a verified `FATTAMANO_ORDER_NOTIFICATION_FROM`.
- Existing public `fattamanoCheckoutSession` documents must be migrated, verified in the private dataset, and deleted from `production` before the privacy step is complete.
