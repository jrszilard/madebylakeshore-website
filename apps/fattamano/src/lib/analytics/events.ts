export const FUNNEL_EVENTS = [
  'product_view',
  'add_to_cart',
  'checkout_started',
  'purchase_completed',
] as const;

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

export interface FunnelEventInput {
  event: FunnelEvent;
  productSlug?: string;
}

const EVENT_SET = new Set<string>(FUNNEL_EVENTS);
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeFunnelEvent(value: unknown): FunnelEventInput | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { event?: unknown; productSlug?: unknown };
  if (typeof candidate.event !== 'string' || !EVENT_SET.has(candidate.event)) return null;

  const productSlug = typeof candidate.productSlug === 'string' ? candidate.productSlug.trim() : '';
  if (productSlug && (productSlug.length > 80 || !SAFE_SLUG.test(productSlug))) return null;

  return {
    event: candidate.event as FunnelEvent,
    ...(productSlug ? { productSlug } : {}),
  };
}

export function analyticsDocumentId(input: FunnelEventInput, date = new Date()): string {
  const day = date.toISOString().slice(0, 10);
  return `fattamano.analytics.${day}.${input.event}.${input.productSlug ?? 'all'}`;
}

export function analyticsDocument(input: FunnelEventInput, date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  return {
    _id: analyticsDocumentId(input, date),
    _type: 'fattamanoAnalyticsDaily',
    day,
    event: input.event,
    ...(input.productSlug ? { productSlug: input.productSlug } : {}),
    count: 0,
  };
}
