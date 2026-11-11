import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import { slashlessPages } from './integrations/slashless-pages.mjs';

// The checkout page publishes this key, so a build takes only a publishable one (pk_...). A secret key put in the
// build's settings by mistake stops the build here, before it can go out on a public page.
const publishableKey = process.env.PUBLIC_STRIPE_PUBLISHABLE_KEY;
if (publishableKey && !/^pk_(live|test)_/.test(publishableKey)) {
  throw new Error('PUBLIC_STRIPE_PUBLISHABLE_KEY must be a Stripe publishable key (pk_live_... or pk_test_...)');
}

// Hosted on Cloudflare Workers since the move from Vercel (2026-11): see wrangler.jsonc beside this file.
// @astrojs/cloudflare 11 is the adapter line for Astro 4.
export default defineConfig({
  site: 'https://fattamano.com',
  integrations: [
    tailwind(),
    react(),
    sitemap({
      filter: (page) => !page.includes('/api/'),
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    }),
    // Keeps fattamano.com/wewantdeadpeople (no trailing slash, as printed on the stickers) answering directly.
    slashlessPages(),
  ],
  output: 'hybrid',
  // Never imageService: 'compile'. In this adapter it puts an open proxy at /_image (the story is in
  // src/lib/server/noImageEndpoint.ts, which answers that route instead). The site uses none of Astro's image
  // tools, so 'passthrough' loses nothing.
  adapter: cloudflare({ imageService: 'passthrough' }),
  image: { endpoint: './src/lib/server/noImageEndpoint.ts' },
  build: { assets: 'assets' },
  vite: {
    ssr: {
      // The adapter bundles everything into the Worker; these stay imports.
      // - node:crypto comes from the Workers runtime (nodejs_compat in wrangler.jsonc):
      //   src/lib/server/orderStore.ts hashes order tokens with it.
      // - sharp (native code, which can't run in a Worker) and the two file-reading modules are used only by
      //   src/pages/og/[slug].png.ts. That route is rendered in Node while the site is built, and Astro drops
      //   its code from the Worker afterwards.
      external: ['node:crypto', 'node:fs/promises', 'node:module', 'sharp'],
    },
  },
});
