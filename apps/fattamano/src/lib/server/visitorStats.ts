import { isbot } from 'isbot';
import { waitUntil } from '@vercel/functions';
import { sanityWriteClient, sanityWriteFetch } from './sanityWrite';

export type VisitorKind = 'bot' | 'human';
export interface VisitorStats {
  total: number;
  humans: number;
  bots: number;
}

export const VISITOR_COOKIE = 'ft_visitor';
export const STATS_DOC_ID = 'fattamano.visitorStats';
export const STATS_DOC_TYPE = 'fattamanoVisitorStats';

export function classifyVisitor(userAgent: string | null): VisitorKind {
  if (!userAgent) return 'bot';
  return isbot(userAgent) ? 'bot' : 'human';
}

export interface VisitPlan {
  increments: Partial<VisitorStats>;
  setHumanCookie: boolean;
}

export function planVisit(kind: VisitorKind, hasVisitorCookie: boolean): VisitPlan {
  if (kind === 'bot') {
    return { increments: { total: 1, bots: 1 }, setHumanCookie: false };
  }
  if (!hasVisitorCookie) {
    return { increments: { total: 1, humans: 1 }, setHumanCookie: true };
  }
  return { increments: { total: 1 }, setHumanCookie: false };
}

export function applyOptimistic(stats: VisitorStats, increments: Partial<VisitorStats>): VisitorStats {
  return {
    total: stats.total + (increments.total ?? 0),
    humans: stats.humans + (increments.humans ?? 0),
    bots: stats.bots + (increments.bots ?? 0),
  };
}

const STATS_QUERY = `*[_id == $id][0]{ total, humans, bots }`;

type Fetcher = <T = any>(query: string, params?: Record<string, any>) => Promise<T>;

// Dotted Sanity IDs are private to unauthenticated clients, so read the backend-only
// singleton through the server write client instead of the public browser client.
export async function readStats(fetcher: Fetcher = sanityWriteFetch): Promise<VisitorStats | null> {
  try {
    const doc = await fetcher<Partial<VisitorStats> | null>(STATS_QUERY, { id: STATS_DOC_ID });
    return {
      total: doc?.total ?? 0,
      humans: doc?.humans ?? 0,
      bots: doc?.bots ?? 0,
    };
  } catch {
    return null;
  }
}

export interface StatsWriteClient {
  patch(id: string): { inc(values: Record<string, number>): { commit(): Promise<unknown> } };
  createIfNotExists(doc: Record<string, unknown>): Promise<unknown>;
}

export async function incrementStats(
  increments: Partial<VisitorStats>,
  client: StatsWriteClient = sanityWriteClient() as unknown as StatsWriteClient,
): Promise<void> {
  const values = increments as Record<string, number>;
  try {
    await client.patch(STATS_DOC_ID).inc(values).commit();
  } catch {
    await client.createIfNotExists({
      _id: STATS_DOC_ID,
      _type: STATS_DOC_TYPE,
      total: 0,
      humans: 0,
      bots: 0,
    });
    await client.patch(STATS_DOC_ID).inc(values).commit();
  }
}

export function deferWrite(work: Promise<unknown>): void {
  const safe = Promise.resolve(work).catch((err) => {
    console.warn('[visitorStats] deferred write failed', err);
  });
  // waitUntil registers the write with the platform so it completes after the
  // response flushes. On Vercel (request context present) this guarantees the
  // write runs; with no context (local dev / tests) waitUntil is a no-op and
  // `safe` -- already in flight -- runs as a detached, best-effort promise (the
  // spec accepts occasional dropped writes). The try/catch is defensive in case
  // a future @vercel/functions throws when the context is absent.
  try {
    waitUntil(safe);
  } catch {
    void safe;
  }
}
