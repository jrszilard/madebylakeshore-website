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
