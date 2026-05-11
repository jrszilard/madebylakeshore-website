export const prerender = false;

import type { APIRoute } from 'astro';
import { sanityClientFresh } from '../../lib/sanity';

export const GET: APIRoute = async () => {
  const banner = await sanityClientFresh.fetch<{
    active: boolean;
    title?: string;
    body?: string;
    cta1?: { label?: string; url?: string };
    cta2?: { label?: string; url?: string };
  } | null>(`*[_type == "banner" && _id == "banner" && active == true][0]`);

  return new Response(JSON.stringify(banner ?? null), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
};
