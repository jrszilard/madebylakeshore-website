/**
 * Dynamic OG image generator.
 *
 * Renders branded social preview images on-the-fly using satori + sharp.
 * Cached by Vercel CDN so each unique URL is only rendered once.
 *
 * Usage: /api/og?title=My+Artwork&subtitle=Watercolor+on+paper&type=artwork
 *
 * Query params:
 *   - title (required): Main heading
 *   - subtitle (optional): Secondary text (medium, date, etc.)
 *   - type (optional): 'artwork' | 'event' | 'writing' | 'collection' | 'default'
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import satori from 'satori';
import { html } from 'satori-html';
import sharp from 'sharp';

// Brand colors (from tailwind config)
const COLORS = {
  cream: '#FAF6F1',
  ink: '#2C2825',
  terracotta: '#B5481F',
  clay: '#A89A8C',
  warm: '#EDE5DA',
};

// Type-specific accent colors
const TYPE_COLORS: Record<string, string> = {
  artwork: COLORS.terracotta,
  event: '#5B7B6A', // sage-ish
  writing: COLORS.ink,
  collection: COLORS.terracotta,
  default: COLORS.terracotta,
};

export const GET: APIRoute = async ({ url }) => {
  const title = url.searchParams.get('title') || 'Design & Other Stories';
  const subtitle = url.searchParams.get('subtitle') || '';
  const type = url.searchParams.get('type') || 'default';
  const accent = TYPE_COLORS[type] || TYPE_COLORS.default;

  const markup = html`
    <div
      style="
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        width: 1200px;
        height: 630px;
        background-color: ${COLORS.cream};
        padding: 60px;
        font-family: serif;
      "
    >
      <!-- Accent bar -->
      <div
        style="
          position: absolute;
          top: 0;
          left: 0;
          width: 8px;
          height: 100%;
          background-color: ${accent};
        "
      ></div>

      <!-- Brand mark -->
      <div
        style="
          position: absolute;
          top: 48px;
          right: 60px;
          font-size: 18px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: ${COLORS.clay};
        "
      >
        Design & Other Stories
      </div>

      <!-- Content -->
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 900px;">
        ${subtitle
          ? `<div style="font-size: 20px; text-transform: uppercase; letter-spacing: 0.15em; color: ${accent};">${subtitle}</div>`
          : ''}
        <div
          style="
            font-size: ${title.length > 40 ? '52' : '64'}px;
            font-style: italic;
            color: ${COLORS.ink};
            line-height: 1.15;
            overflow: hidden;
          "
        >
          ${title}
        </div>
      </div>

      <!-- Bottom line -->
      <div
        style="
          position: absolute;
          bottom: 48px;
          right: 60px;
          font-size: 16px;
          color: ${COLORS.clay};
        "
      >
        designandotherstories.com
      </div>
    </div>
  `;

  const svg = await satori(markup as any, {
    width: 1200,
    height: 630,
    fonts: [],
  });

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
    },
  });
};
