export interface NotificationOrderItem {
  title: string;
  qty: number;
  unitAmountCents: number;
  styleLabel?: string;
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
  const to = values.DAOS_ORDER_NOTIFICATION_TO?.trim();
  if (!apiKey || !inboxId || !to) {
    throw new Error(
      'Order notifications require AGENTMAIL_API_KEY, AGENTMAIL_INBOX_ID, and DAOS_ORDER_NOTIFICATION_TO',
    );
  }
  return { apiKey, inboxId, to };
}

// The variant is the whole point of printing a line: "2 × Bookmark" is not
// enough to pack from when the bookmark comes in four colourways.
function itemLine(item: NotificationOrderItem, currency: string): string {
  const name = item.styleLabel ? `${item.title} — ${item.styleLabel}` : item.title;
  return `${item.qty} × ${name} — ${money(item.qty * item.unitAmountCents, currency)}`;
}

export function buildOrderEmail(order: OrderNotification) {
  const dashboardUrl = order.livemode
    ? 'https://dashboard.stripe.com/payments'
    : 'https://dashboard.stripe.com/test/payments';
  const subject = `${order.livemode ? '' : '[TEST] '}New Design & Other Stories order — ${money(order.amountTotalCents, order.currency)}`;
  const text = [
    'A paid order is ready to fulfil.',
    '',
    ...order.items.map((item) => itemLine(item, order.currency)),
    '',
    `Total paid (incl. shipping): ${money(order.amountTotalCents, order.currency)}`,
    `Checkout Session: ${order.sessionId}`,
    `Customer name and shipping address are in Stripe: ${dashboardUrl}`,
    '',
    'Mark it packed or shipped under Design & Other Stories → Shop → Orders in Sanity Studio.',
  ].join('\n');

  return { subject, text };
}

/**
 * AgentMail draft creation supports deterministic client_id idempotency, so a
 * crash after the API responds can safely retry without sending twice. This
 * shares fattamano's inbox and API key; only the recipient differs.
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
        client_id: `daos-order-${order.sessionId}`,
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
