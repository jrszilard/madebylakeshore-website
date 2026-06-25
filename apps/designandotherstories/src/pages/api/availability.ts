export const prerender = false;

import type { APIRoute } from 'astro';
import { sanityClient, queries } from '../../lib/sanity';

export const GET: APIRoute = async ({ url }) => {
  const ids = (url.searchParams.get('ids') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100);
  if (!ids.length) return Response.json([]);

  const rows = await sanityClient.fetch<{ _id: string; inStock: boolean }[]>(
    queries.daosAvailabilityByIds,
    { ids }
  );

  return new Response(JSON.stringify(rows), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=15' },
  });
};
