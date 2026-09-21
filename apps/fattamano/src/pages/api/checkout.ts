export const prerender = false;

import type { APIRoute } from 'astro';
import { getStripe } from '../../lib/server/stripe';
import { sanityWriteFetch } from '../../lib/server/sanityWrite';
import { orderClient, orderDocumentId } from '../../lib/server/orderStore';
import { queries } from '@lakeshore/shared-ui/sanity';
import { normalizeCartItems, buildOrderLines, cartSubtotalCents, BadCartError } from '../../lib/commerce/validateCart';
import { allowedCountries } from '../../lib/commerce/shipping';
import type Stripe from 'stripe';
import type { ProductRow, FattamanoSettings } from '../../lib/types';

const DEFAULT_RETURN_ORIGIN = 'https://fattamano.com';

function normalizeOrigin(value: string | undefined, label: string): string | null {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error(`${label} must use http or https`);
    }
    return url.origin;
  } catch (error) {
    if (error instanceof Error && error.message.includes('must use')) {
      throw error;
    }
    throw new Error(`${label} must be a valid absolute URL`);
  }
}

function checkoutReturnUrl(request: Request): string {
  const configuredOrigin = normalizeOrigin(
    import.meta.env.FATTAMANO_CHECKOUT_RETURN_ORIGIN,
    'FATTAMANO_CHECKOUT_RETURN_ORIGIN',
  );
  const requestOrigin = normalizeOrigin(request.url, 'request.url');
  const origin = configuredOrigin ?? requestOrigin ?? DEFAULT_RETURN_ORIGIN;
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

  // Authoritative product data (no CDN -> fresh stock). Prices/stock/status come
  // ONLY from this server-side read, never from the request body.
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
  // ui_mode `form` is the embedded form (Checkout Form Element). Stripe retired
  // `permissions.update_shipping_details` on every surface, so the rate is kept
  // authoritative by only ever writing shipping_options with our secret key.
  // allowed_countries is a strict ISO-3166 union; our zone table yields a dynamic
  // string[], so that one property is still cast.
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    ui_mode: 'form',
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
    // Placeholder rate; replaced live by /api/calculate-shipping-options once the
    // customer enters an address.
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
    metadata: { store: 'fattamano' },
  };
  const session = await stripe.checkout.sessions.create(sessionParams);

  // Detailed order state belongs in a private Sanity dataset. It intentionally
  // stores no customer PII; names, email, and shipping address remain in Stripe.
  // Immutable titles/prices make the fulfillment view useful even if catalog
  // copy changes after purchase.
  const now = new Date().toISOString();
  await orderClient().createIfNotExists({
    _id: orderDocumentId(session.id),
    _type: 'fattamanoCheckoutSession',
    items: lines.map((l) => ({
      _key: l.productId,
      productId: l.productId,
      title: l.title,
      unitAmountCents: l.unitAmountCents,
      qty: l.qty,
    })),
    subtotalCents: cartSubtotalCents(lines),
    status: 'pending', // legacy compatibility; paymentStatus is authoritative.
    paymentStatus: 'pending',
    fulfillmentStatus: 'new',
    notificationStatus: 'pending',
    analyticsRecorded: false,
    createdAt: now,
  } as any);

  return Response.json({ clientSecret: session.client_secret });
};
