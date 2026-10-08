import type { StyleOption } from '../types';

// The dollar price each variant actually sells at: its own price when set,
// otherwise the product price. Empty when nothing is priced.
function effectivePrices(price: number | null | undefined, styles: StyleOption[] | null | undefined): number[] {
  const base = typeof price === 'number' ? price : null;
  const list = styles?.length
    ? styles.map((s) => (typeof s.price === 'number' ? s.price : base))
    : [base];
  return list.filter((p): p is number => p != null);
}

// Lowest and highest selling price in dollars, for "From $5" / "$5–$15" displays.
export function priceRange(
  price: number | null | undefined,
  styles: StyleOption[] | null | undefined,
): { min: number; max: number } | null {
  const prices = effectivePrices(price, styles);
  if (!prices.length) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
