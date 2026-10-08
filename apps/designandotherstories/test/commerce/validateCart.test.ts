import { describe, it, expect } from 'vitest';
import { normalizeCartItems, buildOrderLines, cartSubtotalCents } from '../../src/lib/commerce/validateCart';
import type { OrderLine } from '../../src/lib/commerce/validateCart';
import type { ProductRow } from '../../src/lib/types';

const ROWS: ProductRow[] = [
  { _id: 'orig', _type: 'artwork', title: 'Sunset', price: 1200, available: true, stock: null },
  { _id: 'sold', _type: 'artwork', title: 'Dawn', price: 900, available: false, stock: null },
  { _id: 'lim', _type: 'shopProduct', title: 'Print', price: 40, available: true, stock: 2 },
  { _id: 'pod', _type: 'shopProduct', title: 'Postcard', price: 4, available: true, stock: null },
];

describe('normalizeCartItems', () => {
  it('accepts a well-formed array and collapses duplicates', () => {
    expect(normalizeCartItems([{ productId: 'a', qty: 1 }, { productId: 'a', qty: 2 }])).toEqual([
      { productId: 'a', qty: 3 },
    ]);
  });
  it('rejects empty / bad qty / missing id', () => {
    expect(() => normalizeCartItems([])).toThrow();
    expect(() => normalizeCartItems([{ productId: 'a', qty: 0 }])).toThrow();
    expect(() => normalizeCartItems([{ productId: 'a', qty: 1.5 }])).toThrow();
    expect(() => normalizeCartItems([{ qty: 1 }])).toThrow();
  });
});

describe('buildOrderLines', () => {
  it('prices from authoritative dollars → integer cents, tags type', () => {
    const { lines, unavailable } = buildOrderLines(
      [{ productId: 'orig', qty: 1 }, { productId: 'pod', qty: 3 }],
      ROWS
    );
    expect(unavailable).toEqual([]);
    expect(lines).toEqual([
      { productId: 'orig', type: 'artwork', title: 'Sunset', unitAmountCents: 120000, qty: 1 },
      { productId: 'pod', type: 'shopProduct', title: 'Postcard', unitAmountCents: 400, qty: 3 },
    ]);
  });
  it('rounds fractional dollars correctly (19.99 → 1999)', () => {
    const rows: ProductRow[] = [{ _id: 'x', _type: 'shopProduct', title: 'X', price: 19.99, available: true, stock: null }];
    const { lines } = buildOrderLines([{ productId: 'x', qty: 1 }], rows);
    expect(lines[0].unitAmountCents).toBe(1999);
  });
  it('flags sold original, over-stock limited print, qty>1 original, missing, no-price', () => {
    const rows: ProductRow[] = [...ROWS, { _id: 'free', _type: 'shopProduct', title: 'Free', price: 0, available: true, stock: null }];
    const { unavailable } = buildOrderLines(
      [
        { productId: 'sold', qty: 1 }, // not_available
        { productId: 'lim', qty: 5 },  // out_of_stock (stock 2)
        { productId: 'orig', qty: 2 }, // out_of_stock (unique)
        { productId: 'zzz', qty: 1 },  // missing
        { productId: 'free', qty: 1 }, // no_price (0)
      ],
      rows
    );
    expect(unavailable.map((u) => `${u.productId}:${u.reason}`).sort()).toEqual([
      'free:no_price', 'lim:out_of_stock', 'orig:out_of_stock', 'sold:not_available', 'zzz:missing',
    ]);
  });
  it('charges the chosen variant price, falling back to the product price', () => {
    const rows: ProductRow[] = [{
      _id: 'pp', _type: 'shopProduct', title: 'Photo', price: 5, available: true, stock: null,
      styles: [{ label: '4×6', price: 5 }, { label: '8.5×11', price: 15 }, { label: 'Unpriced' }],
    }];
    const { lines } = buildOrderLines(
      [{ productId: 'pp', qty: 1, styleLabel: '8.5×11' }, { productId: 'pp', qty: 2, styleLabel: 'Unpriced' }],
      rows
    );
    expect(lines.map((l) => [l.title, l.unitAmountCents])).toEqual([
      ['Photo — 8.5×11', 1500],
      ['Photo — Unpriced', 500],
    ]);
  });
  it('rejects a missing or unknown style on a product that has variants', () => {
    const rows: ProductRow[] = [{
      _id: 'pp', _type: 'shopProduct', title: 'Photo', price: 5, available: true, stock: null,
      styles: [{ label: '8.5×11', price: 15 }],
    }];
    const { lines, unavailable } = buildOrderLines(
      [{ productId: 'pp', qty: 1 }, { productId: 'pp', qty: 1, styleLabel: 'Huge' }],
      rows
    );
    expect(lines).toEqual([]);
    expect(unavailable.map((u) => u.reason)).toEqual(['not_available', 'not_available']);
  });
});

describe('cartSubtotalCents', () => {
  it('sums unit price × qty', () => {
    const line = (c: number, q: number): OrderLine => ({ productId: 'x', type: 'shopProduct', title: 'X', unitAmountCents: c, qty: q });
    expect(cartSubtotalCents([line(400, 3), line(120000, 1)])).toBe(121200);
    expect(cartSubtotalCents([])).toBe(0);
  });
});
