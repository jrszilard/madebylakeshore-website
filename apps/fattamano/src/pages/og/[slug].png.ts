/**
 * Product social preview images (og:image): one 1200×630 PNG per product, at /og/<slug>.png.
 *
 * They are drawn when the site is built, like the product pages they belong to, with satori + sharp. Before the
 * move to Cloudflare (2026-11) they were drawn on request at /api/og; sharp is native code, which can't run in a
 * Worker. An old /api/og address gets the default image (public/_redirects).
 *
 * This file runs in Node, at build time only, so it may read files: Astro drops a prerendered route's code from
 * the Worker (astro.config.mjs keeps these Node imports out of the bundle meanwhile).
 */
export const prerender = true;

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import type { APIRoute, GetStaticPaths } from 'astro';
import satori from 'satori';
import sharp from 'sharp';
import { sanityClient, queries } from '../../lib/sanity';
import { OG_IMAGE_SIZE, ogCard, productOgText } from '../../lib/ogImage';
import type { FattamanoProduct } from '../../lib/types';

// The card's font is Lora, read from the @fontsource/lora package (its Latin files; satori reads WOFF, not
// WOFF2), so a build needs nothing from the network but Sanity.
const require = createRequire(import.meta.url);
const lora = (weight: 400 | 700) =>
  readFile(require.resolve(`@fontsource/lora/files/lora-latin-${weight}-normal.woff`));
let fonts: Promise<[Buffer, Buffer]> | undefined;

export const getStaticPaths: GetStaticPaths = async () => {
  // The same list the product pages are built from (src/pages/things/[slug].astro), so every page has its image.
  const products = await sanityClient
    .fetch<FattamanoProduct[]>(queries.allFattamanoProducts)
    .catch(() => [] as FattamanoProduct[]);
  return products.map((product) => ({
    params: { slug: product.slug.current },
    props: productOgText(product),
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const { title, subtitle } = props as { title: string; subtitle: string };

  const [regular, bold] = await (fonts ??= Promise.all([lora(400), lora(700)]));

  // satori takes React's element shape; the card is plain objects of that shape.
  const svg = await satori(ogCard(title, subtitle) as any, {
    ...OG_IMAGE_SIZE,
    fonts: [
      { name: 'serif', data: regular, weight: 400, style: 'normal' },
      { name: 'serif', data: bold, weight: 700, style: 'normal' },
    ],
  });
  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
