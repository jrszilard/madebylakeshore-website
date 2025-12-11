import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://madebylakeshore.com',
  integrations: [
    tailwind(),
    react()
  ],
  output: 'hybrid',
  adapter: vercel(),
  build: {
    assets: 'assets'
  }
});
