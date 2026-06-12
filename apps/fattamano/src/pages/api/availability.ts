export const prerender = false;

import type { APIRoute } from 'astro';
import { sanityClient, queries } from '../../lib/sanity';

// Public, unauthenticated endpoint. SECURITY: uses the PUBLIC read client
// (no write token) because anyone can call it. Returns only non-sensitive
// availability fields (status, stock), bounded to 100 ids, GROQ-parameterized.
export const GET: APIRoute = async ({ url }) => {
  const ids = (url.searchParams.get('ids') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100); // bound the query
  if (!ids.length) return Response.json([]);
  const rows = await sanityClient.fetch<{ _id: string; status: string; stock: number }[]>(
    queries.fattamanoAvailabilityByIds,
    { ids }
  );
  return new Response(JSON.stringify(rows), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=15' },
  });
};
