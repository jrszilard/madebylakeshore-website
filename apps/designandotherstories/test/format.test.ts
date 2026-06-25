import { describe, it, expect } from 'vitest';
import { formatMoneyCents } from '../src/lib/format';

describe('formatMoneyCents', () => {
  it('formats whole dollars', () => {
    expect(formatMoneyCents(1200)).toBe('$12.00');
  });
  it('formats cents', () => {
    expect(formatMoneyCents(1999)).toBe('$19.99');
  });
  it('handles zero', () => {
    expect(formatMoneyCents(0)).toBe('$0.00');
  });
});
