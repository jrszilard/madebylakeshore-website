import { describe, expect, it, vi } from 'vitest';
import { notificationClaimable } from '../../src/lib/commerce/orderWorkflow';
import { orderDocumentId } from '../../src/lib/server/orderStore';
import {
  buildOrderEmail,
  notificationConfig,
  sendOrderNotification,
  type NotificationConfig,
} from '../../src/lib/server/orderNotification';

const config: NotificationConfig = {
  apiKey: 'test-key',
  inboxId: 'lakeshore-orders@agentmail.to',
  to: 'orders@example.com',
};

const order = {
  sessionId: 'cs_test_123',
  amountTotalCents: 1100,
  currency: 'usd',
  livemode: false,
  items: [{ title: 'Flowers #9', qty: 2, unitAmountCents: 300 }],
};

describe('private order workflow', () => {
  it('derives deterministic dotted order ids without exposing the Stripe id', () => {
    const id = orderDocumentId('cs_live_secretish');
    expect(id).toMatch(/^daos\.order\.[a-f0-9]{64}$/);
    expect(id).not.toContain('cs_live_secretish');
    expect(orderDocumentId('cs_live_secretish')).toBe(id);
  });

  it('claims pending/failed notifications and only reclaims stale sending attempts', () => {
    const now = Date.parse('2026-09-08T12:00:00.000Z');
    expect(notificationClaimable({ notificationStatus: 'pending' }, now)).toBe(true);
    expect(notificationClaimable({ notificationStatus: 'failed' }, now)).toBe(true);
    expect(notificationClaimable({}, now)).toBe(true);
    expect(notificationClaimable({ notificationStatus: 'sent' }, now)).toBe(false);
    expect(
      notificationClaimable({ notificationStatus: 'sending', notificationAttemptedAt: '2026-09-08T11:58:00.000Z' }, now)
    ).toBe(false);
    expect(
      notificationClaimable({ notificationStatus: 'sending', notificationAttemptedAt: '2026-09-08T11:50:00.000Z' }, now)
    ).toBe(true);
  });
});

describe('order notifications', () => {
  it('requires all notification secrets without returning their values', () => {
    expect(() => notificationConfig({})).toThrow('AGENTMAIL_API_KEY');
    expect(() => notificationConfig({ AGENTMAIL_API_KEY: 'k', AGENTMAIL_INBOX_ID: 'i' })).toThrow(
      'DAOS_ORDER_NOTIFICATION_TO'
    );
  });

  it('builds an operational email without customer PII', () => {
    const email = buildOrderEmail(order);
    expect(email.subject).toBe('[TEST] New Design & Other Stories order — $11.00');
    expect(email.text).toContain('2 × Flowers #9 — $6.00');
    expect(email.text).toContain('cs_test_123');
    expect(email.text).toContain('dashboard.stripe.com/test/payments');
  });

  it('names the variant on the line, so the right colourway gets packed', () => {
    const email = buildOrderEmail({
      ...order,
      items: [{ title: "Don't Read (Play Fetch Instead)", qty: 1, unitAmountCents: 500, styleLabel: 'Forest Green' }],
    });
    expect(email.text).toContain("1 × Don't Read (Play Fetch Instead) — Forest Green — $5.00");
  });

  it('drops the test marker and points at the live dashboard for real orders', () => {
    const email = buildOrderEmail({ ...order, livemode: true });
    expect(email.subject).toBe('New Design & Other Stories order — $11.00');
    expect(email.text).toContain('https://dashboard.stripe.com/payments');
    expect(email.text).not.toContain('/test/payments');
  });

  it('uses a provider idempotency client id and returns the draft id', async () => {
    const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toContain('/lakeshore-orders%40agentmail.to/drafts');
      const body = JSON.parse(String(init?.body));
      expect(body.client_id).toBe('daos-order-cs_test_123');
      expect(body.to).toBe('orders@example.com');
      expect(body.send_at).toBeTypeOf('string');
      return new Response(JSON.stringify({ draft_id: 'draft_123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;
    await expect(sendOrderNotification(order, config, fetcher)).resolves.toEqual({ id: 'draft_123' });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('surfaces provider failures without leaking the response wholesale', async () => {
    const fetcher = vi.fn(async () => new Response('nope', { status: 422 })) as unknown as typeof fetch;
    await expect(sendOrderNotification(order, config, fetcher)).rejects.toThrow(
      /Order notification failed \(422\)/
    );
  });
});
