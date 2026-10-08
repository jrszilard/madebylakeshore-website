import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel/serverless';
import { withBuildNodeRuntime } from '@lakeshore/shared-ui/vercel-runtime';

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
  ],
  output: 'hybrid',
  adapter: withBuildNodeRuntime(vercel({ maxDuration: 30 })),
  build: { assets: 'assets' },
});
