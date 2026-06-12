export const prerender = false;

import type { APIRoute } from 'astro';
import { getStripe } from '../../lib/server/stripe';
import { sanityWriteFetch, sanityWriteClient } from '../../lib/server/sanityWrite';
import { requireServerEnv } from '../../lib/server/env';
import { queries } from '@lakeshore/shared-ui/sanity';
import { planStockDecrements } from '../../lib/commerce/stock';
import type { ProductRow } from '../../lib/types';

export const POST: APIRoute = async ({ request }) => {
  const stripe = getStripe();
  const sig = request.headers.get('stripe-signature') || '';
  const raw = await request.text(); // RAW body - required for signature verification

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
  const doc = await sanityWriteFetch<{ _id: string; _rev: string; status: string; items: { productId: string; qty: number }[] } | null>(
    `*[_type == "fattamanoCheckoutSession" && _id == $id][0]{ _id, _rev, status, items }`,
    { id: session.id }
  );
  if (!doc || doc.status === 'fulfilled') {
    return new Response('already handled', { status: 200 }); // idempotent fast path
  }

  const ids = doc.items.map((i) => i.productId);
  const rows = await sanityWriteFetch<ProductRow[]>(queries.fattamanoProductsByIds, { ids });
  const changes = planStockDecrements(doc.items, rows);

  // One transaction: all decrements + flip to fulfilled, GUARDED by the doc's
  // revision (ifRevisionId). If a concurrent duplicate delivery already flipped
  // it, the revision won't match and the ENTIRE transaction is rejected - so
  // stock is never decremented twice. This closes the read-check-then-write race
  // that a plain status check leaves open (Stripe can deliver an event >once).
  try {
    let tx = client.transaction();
    for (const c of changes) {
      tx = tx.patch(c.productId, (p) =>
        p.set({ stock: c.newStock, ...(c.soldOut ? { status: 'sold_out' } : {}) })
      );
    }
    tx = tx.patch(doc._id, (p) => p.ifRevisionId(doc._rev).set({ status: 'fulfilled' }));
    await tx.commit();
  } catch (err: any) {
    // Revision mismatch / 409 === another delivery won the race -> already handled.
    const msg = String(err?.message || '');
    if (err?.statusCode === 409 || msg.toLowerCase().includes('revision')) {
      return new Response('already handled (raced)', { status: 200 });
    }
    return new Response('error', { status: 500 }); // real error -> let Stripe retry
  }

  return new Response('ok', { status: 200 });
};
