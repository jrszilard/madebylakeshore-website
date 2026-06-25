import type { ProductRow, DaosProductType } from '../types';

const MAX_QTY_PER_LINE = 50;
const MAX_LINES = 50; // bound work + idempotency doc size; abuse guard

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
  // Collapse duplicate productIds by summing qty so split lines can't oversell.
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
  type: DaosProductType;
  title: string;
  unitAmountCents: number;
  qty: number;
}

export interface Unavailable {
  productId: string;
  reason: 'missing' | 'not_available' | 'no_price' | 'out_of_stock';
}

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
    if (!row.available) {
      unavailable.push({ productId: item.productId, reason: 'not_available' });
      continue;
    }
    // DAOS stores price in USD dollars; Stripe needs integer cents.
    const unitAmountCents = Math.round((row.price ?? 0) * 100);
    if (!Number.isFinite(unitAmountCents) || unitAmountCents <= 0) {
      unavailable.push({ productId: item.productId, reason: 'no_price' });
      continue;
    }
    // Originals are unique: qty must be 1.
    if (row._type === 'artwork' && item.qty > 1) {
      unavailable.push({ productId: item.productId, reason: 'out_of_stock' });
      continue;
    }
    // Limited shopProducts must have enough stock; null stock = unlimited.
    if (row._type === 'shopProduct' && typeof row.stock === 'number' && row.stock < item.qty) {
      unavailable.push({ productId: item.productId, reason: 'out_of_stock' });
      continue;
    }
    lines.push({
      productId: row._id,
      type: row._type,
      title: row.title,
      unitAmountCents,
      qty: item.qty,
    });
  }
  return { lines, unavailable };
}
