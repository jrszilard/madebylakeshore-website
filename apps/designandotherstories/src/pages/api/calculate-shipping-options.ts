export const prerender = false;

import type { APIRoute } from 'astro';
import { getStripe } from '../../lib/server/stripe';
import { sanityWriteFetch } from '../../lib/server/sanityWrite';
import { orderDocumentId } from '../../lib/server/orderStore';
import { queries } from '@lakeshore/shared-ui/sanity';
import { resolveShippingOption } from '../../lib/commerce/shipping';
import type { DaosShopSettings } from '../../lib/types';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  const sessionId = body?.checkoutSessionId;
  const shippingDetails = body?.shippingDetails;
  const country = shippingDetails?.address?.country;
  if (typeof sessionId !== 'string') {
    return Response.json({ type: 'error', message: 'Invalid request' }, { status: 400 });
  }

  // Only act on sessions WE created and that are still pending. Without this, a
  // client could call sessions.update against an arbitrary Stripe session id.
  const known = await sanityWriteFetch<{ _id: string; subtotalCents?: number } | null>(
    `*[_type == "daosCheckoutSession" && _id == $id && status == "pending"][0]{ _id, subtotalCents }`,
    { id: orderDocumentId(sessionId) }
  );
  if (!known) {
    return Response.json({ type: 'error', message: 'Unknown checkout session' }, { status: 404 });
  }

  // Authoritative zone table (server-side read); allowed countries / rates are
  // never trusted from the request body. The subtotal comes from the stored
  // session doc (server-priced at checkout), so free-shipping thresholds can't be
  // spoofed by the client.
  const settings = await sanityWriteFetch<DaosShopSettings>(queries.daosShopSettings);
  const option = resolveShippingOption(
    country ?? '',
    settings?.shippingZones ?? [],
    known.subtotalCents ?? 0
  );
  if (!option) {
    return Response.json({ type: 'error', message: "We can't ship there yet." }, { status: 200 });
  }

  // The embedded form collects the address on the client and Stripe records it on
  // the session, so we set only the resolved rate here. shipping_options is a
  // secret-key write, which is what keeps the rate authoritative: the customer
  // cannot choose their own shipping price.
  await getStripe().checkout.sessions.update(sessionId, {
    shipping_options: [
      {
        shipping_rate_data: {
          display_name: `Shipping — ${option.label}`,
          type: 'fixed_amount',
          fixed_amount: { amount: option.rateCents, currency: 'usd' },
        },
      },
    ],
  });

  return Response.json({ type: 'object', value: { succeeded: true } });
};
