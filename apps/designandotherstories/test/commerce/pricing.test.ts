import { describe, it, expect } from 'vitest';
import { priceRange } from '../../src/lib/commerce/pricing';

describe('priceRange', () => {
  it('uses the product price when there are no variants', () => {
    expect(priceRange(4, null)).toEqual({ min: 4, max: 4 });
  });
  it('spans variant prices, filling unpriced variants from the product price', () => {
    expect(priceRange(5, [{ label: '4×6', price: 5 }, { label: '8.5×11', price: 15 }, { label: 'x' }])).toEqual({ min: 5, max: 15 });
  });
  it('is null when nothing is priced', () => {
    expect(priceRange(undefined, [{ label: 'a' }])).toBeNull();
  });
});
