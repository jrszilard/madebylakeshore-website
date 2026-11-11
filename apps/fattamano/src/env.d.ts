/// <reference path="../.astro/types.d.ts" />

// Cloudflare's request context, which the adapter puts on Astro.locals.runtime (env, cf, ctx.waitUntil).
type Runtime = import('@astrojs/cloudflare').Runtime;

declare namespace App {
  interface Locals extends Runtime {}
}
