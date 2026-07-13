# fattamano store operations

## Production environment

Server-only values:

- `STRIPE_SECRET_KEY` — restricted Stripe key with Checkout Sessions write/read access.
- `STRIPE_WEBHOOK_SECRET` — signing secret for the fattamano webhook endpoint.
- `SANITY_WRITE_TOKEN` — token with read/write access to `production` and `fattamano-orders`.
- `SANITY_ORDER_DATASET=fattamano-orders` — private operational dataset.
- `RESEND_API_KEY` — server-only Resend API key.
- `FATTAMANO_ORDER_NOTIFICATION_TO` — Wilma's order-alert mailbox.
- `FATTAMANO_ORDER_NOTIFICATION_FROM` — verified Resend sender, e.g. `fattamano orders <orders@fattamano.com>`.

Client-safe existing values remain `PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET`, and `PUBLIC_STRIPE_PUBLISHABLE_KEY`.

## One-time private-dataset migration

A Sanity project administrator must create a dataset named `fattamano-orders` with **private** visibility. The Editor token cannot create datasets.

Then run from the repository root with the Studio environment loaded:

```bash
set -a
source studio/.env
set +a
export SANITY_STUDIO_ORDER_DATASET=fattamano-orders

# Preview only
npm run migrate:fattamano-orders

# Copy orders + create minimal public stock receipts
npm run migrate:fattamano-orders -- --apply

# After checking /fattamano-orders in Studio, remove public order docs
npm run migrate:fattamano-orders -- --apply --delete-source
```

The migration refuses to run unless the target exists and reports `aclMode: private`. Historical paid orders are marked notification-sent and analytics-recorded so webhook retries cannot emit old alerts or inflate new funnel counts.

## Order lifecycle

1. Checkout creates detailed order state in private `fattamano-orders` and an opaque, content-free stock receipt in public `production`.
2. Stripe sends signed `checkout.session.completed`.
3. Product stock + public receipt commit atomically, preserving exactly-once stock decrement.
4. Private order transitions to paid/new while `purchase_completed` increments in the same private transaction.
5. Resend receives an idempotent merchant alert. A failure returns HTTP 500 so Stripe retries; stale notification claims can be reclaimed after five minutes.
6. In Studio, open `/fattamano-orders` and move orders through **New → Packing → Shipped**. Customer/shipping details remain in Stripe.

## Funnel counters

The private workspace contains aggregate daily counters for:

- `product_view`
- `add_to_cart`
- `checkout_started`
- `purchase_completed`

No event document stores an IP address, user agent, cookie, customer ID, email, or browsing session. Browser events are accepted only from same-site/production origins. Completed purchases are recorded server-side from the signed Stripe webhook.

Useful GROQ in the private workspace Vision tool:

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
