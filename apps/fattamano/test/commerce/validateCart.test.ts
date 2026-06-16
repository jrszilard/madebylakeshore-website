import { describe, it, expect } from 'vitest';
import { normalizeCartItems, buildOrderLines, cartSubtotalCents } from '../../src/lib/commerce/validateCart';
import type { OrderLine } from '../../src/lib/commerce/validateCart';
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
  it('collapses duplicate productIds by summing qty (no split-line oversell)', () => {
    expect(
      normalizeCartItems([
        { productId: 'a', qty: 1 },
        { productId: 'a', qty: 2 },
      ])
    ).toEqual([{ productId: 'a', qty: 3 }]);
  });
  it('rejects a collapsed qty that exceeds the per-product cap', () => {
    expect(() =>
      normalizeCartItems([
        { productId: 'a', qty: 30 },
        { productId: 'a', qty: 30 },
      ])
    ).toThrow();
  });
  it('trims and rejects a whitespace-only productId', () => {
    expect(() => normalizeCartItems([{ productId: '   ', qty: 1 }])).toThrow();
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
  it('rejects non-integer prices so no float reaches Stripe unit_amount', () => {
    const rows = [
      { _id: 'a', title: 'A', priceCents: 500.7, status: 'available', stock: 3 },
    ] as ProductRow[];
    const { lines, unavailable } = buildOrderLines([{ productId: 'a', qty: 1 }], rows);
    expect(lines).toEqual([]);
    expect(unavailable).toEqual([{ productId: 'a', reason: 'no_price' }]);
  });
});

describe('cartSubtotalCents', () => {
  const line = (unitAmountCents: number, qty: number): OrderLine => ({
    productId: 'x',
    title: 'X',
    unitAmountCents,
    qty,
  });
  it('sums unit price times quantity across lines', () => {
    // 3 stickers @ $4 = $12 — the free-US-shipping threshold case
    expect(cartSubtotalCents([line(400, 3)])).toBe(1200);
    expect(cartSubtotalCents([line(400, 1), line(2500, 2)])).toBe(5400);
  });
  it('is zero for an empty cart', () => {
    expect(cartSubtotalCents([])).toBe(0);
  });
});
