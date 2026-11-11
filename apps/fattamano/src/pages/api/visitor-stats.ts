export const prerender = false;

import type { APIRoute } from 'astro';
import {
  classifyVisitor,
  planVisit,
  readStats,
  incrementStats,
  applyOptimistic,
  deferWrite,
  VISITOR_COOKIE,
} from '../../lib/server/visitorStats';

/**
 * Visitor-counter touchpoint. The homepage is statically prerendered, so
 * counting happens here: the page hydrates the "Totally Not Digital ID
 * Tracking" card from this endpoint (and a <noscript> image beacon hits it
 * for JS-free visitors). Same classification, cookie dedup, and deferred
 * write behavior the SSR homepage used to perform inline.
 */
export const GET: APIRoute = async ({ request, cookies, locals }) => {
  const plan = planVisit(
    classifyVisitor(request.headers.get('user-agent')),
    cookies.has(VISITOR_COOKIE),
  );

  const readback = await readStats();

  // locals.runtime is Cloudflare's request context (the adapter provides it, in dev too). Its waitUntil keeps
  // the Worker alive until the write lands; without it the write could be cut off once the response is sent.
  const ctx = locals.runtime?.ctx;
  deferWrite(incrementStats(plan.increments), ctx ? (work) => ctx.waitUntil(work) : undefined);

  if (plan.setHumanCookie) {
    cookies.set(VISITOR_COOKIE, '1', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  const stats = readback ? applyOptimistic(readback, plan.increments) : null;
  return new Response(JSON.stringify(stats), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
};
