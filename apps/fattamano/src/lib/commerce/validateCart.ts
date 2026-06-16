import type { ProductRow } from '../types';

const MAX_QTY_PER_LINE = 50;
const MAX_LINES = 50; // bound work + the idempotency doc size; abuse guard

export class BadCartError extends Error {}

export interface NormalizedItem {
  productId: string;
  qty: number;
}

export function normalizeCartItems(body: unknown): NormalizedItem[] {
  if (!Array.isArray(body) || body.length === 0) {
    throw new BadCartError('Cart must be a non-empty array');
  }
  if (body.length > MAX_LINES) {
    throw new BadCartError(`Cart cannot exceed ${MAX_LINES} distinct items`);
  }
  // Collapse duplicate productIds by summing qty. The authoritative money path
  // must not trust the client to send one line per product — split lines
  // ({a:2},{a:2}) would otherwise each pass the per-line stock check and
  // oversell, and would each decrement from the same base stock.
  const byId = new Map<string, number>();
  for (const raw of body) {
    const productId =
      typeof (raw as any)?.productId === 'string' ? (raw as any).productId.trim() : '';
    const qty = (raw as any)?.qty;
    if (!productId) {
      throw new BadCartError('Each item needs a productId');
    }
    if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
      throw new BadCartError(`qty must be an integer 1..${MAX_QTY_PER_LINE}`);
    }
    byId.set(productId, (byId.get(productId) ?? 0) + qty);
  }
  const items = [...byId.entries()].map(([productId, qty]) => ({ productId, qty }));
  for (const item of items) {
    if (item.qty > MAX_QTY_PER_LINE) {
      throw new BadCartError(`Total qty for a product cannot exceed ${MAX_QTY_PER_LINE}`);
    }
  }
  return items;
}

export interface OrderLine {
  productId: string;
  title: string;
  unitAmountCents: number;
  qty: number;
  image?: unknown;
}

export interface Unavailable {
  productId: string;
  reason: 'missing' | 'not_available' | 'no_price' | 'out_of_stock';
}

// Authoritative cart subtotal (cents), summed from server-priced lines. Used to
// decide free-shipping thresholds — never derived from a client-supplied total.
export function cartSubtotalCents(lines: OrderLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitAmountCents * l.qty, 0);
}

export function buildOrderLines(
  items: NormalizedItem[],
  rows: ProductRow[]
): { lines: OrderLine[]; unavailable: Unavailable[] } {
  const byId = new Map(rows.map((r) => [r._id, r]));
  const lines: OrderLine[] = [];
  const unavailable: Unavailable[] = [];

  for (const item of items) {
    const row = byId.get(item.productId);
    if (!row) {
      unavailable.push({ productId: item.productId, reason: 'missing' });
      continue;
    }
    if (row.status !== 'available') {
      unavailable.push({ productId: item.productId, reason: 'not_available' });
      continue;
    }
    if (typeof row.priceCents !== 'number' || !Number.isInteger(row.priceCents) || row.priceCents <= 0) {
      // Reject non-integer cents so a float never reaches Stripe's unit_amount.
      unavailable.push({ productId: item.productId, reason: 'no_price' });
      continue;
    }
    if ((row.stock ?? 0) < item.qty) {
      unavailable.push({ productId: item.productId, reason: 'out_of_stock' });
      continue;
    }
    lines.push({
      productId: row._id,
      title: row.title,
      unitAmountCents: row.priceCents,
      qty: item.qty,
      image: row.image ?? undefined,
    });
  }
  return { lines, unavailable };
}
