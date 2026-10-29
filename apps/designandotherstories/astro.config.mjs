import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';

// Hosted on Cloudflare Workers since the move from Vercel (2026-10-29): see wrangler.jsonc beside this file.
// @astrojs/cloudflare 11 is the adapter line for Astro 4.
export default defineConfig({
  site: 'https://designandotherstories.com',
  integrations: [
    tailwind(),
    react()
  ],
  output: 'hybrid',
  adapter: cloudflare({ imageService: 'compile' }),
  build: {
    assets: 'assets'
  },
  vite: {
    ssr: {
      // Node's built-ins come from the Workers runtime (nodejs_compat in wrangler.jsonc), not the bundle:
      // src/lib/server/orderStore.ts hashes order tokens with node:crypto.
      external: ['node:crypto']
    }
  }
});
