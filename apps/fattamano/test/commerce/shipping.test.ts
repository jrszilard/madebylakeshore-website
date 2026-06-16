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

// A zone may carry an optional free-shipping threshold (in cents). When the cart
// subtotal reaches it, that zone ships free; zones without a threshold always
// charge their flat rate. Used for "free US shipping over $12" while leaving
// international zones at their flat rate.
const THRESHOLD_ZONES: ShippingZone[] = [
  { label: 'US', countryCodes: ['US'], rateCents: 300, freeShippingThresholdCents: 1200 },
  { label: 'Canada', countryCodes: ['CA'], rateCents: 1000 },
];

describe('resolveShippingOption free-shipping threshold', () => {
  it('charges the flat rate below the threshold', () => {
    expect(resolveShippingOption('US', THRESHOLD_ZONES, 1199)).toEqual({ label: 'US', rateCents: 300 });
  });
  it('is free at exactly the threshold', () => {
    expect(resolveShippingOption('US', THRESHOLD_ZONES, 1200)).toEqual({ label: 'US', rateCents: 0 });
  });
  it('is free above the threshold', () => {
    expect(resolveShippingOption('US', THRESHOLD_ZONES, 5000)).toEqual({ label: 'US', rateCents: 0 });
  });
  it('charges the flat rate for zones without a threshold, regardless of subtotal', () => {
    expect(resolveShippingOption('CA', THRESHOLD_ZONES, 100000)).toEqual({ label: 'Canada', rateCents: 1000 });
  });
  it('charges the flat rate when subtotal is omitted (defaults to 0, backward compatible)', () => {
    expect(resolveShippingOption('US', THRESHOLD_ZONES)).toEqual({ label: 'US', rateCents: 300 });
  });
});
