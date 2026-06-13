export const prerender = false;

import type { APIRoute } from 'astro';
import { getStripe } from '../../lib/server/stripe';
import { sanityWriteFetch, sanityWriteClient } from '../../lib/server/sanityWrite';
import { queries } from '@lakeshore/shared-ui/sanity';
import { normalizeCartItems, buildOrderLines, BadCartError } from '../../lib/commerce/validateCart';
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
  // The known fields below are checked against the SDK's SessionCreateParams.
  // `permissions.update_shipping_details` is runtime-valid for embedded custom
  // shipping but is absent from stripe@17 types, so it is merged in via a cast on
  // the whole literal (a per-property cast does not suppress the excess-property
  // check). allowed_countries is a strict ISO-3166 union; our zone table yields a
  // dynamic string[], so it is cast too.
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
    // server_only disables Stripe's automatic client-side shipping update so the
    // rate is set exclusively by /api/calculate-shipping-options.
    permissions: { update_shipping_details: 'server_only' },
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
  } as unknown as Stripe.Checkout.SessionCreateParams;
  const session = await stripe.checkout.sessions.create(sessionParams);

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
