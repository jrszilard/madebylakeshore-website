import type { APIRoute } from 'astro';

// Astro gives every site it renders on request a /_image route, for resizing pictures on the fly. fattamano has
// no use for it (its pictures come from Sanity's CDN), so this stands in for it and answers 404.
//
// It matters which code sits behind that route. The Cloudflare adapter's own one, which its
// imageService: 'compile' setting installs, fetches whatever address ?href= names and returns it as the site's own
// response. Anyone could then serve their page, scripts and all, from fattamano.com. astro.config.mjs sets
// image.endpoint to this file, and test/server/imageEndpoint.test.ts keeps it that way.
export const prerender = false;

export const ALL: APIRoute = () => new Response('Not found', { status: 404 });
