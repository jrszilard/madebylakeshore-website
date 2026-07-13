export const prerender = false;

import type { APIRoute } from 'astro';
import { normalizeFunnelEvent } from '../../lib/analytics/events';
import { incrementFunnelEvent } from '../../lib/server/analytics';

const PRODUCTION_ORIGINS = new Set(['https://fattamano.com', 'https://www.fattamano.com']);

function allowedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const requestOrigin = new URL(request.url).origin;
  return origin === requestOrigin || PRODUCTION_ORIGINS.has(origin);
}

export const POST: APIRoute = async ({ request }) => {
  if (!allowedOrigin(request)) return new Response('forbidden', { status: 403 });

  const contentLength = Number(request.headers.get('content-length') || '0');
  if (contentLength > 2048) return new Response('too large', { status: 413 });

  const input = normalizeFunnelEvent(await request.json().catch(() => null));
  if (!input || input.event === 'purchase_completed') {
    return new Response('invalid event', { status: 400 });
  }

  try {
    await incrementFunnelEvent(input);
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return new Response('temporarily unavailable', { status: 503 });
  }
};
