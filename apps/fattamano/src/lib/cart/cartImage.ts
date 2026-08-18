import imageUrlBuilder from '@sanity/image-url';
import type { SanityImageLike } from '../types';

/**
 * Client-safe thumbnail builder for cart line items.
 *
 * The cart lives in localStorage and renders in React islands, so pulling the
 * full Sanity client in via lib/sanity would bloat every page for a 56px
 * thumbnail. @sanity/image-url only needs the public project id/dataset.
 */
const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = import.meta.env.PUBLIC_SANITY_DATASET || 'production';

const builder = projectId ? imageUrlBuilder({ projectId, dataset }) : null;

export function cartThumb(image: SanityImageLike | null | undefined, size = 112): string | null {
  if (!builder || !image?.asset) return null;
  try {
    return builder.image(image).width(size).height(size).fit('crop').auto('format').url();
  } catch {
    return null;
  }
}
