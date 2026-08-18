export const prerender = false;

import type { APIRoute } from 'astro';
import { sanityClient, queries } from '../lib/sanity';

// Static, always-present routes. Dynamic content routes (Journal posts) are
// appended below from Sanity. Extend the dynamic section later with shop/gallery/
// event slugs as desired.
const STATIC_PATHS = ['/', '/about', '/shop', '/gallery', '/events', '/writing', '/how-its-made'];

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const GET: APIRoute = async ({ site }) => {
  const origin = (site ?? new URL('https://designandotherstories.com')).origin;

  let journalSlugs: string[] = [];
  try {
    journalSlugs = (await sanityClient.fetch<string[]>(queries.allDaosJournalSlugs)) ?? [];
  } catch {
    // Degrade gracefully — still emit the static routes if Sanity is unavailable.
  }

  const paths = [...STATIC_PATHS, ...journalSlugs.map((slug) => `/how-its-made/${slug}`)];

  const urls = paths
    .map((path) => `  <url><loc>${xmlEscape(origin + path)}</loc></url>`)
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
