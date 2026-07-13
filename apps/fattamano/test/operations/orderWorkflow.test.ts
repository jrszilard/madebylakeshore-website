import { describe, expect, it, vi } from 'vitest';
import { analyticsDocument, normalizeFunnelEvent } from '../../src/lib/analytics/events';
import { notificationClaimable } from '../../src/lib/commerce/orderWorkflow';
import { stockReceiptId } from '../../src/lib/server/orderStore';
import {
  buildOrderEmail,
  notificationConfig,
  sendOrderNotification,
  type NotificationConfig,
} from '../../src/lib/server/orderNotification';

const config: NotificationConfig = {
  apiKey: 'test-key',
  to: 'orders@example.com',
  from: 'fattamano <shop@example.com>',
};

const order = {
  sessionId: 'cs_test_123',
  amountTotalCents: 1100,
  currency: 'usd',
  items: [{ title: 'Fake Ad Sticker', qty: 2, unitAmountCents: 400 }],
};

describe('private order workflow', () => {
  it('derives deterministic opaque public receipt ids without exposing the Stripe id', () => {
    const id = stockReceiptId('cs_live_secretish');
    expect(id).toMatch(/^fattamano-stock-receipt-[a-f0-9]{64}$/);
    expect(id).not.toContain('cs_live_secretish');
    expect(stockReceiptId('cs_live_secretish')).toBe(id);
  });

  it('claims pending/failed notifications and only reclaims stale sending attempts', () => {
    const now = Date.parse('2026-07-13T12:00:00.000Z');
    expect(notificationClaimable({ notificationStatus: 'pending' }, now)).toBe(true);
    expect(notificationClaimable({ notificationStatus: 'failed' }, now)).toBe(true);
    expect(notificationClaimable({ notificationStatus: 'sent' }, now)).toBe(false);
    expect(notificationClaimable({ notificationStatus: 'sending', notificationAttemptedAt: '2026-07-13T11:58:00.000Z' }, now)).toBe(false);
    expect(notificationClaimable({ notificationStatus: 'sending', notificationAttemptedAt: '2026-07-13T11:50:00.000Z' }, now)).toBe(true);
  });
});

describe('order notifications', () => {
  it('requires all notification secrets without returning their values', () => {
    expect(() => notificationConfig({})).toThrow('RESEND_API_KEY');
  });

  it('builds an operational email without customer PII', () => {
    const email = buildOrderEmail(order);
    expect(email.subject).toContain('$11.00');
    expect(email.text).toContain('2 × Fake Ad Sticker — $8.00');
    expect(email.text).toContain('cs_test_123');
    expect(email.text).toContain('dashboard.stripe.com');
  });

  it('uses a provider idempotency key and returns the message id', async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(new Headers(init?.headers).get('Idempotency-Key')).toBe('fattamano-order-cs_test_123');
      return new Response(JSON.stringify({ id: 'email_123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;
    await expect(sendOrderNotification(order, config, fetcher)).resolves.toEqual({ id: 'email_123' });
    expect(fetcher).toHaveBeenCalledOnce();
  });
});

describe('privacy-conscious funnel events', () => {
  it('accepts only known aggregate events and safe optional product slugs', () => {
    expect(normalizeFunnelEvent({ event: 'product_view', productSlug: 'fake-ad-sticker' })).toEqual({
      event: 'product_view',
      productSlug: 'fake-ad-sticker',
    });
    expect(normalizeFunnelEvent({ event: 'email_collected' })).toBeNull();
    expect(normalizeFunnelEvent({ event: 'product_view', productSlug: '../secret' })).toBeNull();
  });

  it('creates deterministic daily aggregate documents without visitor identifiers', () => {
    expect(analyticsDocument({ event: 'checkout_started' }, new Date('2026-07-13T19:00:00Z'))).toEqual({
      _id: 'fattamano-analytics-2026-07-13-checkout_started-all',
      _type: 'fattamanoAnalyticsDaily',
      day: '2026-07-13',
      event: 'checkout_started',
      count: 0,
    });
  });
});
