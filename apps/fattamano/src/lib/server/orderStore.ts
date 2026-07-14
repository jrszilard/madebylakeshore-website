import { createHash } from 'node:crypto';
import { sanityWriteClient, sanityWriteFetch } from './sanityWrite';

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Sanity excludes dotted document IDs from unauthenticated public reads. The
 * hash also avoids exposing the Stripe Checkout Session id in Studio URLs.
 */
export function orderDocumentId(checkoutSessionId: string): string {
  return `fattamano.order.${digest(checkoutSessionId)}`;
}

export function orderFetch<T = unknown>(query: string, params?: Record<string, unknown>): Promise<T> {
  return sanityWriteFetch<T>(query, params);
}

export function orderClient() {
  return sanityWriteClient();
}
