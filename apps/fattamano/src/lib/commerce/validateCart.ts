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
  return body.map((raw) => {
    const productId = (raw as any)?.productId;
    const qty = (raw as any)?.qty;
    if (typeof productId !== 'string' || !productId) {
      throw new BadCartError('Each item needs a productId');
    }
    if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
      throw new BadCartError(`qty must be an integer 1..${MAX_QTY_PER_LINE}`);
    }
    return { productId, qty };
  });
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
    if (typeof row.priceCents !== 'number' || row.priceCents <= 0) {
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
