import { optionalServerEnv } from './env';

export interface NotificationOrderItem {
  title: string;
  qty: number;
  unitAmountCents: number;
}

export interface OrderNotification {
  sessionId: string;
  amountTotalCents: number;
  currency: string;
  livemode: boolean;
  items: NotificationOrderItem[];
}

export interface NotificationConfig {
  apiKey: string;
  inboxId: string;
  to: string;
}

export interface NotificationResult {
  id: string;
}

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function notificationConfig(env?: Record<string, string | undefined>): NotificationConfig {
  // Each setting is asked for by name when an alert is sent (env.ts). This file used to read Astro's whole
  // build-time settings object, and Astro copies into the bundle any setting whose name appears in a file that
  // touches that object: a build made beside .env.local would have carried the AgentMail key inside the Worker.
  const read = (name: string) => (env ? env[name] : optionalServerEnv(name))?.trim();
  const apiKey = read('AGENTMAIL_API_KEY');
  const inboxId = read('AGENTMAIL_INBOX_ID');
  const to = read('FATTAMANO_ORDER_NOTIFICATION_TO');
  if (!apiKey || !inboxId || !to) {
    throw new Error(
      'Order notifications require AGENTMAIL_API_KEY, AGENTMAIL_INBOX_ID, and FATTAMANO_ORDER_NOTIFICATION_TO',
    );
  }
  return { apiKey, inboxId, to };
}

export function buildOrderEmail(order: OrderNotification) {
  const lines = order.items.map(
    (item) => `${item.qty} × ${item.title} — ${money(item.qty * item.unitAmountCents, order.currency)}`,
  );
  const dashboardUrl = order.livemode
    ? 'https://dashboard.stripe.com/payments'
    : 'https://dashboard.stripe.com/test/payments';
  const subject = `${order.livemode ? '' : '[TEST] '}New fattamano order — ${money(order.amountTotalCents, order.currency)}`;
  const text = [
    'A paid fattamano order is ready to fulfill.',
    '',
    ...lines,
    '',
    `Total: ${money(order.amountTotalCents, order.currency)}`,
    `Checkout Session: ${order.sessionId}`,
    `Open Stripe for customer and shipping details: ${dashboardUrl}`,
    '',
    'Update fulfillment status in the fattamano Orders Studio workspace.',
  ].join('\n');

  return { subject, text };
}

/**
 * AgentMail draft creation supports deterministic client_id idempotency. The
 * provider schedules the draft immediately, so a crash after the API response
 * can safely retry without creating or sending a duplicate message.
 */
export async function sendOrderNotification(
  order: OrderNotification,
  config = notificationConfig(),
  fetcher: typeof fetch = fetch,
): Promise<NotificationResult> {
  const { subject, text } = buildOrderEmail(order);
  const response = await fetcher(
    `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(config.inboxId)}/drafts`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: config.to,
        subject,
        text,
        client_id: `fattamano-order-${order.sessionId}`,
        send_at: new Date(Date.now() + 1000).toISOString(),
      }),
    },
  );

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Order notification failed (${response.status}): ${detail}`);
  }
  const payload = (await response.json()) as { draft_id?: unknown; draftId?: unknown };
  const id = payload.draft_id ?? payload.draftId;
  if (typeof id !== 'string' || !id) {
    throw new Error('Order notification provider returned no draft id');
  }
  return { id };
}
