// The security headers on every response, as vercel.json set them before the move to Cloudflare (2026-11).
// Cloudflare serves the static files itself, with public/_headers, and the Worker's responses get these from
// src/middleware.ts. The two must match: test/server/securityHeaders.test.ts checks they do.
// The CSP also allows Cloudflare Web Analytics (static.cloudflareinsights.com, cloudflareinsights.com).
export const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' https://*.stripe.com https://cdn.sanity.io data:",
    "connect-src 'self' https://*.sanity.io https://api.stripe.com https://checkout.stripe.com https://m.stripe.network https://cloudflareinsights.com",
    'frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com',
    "frame-ancestors 'none'",
  ].join('; '),
};

export function withSecurityHeaders(response: Response): Response {
  // A new response, since some (a redirect, a fetched asset) have headers that can't be changed. The site's
  // headers replace any of the same name the response came with, so nothing a route returns can loosen them.
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
