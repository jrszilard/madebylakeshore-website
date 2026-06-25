import { describe, it, expect } from 'vitest';
import { resolveShippingOption, allowedCountries } from '../../src/lib/commerce/shipping';
import type { ShippingZone } from '../../src/lib/types';

const zones: ShippingZone[] = [
  { label: 'US', countryCodes: ['US'], rateCents: 800, freeShippingThresholdCents: 10000 },
  { label: 'International', countryCodes: ['GB', 'CA'], rateCents: 2500 },
];

describe('resolveShippingOption', () => {
  it('charges the flat domestic rate under the threshold', () => {
    expect(resolveShippingOption('US', zones, 5000)).toEqual({ label: 'US', rateCents: 800 });
  });
  it('ships free at/above the threshold', () => {
    expect(resolveShippingOption('US', zones, 10000)).toEqual({ label: 'US', rateCents: 0 });
  });
  it('charges international flat (no threshold)', () => {
    expect(resolveShippingOption('GB', zones, 99999)).toEqual({ label: 'International', rateCents: 2500 });
  });
  it('rejects unknown country and empty', () => {
    expect(resolveShippingOption('FR', zones, 5000)).toBeNull();
    expect(resolveShippingOption('', zones)).toBeNull();
  });
});

describe('allowedCountries', () => {
  it('unions and upper-cases zone codes', () => {
    expect(allowedCountries(zones).sort()).toEqual(['CA', 'GB', 'US']);
  });
});
