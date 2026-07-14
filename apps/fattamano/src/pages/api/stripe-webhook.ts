export const prerender = false;

import type { APIRoute } from 'astro';
import { getStripe } from '../../lib/server/stripe';
import { sanityWriteFetch } from '../../lib/server/sanityWrite';
import { orderClient, orderDocumentId, orderFetch } from '../../lib/server/orderStore';
import { sendOrderNotification } from '../../lib/server/orderNotification';
import { analyticsDocument } from '../../lib/analytics/events';
import { requireServerEnv } from '../../lib/server/env';
import { queries } from '@lakeshore/shared-ui/sanity';
import { planStockDecrements } from '../../lib/commerce/stock';
import { notificationClaimable } from '../../lib/commerce/orderWorkflow';
import type { ProductRow } from '../../lib/types';

interface OrderItem {
  productId: string;
  title: string;
  unitAmountCents: number;
  qty: number;
}

interface OrderDocument {
  _id: string;
  _rev: string;
  status?: string;
  paymentStatus?: 'pending' | 'paid';
  fulfillmentStatus?: 'new' | 'packing' | 'shipped' | 'cancelled';
  notificationStatus?: 'pending' | 'sending' | 'sent' | 'failed';
  notificationAttemptedAt?: string;
  analyticsRecorded?: boolean;
  items: OrderItem[];
}

function isRevisionConflict(error: unknown): boolean {
  const candidate = error as { statusCode?: number; message?: string };
  return candidate?.statusCode === 409 || String(candidate?.message || '').toLowerCase().includes('revision');
}

async function loadOrder(checkoutSessionId: string): Promise<OrderDocument | null> {
  return orderFetch<OrderDocument | null>(
    `*[_type == "fattamanoCheckoutSession" && _id == $id][0]{
      _id, _rev, status, paymentStatus, fulfillmentStatus,
      notificationStatus, notificationAttemptedAt, analyticsRecorded,
      items[]{ productId, title, unitAmountCents, qty }
    }`,
    { id: orderDocumentId(checkoutSessionId) },
  );
}

/**
 * Products, paid state, and the purchase aggregate all share one dataset and
 * one revision-guarded transaction. A duplicate Stripe delivery can therefore
 * never decrement stock or count a purchase twice.
 */
async function applyPaidOrderOnce(
  order: OrderDocument,
  session: any,
  eventId: string,
): Promise<OrderDocument> {
  if (order.paymentStatus === 'paid' && order.analyticsRecorded) return order;

  const ids = order.items.map((item) => item.productId);
  const rows = await sanityWriteFetch<ProductRow[]>(queries.fattamanoProductsByIds, { ids });
  const changes = planStockDecrements(order.items, rows);
  const now = new Date();
  const aggregate = analyticsDocument({ event: 'purchase_completed' }, now);

  let transaction = orderClient().transaction().createIfNotExists(aggregate);
  transaction = transaction.patch(aggregate._id, (patch) =>
    patch.inc({ count: 1 }).set({ updatedAt: now.toISOString() }),
  );
  for (const change of changes) {
    transaction = transaction.patch(change.productId, (patch) =>
      patch.set({ stock: change.newStock, ...(change.soldOut ? { status: 'sold_out' } : {}) }),
    );
  }
  transaction = transaction.patch(order._id, (patch) =>
    patch.ifRevisionId(order._rev).set({
      status: 'fulfilled', // legacy: Stripe/stock processing completed.
      paymentStatus: 'paid',
      fulfillmentStatus: order.fulfillmentStatus ?? 'new',
      paidAt: now.toISOString(),
      stripeEventId: eventId,
      amountTotalCents: session.amount_total ?? 0,
      currency: session.currency ?? 'usd',
      analyticsRecorded: true,
    }),
  );

  try {
    await transaction.commit();
  } catch (error) {
    if (!isRevisionConflict(error)) throw error;
  }

  const refreshed = await loadOrder(session.id);
  if (!refreshed?.analyticsRecorded || refreshed.paymentStatus !== 'paid') {
    throw new Error('Paid order transaction did not complete');
  }
  return refreshed;
}

async function notifyMerchant(order: OrderDocument, session: any): Promise<'sent' | 'busy'> {
  if (order.notificationStatus === 'sent') return 'sent';
  if (!notificationClaimable(order)) return 'busy';

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
  const raw = await request.text();

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
    const notification = await notifyMerchant(order, session);
    if (notification !== 'sent') return new Response('notification in progress; retry', { status: 500 });

    return new Response('ok', { status: 200 });
  } catch {
    // Stripe retries 5xx deliveries. Secrets and provider response bodies are
    // deliberately not returned or logged by this endpoint.
    return new Response('error', { status: 500 });
  }
};
