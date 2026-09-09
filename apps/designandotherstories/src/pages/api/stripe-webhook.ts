export const prerender = false;

import type { APIRoute } from 'astro';
import { getStripe } from '../../lib/server/stripe';
import { sanityWriteFetch } from '../../lib/server/sanityWrite';
import { orderClient, orderDocumentId, orderFetch } from '../../lib/server/orderStore';
import { sendOrderNotification } from '../../lib/server/orderNotification';
import { requireServerEnv } from '../../lib/server/env';
import { queries } from '@lakeshore/shared-ui/sanity';
import { planFulfillment } from '../../lib/commerce/stock';
import { notificationClaimable } from '../../lib/commerce/orderWorkflow';
import type { ProductRow, DaosProductType } from '../../lib/types';

interface OrderItem {
  productId: string;
  type: DaosProductType;
  title: string;
  unitAmountCents: number;
  qty: number;
  styleLabel?: string;
}

interface OrderDocument {
  _id: string;
  _rev: string;
  status?: string;
  paymentStatus?: 'pending' | 'paid';
  fulfillmentStatus?: 'new' | 'packing' | 'shipped' | 'cancelled';
  notificationStatus?: 'pending' | 'sending' | 'sent' | 'failed';
  notificationAttemptedAt?: string;
  items: OrderItem[];
}

function isRevisionConflict(error: unknown): boolean {
  const candidate = error as { statusCode?: number; message?: string };
  return candidate?.statusCode === 409 || String(candidate?.message || '').toLowerCase().includes('revision');
}

async function loadOrder(checkoutSessionId: string): Promise<OrderDocument | null> {
  return orderFetch<OrderDocument | null>(
    `*[_type == "daosCheckoutSession" && _id == $id][0]{
      _id, _rev, status, paymentStatus, fulfillmentStatus,
      notificationStatus, notificationAttemptedAt,
      items[]{ productId, type, title, unitAmountCents, qty, styleLabel }
    }`,
    { id: orderDocumentId(checkoutSessionId) },
  );
}

/**
 * Inventory and paid state move in one revision-guarded transaction, so a
 * duplicate Stripe delivery can never decrement stock or mark an original sold
 * twice. Fulfillment stays type-aware: originals are unique, shopProducts with
 * a numeric stock decrement, and unlimited shopProducts are never written back.
 */
async function applyPaidOrderOnce(
  order: OrderDocument,
  session: any,
  eventId: string,
): Promise<OrderDocument> {
  if (order.paymentStatus === 'paid') return order;

  const ids = order.items.map((item) => item.productId);
  const rows = await sanityWriteFetch<ProductRow[]>(queries.daosProductsByIds, { ids });
  const patches = planFulfillment(order.items, rows);
  const now = new Date();

  let transaction = orderClient().transaction();
  for (const patch of patches) {
    transaction = transaction.patch(patch.productId, (p) => p.set(patch.set));
  }
  transaction = transaction.patch(order._id, (p) =>
    p.ifRevisionId(order._rev).set({
      status: 'fulfilled', // legacy: Stripe/stock processing completed.
      paymentStatus: 'paid',
      fulfillmentStatus: order.fulfillmentStatus ?? 'new',
      paidAt: now.toISOString(),
      stripeEventId: eventId,
      amountTotalCents: session.amount_total ?? 0,
      currency: session.currency ?? 'usd',
    }),
  );

  try {
    await transaction.commit();
  } catch (error) {
    // A revision conflict means a concurrent delivery won the race and applied
    // the same work; anything else is real and must reach Stripe as a 5xx.
    if (!isRevisionConflict(error)) throw error;
  }

  const refreshed = await loadOrder(session.id);
  if (refreshed?.paymentStatus !== 'paid') {
    throw new Error('Paid order transaction did not complete');
  }
  return refreshed;
}

async function notifyMerchant(order: OrderDocument, session: any): Promise<'sent' | 'busy'> {
  if (order.notificationStatus === 'sent') return 'sent';
  if (!notificationClaimable(order)) return 'busy';

  // Claim the send with a revision guard first, so two concurrent deliveries
  // cannot both dispatch the email.
  const attemptedAt = new Date().toISOString();
  try {
    await orderClient()
      .patch(order._id)
      .ifRevisionId(order._rev)
      .set({ notificationStatus: 'sending', notificationAttemptedAt: attemptedAt })
      .commit();
  } catch (error) {
    if (isRevisionConflict(error)) return 'busy';
    throw error;
  }

  try {
    const result = await sendOrderNotification({
      sessionId: session.id,
      amountTotalCents: session.amount_total ?? 0,
      currency: session.currency ?? 'usd',
      livemode: session.livemode === true,
      items: order.items,
    });
    await orderClient()
      .patch(order._id)
      .set({ notificationStatus: 'sent', notificationSentAt: new Date().toISOString(), notificationMessageId: result.id })
      .unset(['notificationError'])
      .commit();
    return 'sent';
  } catch (error) {
    await orderClient()
      .patch(order._id)
      .set({
        notificationStatus: 'failed',
        notificationError: String((error as Error)?.message || error).slice(0, 500),
      })
      .commit()
      .catch(() => {});
    throw error;
  }
}

export const POST: APIRoute = async ({ request }) => {
  const stripe = getStripe();
  const signature = request.headers.get('stripe-signature') || '';
  const raw = await request.text(); // RAW body — required for signature verification

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, requireServerEnv('STRIPE_WEBHOOK_SECRET'));
  } catch {
    return new Response('Bad signature', { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') return new Response('ignored', { status: 200 });
  const session = event.data.object as any;
  if (session.payment_status !== 'paid') return new Response('not paid', { status: 200 });

  try {
    let order = await loadOrder(session.id);
    if (!order) return new Response('order state missing', { status: 500 });

    order = await applyPaidOrderOnce(order, session, event.id);

    // The order is already recorded and stock already moved; a 500 here only
    // asks Stripe to retry the email, which client_id idempotency makes safe.
    const notification = await notifyMerchant(order, session);
    if (notification !== 'sent') return new Response('notification in progress; retry', { status: 500 });

    return new Response('ok', { status: 200 });
  } catch (error: any) {
    // Stripe retries 5xx deliveries. Provider response bodies and secrets are
    // deliberately not returned; only a terse reason is logged.
    console.error('[stripe-webhook] delivery failed', { session: session?.id, message: error?.message });
    return new Response('error', { status: 500 });
  }
};
