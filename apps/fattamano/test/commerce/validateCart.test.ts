import { describe, it, expect } from 'vitest';
import { normalizeCartItems, buildOrderLines } from '../../src/lib/commerce/validateCart';
import type { ProductRow } from '../../src/lib/types';

const ROWS: ProductRow[] = [
  { _id: 'a', title: 'Sticker A', priceCents: 500, status: 'available', stock: 3 },
  { _id: 'b', title: 'Shirt B', priceCents: 2500, status: 'available', stock: 0 },
  { _id: 'c', title: 'Concept C', priceCents: 800, status: 'concept', stock: 5 },
];

describe('normalizeCartItems', () => {
  it('accepts a well-formed array', () => {
    expect(normalizeCartItems([{ productId: 'a', qty: 2 }])).toEqual([{ productId: 'a', qty: 2 }]);
  });
  it('rejects non-arrays, empty carts, bad qty, missing id', () => {
    expect(() => normalizeCartItems(null)).toThrow();
    expect(() => normalizeCartItems([])).toThrow();
    expect(() => normalizeCartItems([{ productId: 'a', qty: 0 }])).toThrow();
    expect(() => normalizeCartItems([{ productId: 'a', qty: 1.5 }])).toThrow();
    expect(() => normalizeCartItems([{ qty: 1 }])).toThrow();
  });
  it('caps absurd quantities', () => {
    expect(() => normalizeCartItems([{ productId: 'a', qty: 100000 }])).toThrow();
  });
  it('caps the number of distinct lines', () => {
    const many = Array.from({ length: 51 }, (_, i) => ({ productId: `p${i}`, qty: 1 }));
    expect(() => normalizeCartItems(many)).toThrow();
  });
});

describe('buildOrderLines', () => {
  it('builds priced lines from authoritative rows (ignores any client price)', () => {
    const { lines, unavailable } = buildOrderLines([{ productId: 'a', qty: 2 }], ROWS);
    expect(unavailable).toEqual([]);
    expect(lines).toEqual([
      { productId: 'a', title: 'Sticker A', unitAmountCents: 500, qty: 2, image: undefined },
    ]);
  });
  it('flags out-of-stock, non-available, missing, and over-qty items', () => {
    const { unavailable } = buildOrderLines(
      [
        { productId: 'b', qty: 1 }, // stock 0
        { productId: 'c', qty: 1 }, // concept
        { productId: 'z', qty: 1 }, // missing
        { productId: 'a', qty: 9 }, // over stock (3)
      ],
      ROWS
    );
    expect(unavailable.map((u) => u.productId).sort()).toEqual(['a', 'b', 'c', 'z']);
  });
});
