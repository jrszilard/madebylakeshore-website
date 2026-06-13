import { describe, it, expect } from 'vitest';
import { planStockDecrements } from '../../src/lib/commerce/stock';
import type { ProductRow } from '../../src/lib/types';

const ROWS: ProductRow[] = [
  { _id: 'a', title: 'A', status: 'available', stock: 3, priceCents: 500 },
  { _id: 'b', title: 'B', status: 'available', stock: 1, priceCents: 900 },
];

describe('planStockDecrements', () => {
  it('computes new stock and soldOut flags', () => {
    const plan = planStockDecrements([{ productId: 'a', qty: 2 }, { productId: 'b', qty: 1 }], ROWS);
    expect(plan).toEqual([
      { productId: 'a', newStock: 1, soldOut: false },
      { productId: 'b', newStock: 0, soldOut: true },
    ]);
  });
  it('never goes below zero', () => {
    const plan = planStockDecrements([{ productId: 'b', qty: 5 }], ROWS);
    expect(plan).toEqual([{ productId: 'b', newStock: 0, soldOut: true }]);
  });
  it('skips unknown products', () => {
    expect(planStockDecrements([{ productId: 'z', qty: 1 }], ROWS)).toEqual([]);
  });
});
