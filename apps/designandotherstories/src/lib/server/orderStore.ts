import { createHash } from 'node:crypto';
import { sanityWriteClient, sanityWriteFetch } from './sanityWrite';

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Sanity excludes dotted document IDs from unauthenticated public reads, which
 * is what keeps order records out of the public dataset — the previous plain
 * `cs_live_…` ids were readable by anyone with the project id. Hashing also
 * keeps the Stripe Checkout Session id out of Studio URLs.
 */
export function orderDocumentId(checkoutSessionId: string): string {
  return `daos.order.${digest(checkoutSessionId)}`;
}

export function orderFetch<T = unknown>(query: string, params?: Record<string, unknown>): Promise<T> {
  return sanityWriteFetch<T>(query, params);
}

export function orderClient() {
  return sanityWriteClient();
}
