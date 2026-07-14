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
  const values = env ?? {
    ...((typeof import.meta !== 'undefined' ? (import.meta as any).env : {}) as Record<string, string | undefined>),
    ...(typeof process !== 'undefined' ? process.env : {}),
  };
  const apiKey = values.AGENTMAIL_API_KEY?.trim();
  const inboxId = values.AGENTMAIL_INBOX_ID?.trim();
  const to = values.FATTAMANO_ORDER_NOTIFICATION_TO?.trim();
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
