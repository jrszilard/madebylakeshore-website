import { describe, it, expect, vi, beforeEach } from 'vitest';

// The read behind fetchSettings, replaced so the test can count calls and make one fail.
const read = vi.fn();
vi.mock('@lakeshore/shared-ui/sanity', () => ({
  queries: { fattamanoSettings: 'SETTINGS QUERY' },
  createSanityClientWithConfig: () => ({ client: { fetch: read }, urlFor: () => null }),
}));

async function freshModule() {
  vi.resetModules(); // each test starts with nothing kept
  return import('../src/lib/sanity');
}

describe('fetchSettings', () => {
  beforeEach(() => read.mockReset());

  it('reads once for every page rendered within a minute, then again', async () => {
    const { fetchSettings, SETTINGS_FRESH_MS } = await freshModule();
    let clock = 1_000_000;
    const now = () => clock;
    read.mockResolvedValueOnce({ notFoundCopy: 'first' }).mockResolvedValueOnce({ notFoundCopy: 'second' });

    expect(await fetchSettings(now)).toEqual({ notFoundCopy: 'first' }); // the 404 page
    expect(await fetchSettings(now)).toEqual({ notFoundCopy: 'first' }); // its layout
    clock += SETTINGS_FRESH_MS - 1;
    expect(await fetchSettings(now)).toEqual({ notFoundCopy: 'first' }); // a scanner, 59.999 s later
    expect(read).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledWith('SETTINGS QUERY', undefined);

    clock += 1;
    expect(await fetchSettings(now)).toEqual({ notFoundCopy: 'second' });
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("doesn't keep a failed read: the next page asks again", async () => {
    const { fetchSettings } = await freshModule();
    read.mockRejectedValueOnce(new Error('sanity down')).mockResolvedValueOnce({ contactEmail: 'hello@fattamano.com' });

    await expect(fetchSettings()).rejects.toThrow('sanity down');
    expect(await fetchSettings()).toEqual({ contactEmail: 'hello@fattamano.com' });
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('keeps "no settings document" as an answer too', async () => {
    const { fetchSettings } = await freshModule();
    read.mockResolvedValue(null);
    expect(await fetchSettings()).toBeNull();
    expect(await fetchSettings()).toBeNull();
    expect(read).toHaveBeenCalledTimes(1);
  });
});
