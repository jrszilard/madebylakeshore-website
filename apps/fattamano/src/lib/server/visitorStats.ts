import { isbot } from 'isbot';

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
