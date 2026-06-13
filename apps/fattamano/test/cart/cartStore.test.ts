import { describe, it, expect, beforeEach } from 'vitest';
import { cartReducer, type CartState } from '../../src/lib/cart/cartStore';
import type { CartItem } from '../../src/lib/types';

const A: CartItem = { productId: 'a', slug: 'a', title: 'A', priceCents: 500, qty: 1 };

describe('cartReducer', () => {
  let s: CartState;
  beforeEach(() => { s = { items: [] }; });

  it('adds and merges quantities', () => {
    s = cartReducer(s, { type: 'add', item: A });
    s = cartReducer(s, { type: 'add', item: A });
    expect(s.items).toEqual([{ ...A, qty: 2 }]);
  });
  it('sets qty and removes at 0', () => {
    s = cartReducer({ items: [{ ...A, qty: 3 }] }, { type: 'setQty', productId: 'a', qty: 1 });
    expect(s.items[0].qty).toBe(1);
    s = cartReducer(s, { type: 'setQty', productId: 'a', qty: 0 });
    expect(s.items).toEqual([]);
  });
  it('removes and clears', () => {
    s = cartReducer({ items: [{ ...A, qty: 1 }] }, { type: 'remove', productId: 'a' });
    expect(s.items).toEqual([]);
  });
});
