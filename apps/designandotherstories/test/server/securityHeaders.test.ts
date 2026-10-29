import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { SECURITY_HEADERS, withSecurityHeaders } from '../../src/lib/securityHeaders';

const publicFile = (name: string) => readFileSync(new URL(`../../public/${name}`, import.meta.url), 'utf8');

// vercel.json's Content-Security-Policy before the move to Cloudflare (2026-10-29).
const VERCEL_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' " +
  "'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' " +
  'https://*.stripe.com https://cdn.sanity.io https://substack-post-media.s3.amazonaws.com https://substackcdn.com ' +
  "data:; connect-src 'self' https://*.sanity.io https://api.stripe.com https://checkout.stripe.com " +
  'https://m.stripe.network; frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com ' +
  "https://designandtheotherstories.substack.com; frame-ancestors 'none'";

describe('security headers', () => {
  it('are the same for static files (public/_headers) as for what the Worker renders', () => {
    const lines = publicFile('_headers').split('\n').filter((l) => l.trim() && !l.startsWith('#'));
    expect(lines[0]).toBe('/*');
    const fromFile = Object.fromEntries(
      lines.slice(1).map((l) => {
        const at = l.indexOf(':');
        return [l.slice(0, at).trim(), l.slice(at + 1).trim()];
      }),
    );
    expect(fromFile).toEqual(SECURITY_HEADERS);
  });

  it("keep Vercel's policy, adding only Cloudflare Web Analytics", () => {
    const added = (policy: string) =>
      policy
        .replace(' https://static.cloudflareinsights.com', '')
        .replace(' https://cloudflareinsights.com', '');
    expect(added(SECURITY_HEADERS['Content-Security-Policy'])).toBe(VERCEL_CSP);
  });

  it("are added to a response, even a redirect's, without replacing a route's own", async () => {
    const page = withSecurityHeaders(new Response('hi', { headers: { 'X-Frame-Options': 'SAMEORIGIN' } }));
    expect(page.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
    expect(page.headers.get('Content-Security-Policy')).toBe(SECURITY_HEADERS['Content-Security-Policy']);
    expect(await page.text()).toBe('hi');
    const redirect = withSecurityHeaders(Response.redirect('https://www.designandotherstories.com/gallery', 301));
    expect([redirect.status, redirect.headers.get('Location')]).toEqual([301, 'https://www.designandotherstories.com/gallery']);
    expect(redirect.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });
});

describe('redirects', () => {
  it("are vercel.json's two, permanent", () => {
    expect(publicFile('_redirects').trim().split('\n')).toEqual([
      '/paintings /gallery?category=painting 308',
      '/drawings /gallery?category=drawing 308',
    ]);
  });

  it('keep the Worker code and its routes file out of the static files', () => {
    expect(publicFile('.assetsignore').trim().split('\n')).toEqual(['_worker.js', '_routes.json']);
  });
});
