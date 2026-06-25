import type { ProductRow, DaosProductType } from '../types';

export interface FulfillmentPatch {
  productId: string;
  set: Record<string, unknown>;
}

// Type-aware fulfillment: originals are unique (mark sold), shopProducts with a
// numeric stock decrement (and flip available off at 0); unlimited shopProducts
// (null/absent stock) are never written back.
export function planFulfillment(
  items: { productId: string; type: DaosProductType; qty: number }[],
  rows: ProductRow[]
): FulfillmentPatch[] {
  const byId = new Map(rows.map((r) => [r._id, r]));
  const patches: FulfillmentPatch[] = [];
  for (const item of items) {
    const row = byId.get(item.productId);
    if (!row) continue;
    if (row._type === 'artwork') {
      patches.push({ productId: item.productId, set: { originalAvailable: false } });
    } else if (typeof row.stock === 'number') {
      const newStock = Math.max(0, row.stock - item.qty);
      patches.push({
        productId: item.productId,
        set: { stock: newStock, ...(newStock === 0 ? { available: false } : {}) },
      });
    }
  }
  return patches;
}
