import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, it, expect, beforeAll, vi } from 'vitest';

// On Cloudflare the site runs Stripe's worker build, which checks signatures with Web Crypto: only the async
// check works there. Load that build here too, so the synchronous constructEvent would fail this test as it
// would fail every real order on Cloudflare (refused as a bad signature).
const workerBuild = pathToFileURL(
  join(dirname(createRequire(import.meta.url).resolve('stripe')), '../esm/stripe.esm.worker.js'),
).href;
vi.mock('stripe', async () => import(/* @vite-ignore */ workerBuild));

const SECRET = 'whsec_test_daos';

async function post(payload: string, signature: string) {
  const { POST } = await import('../../src/pages/api/stripe-webhook');
  const request = new Request('https://www.designandotherstories.com/api/stripe-webhook', {
    method: 'POST',
    headers: { 'stripe-signature': signature },
    body: payload,
  });
  return POST({ request } as any);
}

describe('stripe webhook on the worker build', () => {
  beforeAll(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  });

  it('accepts an event signed with the endpoint secret', async () => {
    const { default: Stripe } = await import('stripe');
    const payload = JSON.stringify({ id: 'evt_test', object: 'event', type: 'customer.created', data: { object: {} } });
    const signature = await new Stripe('sk_test_dummy').webhooks.generateTestHeaderStringAsync({ payload, secret: SECRET });
    const res = await post(payload, signature);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ignored');
  });

  it('refuses one signed with another secret', async () => {
    const { default: Stripe } = await import('stripe');
    const payload = JSON.stringify({ id: 'evt_test', object: 'event', type: 'customer.created', data: { object: {} } });
    const signature = await new Stripe('sk_test_dummy').webhooks.generateTestHeaderStringAsync({
      payload,
      secret: 'whsec_someone_else',
    });
    const res = await post(payload, signature);
    expect(res.status).toBe(400);
  });
});
