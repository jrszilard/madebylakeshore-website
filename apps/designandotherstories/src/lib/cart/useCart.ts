import { useSyncExternalStore } from 'react';
import { subscribe, getSnapshot, dispatch, cartCount, cartSubtotalCents } from './cartStore';

export function useCart() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => ({ items: [] }));
  return {
    items: state.items,
    count: cartCount(state),
    subtotalCents: cartSubtotalCents(state),
    dispatch,
  };
}
