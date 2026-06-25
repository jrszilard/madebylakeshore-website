export const prerender = false;

import type { APIRoute } from 'astro';
import { getStripe } from '../../lib/server/stripe';
import { sanityWriteFetch } from '../../lib/server/sanityWrite';
import { queries } from '@lakeshore/shared-ui/sanity';
import { resolveShippingOption } from '../../lib/commerce/shipping';
import type { DaosShopSettings } from '../../lib/types';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  const sessionId = body?.checkoutSessionId;
  const shippingDetails = body?.shippingDetails;
  const country = shippingDetails?.address?.country;
  if (typeof sessionId !== 'string') {
    return Response.json({ type: 'reject' }, { status: 400 });
  }

  // Only act on sessions WE created and that are still pending. Without this, a
  // client could call sessions.update against an arbitrary Stripe session id.
  const known = await sanityWriteFetch<{ _id: string; subtotalCents?: number } | null>(
    `*[_type == "daosCheckoutSession" && _id == $id && status == "pending"][0]{ _id, subtotalCents }`,
    { id: sessionId }
  );
  if (!known) {
    return Response.json({ type: 'reject' }, { status: 404 });
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
    return Response.json({ type: 'reject', message: "We can't ship there yet." }, { status: 200 });
  }

  // For embedded custom shipping with permissions.update_shipping_details =
  // server_only, the session update must echo BOTH the customer's shipping
  // details AND the resolved shipping_options (per Stripe's custom-shipping-options
  // guide: "Update the Checkout Session with the customer's shipping_details and
  // the shipping_options"). SessionUpdateParams in stripe@17 types omits
  // shipping_options, so the payload is cast.
  await getStripe().checkout.sessions.update(sessionId, {
    collected_information: shippingDetails ? { shipping_details: shippingDetails } : undefined,
    shipping_options: [
      {
        shipping_rate_data: {
          display_name: `Shipping — ${option.label}`,
          type: 'fixed_amount',
          fixed_amount: { amount: option.rateCents, currency: 'usd' },
        },
      },
    ],
  } as any);

  return Response.json({ type: 'accept' });
};
