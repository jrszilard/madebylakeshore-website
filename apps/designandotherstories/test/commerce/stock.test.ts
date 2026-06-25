import { describe, it, expect } from 'vitest';
import { planFulfillment } from '../../src/lib/commerce/stock';
import type { ProductRow } from '../../src/lib/types';

const rows: ProductRow[] = [
  { _id: 'orig', _type: 'artwork', title: 'Original', price: 1200, available: true, stock: null },
  { _id: 'lim', _type: 'shopProduct', title: 'Limited Print', price: 40, available: true, stock: 3 },
  { _id: 'pod', _type: 'shopProduct', title: 'POD Card', price: 5, available: true, stock: null },
];

describe('planFulfillment', () => {
  it('marks an original sold (originalAvailable=false)', () => {
    expect(planFulfillment([{ productId: 'orig', type: 'artwork', qty: 1 }], rows)).toEqual([
      { productId: 'orig', set: { originalAvailable: false } },
    ]);
  });
  it('decrements a limited shopProduct', () => {
    expect(planFulfillment([{ productId: 'lim', type: 'shopProduct', qty: 1 }], rows)).toEqual([
      { productId: 'lim', set: { stock: 2 } },
    ]);
  });
  it('flips available off when limited stock hits 0', () => {
    expect(planFulfillment([{ productId: 'lim', type: 'shopProduct', qty: 3 }], rows)).toEqual([
      { productId: 'lim', set: { stock: 0, available: false } },
    ]);
  });
  it('never writes back an unlimited (null-stock) shopProduct', () => {
    expect(planFulfillment([{ productId: 'pod', type: 'shopProduct', qty: 9 }], rows)).toEqual([]);
  });
});
