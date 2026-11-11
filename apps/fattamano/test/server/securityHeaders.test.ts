import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { SECURITY_HEADERS, withSecurityHeaders } from '../../src/lib/securityHeaders';

const publicFile = (name: string) => readFileSync(new URL(`../../public/${name}`, import.meta.url), 'utf8');
const rules = (name: string) => publicFile(name).split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));

// public/_headers as { path: { header: value } }: a path starts a line, and its headers are indented under it.
function headerRules(): Record<string, Record<string, string>> {
  const found: Record<string, Record<string, string>> = {};
  let path = '';
  for (const line of rules('_headers')) {
    if (!/^\s/.test(line)) {
      path = line.trim();
      found[path] = {};
    } else {
      const at = line.indexOf(':');
      found[path][line.slice(0, at).trim()] = line.slice(at + 1).trim();
    }
  }
  return found;
}

// vercel.json's Content-Security-Policy before the move to Cloudflare (2026-11).
const VERCEL_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' " +
  "'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' " +
  "https://*.stripe.com https://cdn.sanity.io data:; connect-src 'self' https://*.sanity.io " +
  'https://api.stripe.com https://checkout.stripe.com https://m.stripe.network; frame-src https://js.stripe.com ' +
  "https://hooks.stripe.com https://checkout.stripe.com; frame-ancestors 'none'";

describe('security headers', () => {
  it('are the same for static files (public/_headers) as for what the Worker renders', () => {
    expect(headerRules()['/*']).toEqual(SECURITY_HEADERS);
  });

  it("keep Vercel's policy, adding only Cloudflare Web Analytics", () => {
    const added = (policy: string) =>
      policy
        .replace(' https://static.cloudflareinsights.com', '')
        .replace(' https://cloudflareinsights.com', '');
    expect(added(SECURITY_HEADERS['Content-Security-Policy'])).toBe(VERCEL_CSP);
  });

  it("are added to a response, even a redirect's, keeping its status, body and other headers", async () => {
    const page = withSecurityHeaders(new Response('hi', { status: 404, headers: { 'Cache-Control': 'no-store' } }));
    expect(page.headers.get('Content-Security-Policy')).toBe(SECURITY_HEADERS['Content-Security-Policy']);
    expect([page.status, page.headers.get('Cache-Control'), await page.text()]).toEqual([404, 'no-store', 'hi']);
    const redirect = withSecurityHeaders(Response.redirect('https://fattamano.com/things', 301));
    expect([redirect.status, redirect.headers.get('Location')]).toEqual([301, 'https://fattamano.com/things']);
    expect(redirect.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it("replace a response's own, so nothing a route returns can loosen the policy", () => {
    const loose = new Response('hi', {
      headers: { 'X-Frame-Options': 'ALLOWALL', 'Content-Security-Policy': "default-src * 'unsafe-inline'" },
    });
    const sent = withSecurityHeaders(loose);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) expect(sent.headers.get(name)).toBe(value);
  });
});

describe('static file rules', () => {
  it('let a browser keep the hashed files under /assets/ for good, and nothing else', () => {
    const { '/*': _security, ...others } = headerRules();
    expect(others).toEqual({ '/assets/*': { 'Cache-Control': 'public, max-age=31536000, immutable' } });
  });

  it('send an old /api/og image address to the default image', () => {
    expect(rules('_redirects')).toEqual(['/api/og /og-default.png 302']);
  });

  it('keep the Worker code and its routes file out of the static files', () => {
    expect(rules('.assetsignore')).toEqual(['_worker.js', '_routes.json']);
  });
});
