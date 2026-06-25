import { describe, it, expect } from 'vitest';
import { cartReducer, cartCount, cartSubtotalCents } from '../../src/lib/cart/cartStore';
import type { CartState } from '../../src/lib/cart/cartStore';
import type { CartItem } from '../../src/lib/types';

const item = (productId: string, priceCents: number, qty = 1): CartItem => ({
  productId, type: 'shopProduct', slug: productId, title: productId, priceCents, qty,
});
const empty: CartState = { items: [] };

describe('cartReducer', () => {
  it('adds a new item', () => {
    const s = cartReducer(empty, { type: 'add', item: item('a', 500) });
    expect(s.items).toHaveLength(1);
    expect(s.items[0].qty).toBe(1);
  });
  it('merges qty when adding an existing item', () => {
    let s = cartReducer(empty, { type: 'add', item: item('a', 500) });
    s = cartReducer(s, { type: 'add', item: item('a', 500) });
    expect(s.items).toHaveLength(1);
    expect(s.items[0].qty).toBe(2);
  });
  it('setQty to 0 removes the line', () => {
    let s = cartReducer(empty, { type: 'add', item: item('a', 500) });
    s = cartReducer(s, { type: 'setQty', productId: 'a', qty: 0 });
    expect(s.items).toHaveLength(0);
  });
  it('remove and clear work', () => {
    let s = cartReducer(empty, { type: 'add', item: item('a', 500) });
    s = cartReducer(s, { type: 'add', item: item('b', 700) });
    s = cartReducer(s, { type: 'remove', productId: 'a' });
    expect(s.items.map((i) => i.productId)).toEqual(['b']);
    expect(cartReducer(s, { type: 'clear' }).items).toEqual([]);
  });
});

describe('cart totals', () => {
  it('counts and subtotals', () => {
    const s: CartState = { items: [item('a', 500, 2), item('b', 700, 1)] };
    expect(cartCount(s)).toBe(3);
    expect(cartSubtotalCents(s)).toBe(1700);
  });
});
