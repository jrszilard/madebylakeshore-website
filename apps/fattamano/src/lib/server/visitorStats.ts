import { isbot } from 'isbot';
import { sanityClient } from '../sanity';

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

export async function readStats(fetcher: Fetcher = sanityClient.fetch): Promise<VisitorStats | null> {
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
