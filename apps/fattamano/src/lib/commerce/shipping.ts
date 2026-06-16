import type { ShippingZone } from '../types';

export function resolveShippingOption(
  country: string,
  zones: ShippingZone[],
  subtotalCents = 0
): { label: string; rateCents: number } | null {
  const code = (country || '').trim().toUpperCase();
  if (!code) return null;
  for (const zone of zones) {
    if (zone.countryCodes.some((c) => c.trim().toUpperCase() === code)) {
      const threshold = zone.freeShippingThresholdCents;
      const freeShip =
        typeof threshold === 'number' && threshold >= 0 && subtotalCents >= threshold;
      return { label: zone.label, rateCents: freeShip ? 0 : zone.rateCents };
    }
  }
  return null;
}

export function allowedCountries(zones: ShippingZone[]): string[] {
  const set = new Set<string>();
  for (const zone of zones) {
    for (const c of zone.countryCodes) set.add(c.trim().toUpperCase());
  }
  return [...set];
}
