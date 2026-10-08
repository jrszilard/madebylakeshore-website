import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel/serverless';
import { withBuildNodeRuntime } from '@lakeshore/shared-ui/vercel-runtime';

export default defineConfig({
  site: 'https://designandotherstories.com',
  integrations: [
    tailwind(),
    react()
  ],
  output: 'hybrid',
  adapter: withBuildNodeRuntime(vercel({
    maxDuration: 30
  })),
  build: {
    assets: 'assets'
  }
});
