import { defineMiddleware } from 'astro:middleware';
import { withSecurityHeaders } from './lib/securityHeaders';

// Every page and API route the Worker renders gets the site's security headers (src/lib/securityHeaders.ts).
// Static files get the same ones from public/_headers.
export const onRequest = defineMiddleware(async (_context, next) => withSecurityHeaders(await next()));
