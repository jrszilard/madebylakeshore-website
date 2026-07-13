import { createHash } from 'node:crypto';
import { createServerSanityClient } from '@lakeshore/shared-ui/sanity';
import { requireServerEnv } from './env';

let _bundle: ReturnType<typeof createServerSanityClient> | null = null;

export const ORDER_DATASET_ENV = 'SANITY_ORDER_DATASET';

function bundle() {
  if (!_bundle) {
    _bundle = createServerSanityClient({
      projectId: requireServerEnv('PUBLIC_SANITY_PROJECT_ID'),
      dataset: requireServerEnv(ORDER_DATASET_ENV),
      token: requireServerEnv('SANITY_WRITE_TOKEN'),
    });
  }
  return _bundle;
}

export function orderFetch<T = unknown>(query: string, params?: Record<string, unknown>): Promise<T> {
  return bundle().fetch<T>(query, params);
}

export function orderClient() {
  return bundle().client;
}

/**
 * The public dataset keeps only this opaque, content-free receipt so stock and
 * idempotency can remain in one Sanity transaction. Detailed order data lives
 * in the private order dataset.
 */
export function stockReceiptId(checkoutSessionId: string): string {
  const digest = createHash('sha256').update(checkoutSessionId).digest('hex');
  return `fattamano-stock-receipt-${digest}`;
}
