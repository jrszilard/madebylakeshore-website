# fattamano store operations

## Production environment

Server-only values:

- `STRIPE_SECRET_KEY` — restricted Stripe key with Checkout Sessions write/read access.
- `STRIPE_WEBHOOK_SECRET` — signing secret for the fattamano webhook endpoint.
- `SANITY_WRITE_TOKEN` — token used for token-only order, stock, and aggregate-counter writes.
- `RESEND_API_KEY` — server-only Resend API key.
- `FATTAMANO_ORDER_NOTIFICATION_TO` — Wilma's order-alert mailbox.
- `FATTAMANO_ORDER_NOTIFICATION_FROM` — verified sender, e.g. `fattamano orders <orders@fattamano.com>`.

Client-safe existing values remain `PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET`, and `PUBLIC_STRIPE_PUBLISHABLE_KEY`.

## One-time order privacy migration

The shared Sanity plan does not support private datasets. Sanity does, however, exclude dotted document IDs from unauthenticated public reads—the same mechanism already used for the backend-only visitor counter.

Run from the repository root with the Studio environment loaded:

```bash
set -a
source studio/.env
set +a

# Preview only
npm run migrate:fattamano-orders

# Copy legacy orders to hashed, dotted IDs
npm run migrate:fattamano-orders -- --apply

# After checking /fattamano-orders in Studio, remove legacy public docs
npm run migrate:fattamano-orders -- --apply --delete-source
```

The migration enriches legacy lines, verifies every dotted target through the authenticated client, then verifies those same IDs return zero documents through an unauthenticated client. Public source deletion requires a separate explicit flag. Historical paid orders are marked notification-sent and analytics-recorded so retries cannot emit old alerts or inflate counts.

## Order lifecycle

1. Checkout creates the order at a deterministic `fattamano.order.<sha256>` ID. The Stripe ID itself is not stored in the document ID.
2. Stripe sends signed `checkout.session.completed`.
3. Product stock, paid order state, and the completed-purchase aggregate commit in one revision-guarded Sanity transaction, preserving exactly-once behavior.
4. Resend receives an idempotent merchant alert. A failure returns HTTP 500 so Stripe retries; stale notification claims can be reclaimed after five minutes.
5. In Studio, open `/fattamano-orders` and move orders through **New → Packing → Shipped**. Customer/shipping details remain in Stripe.

## Funnel counters

Token-only dotted aggregate documents record:

- `product_view`
- `add_to_cart`
- `checkout_started`
- `purchase_completed`

No event document stores an IP address, user agent, cookie, customer ID, email, or browsing session. Browser events are accepted only from same-site/production origins. Completed purchases are recorded server-side from the signed Stripe webhook.

Useful GROQ in the internal workspace Vision tool:

```groq
*[_type == "fattamanoAnalyticsDaily"] | order(day desc) {
  day, event, productSlug, count
}
```

## Alert troubleshooting

- **Notification failures** are visible as a dedicated Studio order list.
- Confirm all three Resend environment variables exist; never paste values into source, logs, or Sanity.
- Resend requests use `Idempotency-Key: fattamano-order-<checkout-session-id>` to avoid duplicate email when Stripe retries.
- Do not manually change payment or notification fields in Sanity. Only `fulfillmentStatus`, `fulfillmentNote`, and `shippedAt` are operationally editable.
