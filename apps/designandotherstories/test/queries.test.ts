import { describe, it, expect } from 'vitest';
import { queries } from '@lakeshore/shared-ui/sanity';

describe('DAOS shop queries', () => {
  it('exposes the new shop queries as non-empty strings', () => {
    for (const k of ['daosProductsByIds', 'daosAvailabilityByIds', 'daosShopSettings', 'allForSaleArtworkSlugs']) {
      expect(typeof (queries as any)[k]).toBe('string');
      expect((queries as any)[k].length).toBeGreaterThan(0);
    }
  });
  it('daosProductsByIds filters both product types and selects price + stock', () => {
    expect(queries.daosProductsByIds).toContain('artwork');
    expect(queries.daosProductsByIds).toContain('shopProduct');
    expect(queries.daosProductsByIds).toContain('price');
    expect(queries.daosProductsByIds).toContain('stock');
  });
});
