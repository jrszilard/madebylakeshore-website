export const prerender = false;

import type { APIRoute } from 'astro';
import { getStripe } from '../../lib/server/stripe';
import { sanityWriteFetch, sanityWriteClient } from '../../lib/server/sanityWrite';
import { requireServerEnv } from '../../lib/server/env';
import { queries } from '@lakeshore/shared-ui/sanity';
import { planFulfillment } from '../../lib/commerce/stock';
import type { ProductRow, DaosProductType } from '../../lib/types';

export const POST: APIRoute = async ({ request }) => {
  const stripe = getStripe();
  const sig = request.headers.get('stripe-signature') || '';
  const raw = await request.text(); // RAW body — required for signature verification

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, requireServerEnv('STRIPE_WEBHOOK_SECRET'));
  } catch {
    return new Response('Bad signature', { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return new Response('ignored', { status: 200 });
  }
  const session = event.data.object as any;
  if (session.payment_status !== 'paid') return new Response('not paid', { status: 200 });

  const client = sanityWriteClient();
  const doc = await sanityWriteFetch<{
    _id: string;
    _rev: string;
    status: string;
    items: { productId: string; type: DaosProductType; qty: number }[];
  } | null>(
    `*[_type == "daosCheckoutSession" && _id == $id][0]{ _id, _rev, status, items[]{ productId, type, qty } }`,
    { id: session.id }
  );
  if (!doc || doc.status === 'fulfilled') {
    return new Response('already handled', { status: 200 }); // idempotent fast path
  }

  const ids = doc.items.map((i) => i.productId);
  const rows = await sanityWriteFetch<ProductRow[]>(queries.daosProductsByIds, { ids });
  const patches = planFulfillment(doc.items, rows);

  // One transaction: all writes + flip to fulfilled, GUARDED by the doc revision.
  // A concurrent duplicate delivery will fail the ifRevisionId check and roll back
  // the entire transaction, so nothing is fulfilled twice.
  try {
    let tx = client.transaction();
    for (const p of patches) {
      tx = tx.patch(p.productId, (patch) => patch.set(p.set));
    }
    tx = tx.patch(doc._id, (patch) => patch.ifRevisionId(doc._rev).set({ status: 'fulfilled' }));
    await tx.commit();
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (err?.statusCode === 409 || msg.toLowerCase().includes('revision')) {
      return new Response('already handled (raced)', { status: 200 });
    }
    return new Response('error', { status: 500 }); // real error → let Stripe retry
  }

  return new Response('ok', { status: 200 });
};
