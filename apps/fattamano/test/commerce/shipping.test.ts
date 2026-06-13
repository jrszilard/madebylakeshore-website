import { describe, it, expect } from 'vitest';
import { resolveShippingOption, allowedCountries } from '../../src/lib/commerce/shipping';
import type { ShippingZone } from '../../src/lib/types';

const ZONES: ShippingZone[] = [
  { label: 'US', countryCodes: ['US'], rateCents: 500 },
  { label: 'Canada', countryCodes: ['CA'], rateCents: 1000 },
  { label: 'Europe', countryCodes: ['DE', 'FR', 'GB'], rateCents: 1500 },
];

describe('resolveShippingOption', () => {
  it('matches the first zone containing the country', () => {
    expect(resolveShippingOption('US', ZONES)).toEqual({ label: 'US', rateCents: 500 });
    expect(resolveShippingOption('FR', ZONES)).toEqual({ label: 'Europe', rateCents: 1500 });
  });
  it('is case-insensitive on the country code', () => {
    expect(resolveShippingOption('gb', ZONES)).toEqual({ label: 'Europe', rateCents: 1500 });
  });
  it('returns null for an unsupported destination', () => {
    expect(resolveShippingOption('JP', ZONES)).toBeNull();
  });
  it('returns null for empty/garbage input', () => {
    expect(resolveShippingOption('', ZONES)).toBeNull();
    expect(resolveShippingOption('US', [])).toBeNull();
  });
});

describe('allowedCountries', () => {
  it('returns the de-duplicated, upper-cased union', () => {
    expect(allowedCountries(ZONES).sort()).toEqual(['CA', 'DE', 'FR', 'GB', 'US']);
  });
});
