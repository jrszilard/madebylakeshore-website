import type { FattamanoProduct } from './types';

/**
 * A product's social preview image (og:image). src/pages/og/[slug].png.ts builds one per product; the product
 * page points at it with this path.
 */
export function productOgImagePath(slug: string): string {
  return `/og/${slug}.png`;
}

/** The two lines on a product's preview image: its title, and its tagline (or its category when it has none). */
export function productOgText(product: Pick<FattamanoProduct, 'title' | 'tagline' | 'category'>): {
  title: string;
  subtitle: string;
} {
  return {
    title: product.title || 'fattamano',
    subtitle: product.tagline || product.category || '',
  };
}

// Brand colors (from the Tailwind config).
const COLORS = {
  paper: '#FBF9F4',
  ink: '#1A1A1A',
  shout: '#FF3D2E',
  smudge: '#8A8580',
};

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

type Style = Record<string, string | number>;
export interface OgNode {
  type: 'div';
  props: { style: Style; children?: string | OgNode[] };
}

const box = (style: Style, children?: string | OgNode[]): OgNode => ({ type: 'div', props: { style, children } });

/**
 * The preview card's layout, as the element tree satori draws. The title and subtitle go in as text, never as
 * markup, so nothing in a product's name can break the card. (The card was an HTML string before 2026-11, and its
 * subtitle came out as escaped markup: "&lt;div style=...".)
 */
export function ogCard(title: string, subtitle: string): OgNode {
  const text: OgNode[] = [
    box(
      {
        display: 'flex',
        fontSize: title.length > 40 ? '72px' : '96px',
        lineHeight: 1,
        color: COLORS.ink,
        fontWeight: 700,
      },
      title,
    ),
  ];
  if (subtitle) text.push(box({ display: 'flex', fontSize: '32px', color: COLORS.smudge }, subtitle));

  return box(
    {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      width: `${OG_IMAGE_SIZE.width}px`,
      height: `${OG_IMAGE_SIZE.height}px`,
      backgroundColor: COLORS.paper,
      padding: '80px',
      fontFamily: 'serif',
      position: 'relative',
    },
    [
      box({
        display: 'flex',
        position: 'absolute',
        top: 0,
        left: 0,
        height: '12px',
        width: `${OG_IMAGE_SIZE.width}px`,
        backgroundColor: COLORS.shout,
      }),
      box(
        {
          display: 'flex',
          position: 'absolute',
          top: '60px',
          right: '80px',
          fontSize: '22px',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: COLORS.smudge,
        },
        'fattamano',
      ),
      box({ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '900px' }, text),
    ],
  );
}
