/**
 * Dynamic OG image generator.
 *
 * Renders branded social preview images on-the-fly using satori + sharp.
 * Cached by Vercel CDN so each unique URL is only rendered once.
 *
 * Usage: /api/og?title=My+Item&subtitle=Stickers+and+prints
 *
 * Query params:
 *   - title (optional): Main heading (defaults to "fattamano")
 *   - subtitle (optional): Secondary text
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import satori from 'satori';
import { html } from 'satori-html';
import sharp from 'sharp';

// Brand colors (from tailwind config)
const COLORS = {
  paper: '#FBF9F4',
  ink: '#1A1A1A',
  shout: '#FF3D2E',
  smudge: '#8A8580',
};

// Cache font buffer so we only fetch once per cold start
let fontCacheRegular: ArrayBuffer | null = null;
let fontCacheBold: ArrayBuffer | null = null;

async function getFonts(): Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> {
  if (fontCacheRegular && fontCacheBold) {
    return { regular: fontCacheRegular, bold: fontCacheBold };
  }
  // Lora TTF from Google Fonts CDN — verified working URLs
  const [regularRes, boldRes] = await Promise.all([
    fetch('https://fonts.gstatic.com/s/lora/v37/0QI6MX1D_JOuGQbT0gvTJPa787weuyJG.ttf'),
    fetch('https://fonts.gstatic.com/s/lora/v37/0QI6MX1D_JOuGQbT0gvTJPa787z5vCJG.ttf'),
  ]);
  fontCacheRegular = await regularRes.arrayBuffer();
  fontCacheBold = await boldRes.arrayBuffer();
  return { regular: fontCacheRegular, bold: fontCacheBold };
}

export const GET: APIRoute = async ({ url }) => {
  const title = url.searchParams.get('title') || 'fattamano';
  const subtitle = url.searchParams.get('subtitle') || '';

  const titleFontSize = title.length > 40 ? '72px' : '96px';
  const subtitleHtml = subtitle
    ? `<div style="display:flex;font-size:32px;color:${COLORS.smudge};">${subtitle}</div>`
    : '';

  const markup = html`
    <div style="display:flex;flex-direction:column;justify-content:flex-end;width:1200px;height:630px;background-color:${COLORS.paper};padding:80px;font-family:serif;position:relative;">
      <div style="display:flex;position:absolute;top:0;left:0;height:12px;width:1200px;background-color:${COLORS.shout};"></div>
      <div style="display:flex;position:absolute;top:60px;right:80px;font-size:22px;letter-spacing:0.15em;text-transform:uppercase;color:${COLORS.smudge};">fattamano</div>
      <div style="display:flex;flex-direction:column;gap:20px;max-width:900px;">
        <div style="display:flex;font-size:${titleFontSize};line-height:1;color:${COLORS.ink};font-weight:700;">${title}</div>
        ${subtitleHtml}
      </div>
    </div>
  `;

  const { regular, bold } = await getFonts();

  const svg = await satori(markup as any, {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: 'serif',
        data: regular,
        weight: 400,
        style: 'normal',
      },
      {
        name: 'serif',
        data: bold,
        weight: 700,
        style: 'normal',
      },
    ],
  });

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
    },
  });
};
