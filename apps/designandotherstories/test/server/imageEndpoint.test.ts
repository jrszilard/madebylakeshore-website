import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { ALL, prerender } from '../../src/lib/server/noImageEndpoint';

// The Cloudflare adapter's own /_image endpoint (what imageService: 'compile' installs) fetches any address given
// as ?href= and returns it as the site's response: an open proxy, and a way to run someone's script on the shop's
// address. The site answers /_image with this endpoint instead.
describe('/_image', () => {
  it('answers 404 whatever it is asked to fetch, for any method', async () => {
    for (const method of ['GET', 'POST', 'HEAD']) {
      const request = new Request('https://www.designandotherstories.com/_image?href=https://example.com/', { method });
      const res = await ALL({ request, url: new URL(request.url) } as any);
      expect(res.status).toBe(404);
      if (method !== 'HEAD') expect(await res.text()).toBe('Not found');
    }
  });

  it('is rendered on request, so it takes the route from any built file', () => {
    expect(prerender).toBe(false);
  });

  it('is the endpoint astro.config.mjs installs, and the adapter is never set to "compile"', () => {
    const config = readFileSync(new URL('../../astro.config.mjs', import.meta.url), 'utf8');
    const code = config
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    expect(code).toContain("image: { endpoint: './src/lib/server/noImageEndpoint.ts' }");
    expect(code).toContain("cloudflare({ imageService: 'passthrough' })");
    expect(code).not.toContain("'compile'");
  });
});
