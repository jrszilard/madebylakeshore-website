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
  to: string;
  from: string;
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

export function notificationConfig(env: Record<string, string | undefined> = process.env): NotificationConfig {
  const apiKey = env.RESEND_API_KEY?.trim();
  const to = env.FATTAMANO_ORDER_NOTIFICATION_TO?.trim();
  const from = env.FATTAMANO_ORDER_NOTIFICATION_FROM?.trim();
  if (!apiKey || !to || !from) {
    throw new Error(
      'Order notifications require RESEND_API_KEY, FATTAMANO_ORDER_NOTIFICATION_TO, and FATTAMANO_ORDER_NOTIFICATION_FROM',
    );
  }
  return {
    apiKey,
    to,
    from,
  };
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
    'Update fulfillment status in the private fattamano Orders Studio workspace.',
  ].join('\n');

  return { subject, text };
}

export async function sendOrderNotification(
  order: OrderNotification,
  config = notificationConfig(),
  fetcher: typeof fetch = fetch,
): Promise<NotificationResult> {
  const { subject, text } = buildOrderEmail(order);
  const response = await fetcher('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `fattamano-order-${order.sessionId}`,
    },
    body: JSON.stringify({ from: config.from, to: [config.to], subject, text }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Order notification failed (${response.status}): ${detail}`);
  }
  const payload = (await response.json()) as { id?: unknown };
  if (typeof payload.id !== 'string' || !payload.id) {
    throw new Error('Order notification provider returned no message id');
  }
  return { id: payload.id };
}
