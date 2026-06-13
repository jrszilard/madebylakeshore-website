import type { ProductRow } from '../types';

export interface StockChange {
  productId: string;
  newStock: number;
  soldOut: boolean;
}

export function planStockDecrements(
  items: { productId: string; qty: number }[],
  rows: ProductRow[]
): StockChange[] {
  const byId = new Map(rows.map((r) => [r._id, r]));
  const changes: StockChange[] = [];
  for (const item of items) {
    const row = byId.get(item.productId);
    if (!row) continue;
    const newStock = Math.max(0, (row.stock ?? 0) - item.qty);
    changes.push({ productId: item.productId, newStock, soldOut: newStock === 0 });
  }
  return changes;
}
