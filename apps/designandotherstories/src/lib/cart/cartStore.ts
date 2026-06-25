import type { CartItem } from '../types';

export interface CartState {
  items: CartItem[];
}

export type CartAction =
  | { type: 'add'; item: CartItem }
  | { type: 'setQty'; productId: string; qty: number }
  | { type: 'remove'; productId: string }
  | { type: 'clear' }
  | { type: 'replace'; state: CartState };

const MAX_QTY = 50;

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      const existing = state.items.find((i) => i.productId === action.item.productId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === action.item.productId
              ? { ...i, qty: Math.min(MAX_QTY, i.qty + action.item.qty) }
              : i
          ),
        };
      }
      return { items: [...state.items, { ...action.item, qty: Math.min(MAX_QTY, action.item.qty) }] };
    }
    case 'setQty': {
      if (action.qty <= 0) {
        return { items: state.items.filter((i) => i.productId !== action.productId) };
      }
      return {
        items: state.items.map((i) =>
          i.productId === action.productId ? { ...i, qty: Math.min(MAX_QTY, action.qty) } : i
        ),
      };
    }
    case 'remove':
      return { items: state.items.filter((i) => i.productId !== action.productId) };
    case 'clear':
      return { items: [] };
    case 'replace':
      return action.state;
  }
}

// ---- external store (browser only) ----
const KEY = 'daos_cart_v1';
let state: CartState = { items: [] };
const listeners = new Set<() => void>();

function load(): CartState {
  if (typeof localStorage === 'undefined') return { items: [] };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartState) : { items: [] };
  } catch {
    return { items: [] };
  }
}

function persist() {
  if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(state));
}

if (typeof window !== 'undefined') {
  state = load();
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      state = load();
      listeners.forEach((l) => l());
    }
  });
}

export function dispatch(action: CartAction) {
  state = cartReducer(state, action);
  persist();
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): CartState {
  return state;
}

export function cartCount(s: CartState): number {
  return s.items.reduce((n, i) => n + i.qty, 0);
}

export function cartSubtotalCents(s: CartState): number {
  return s.items.reduce((n, i) => n + i.priceCents * i.qty, 0);
}
