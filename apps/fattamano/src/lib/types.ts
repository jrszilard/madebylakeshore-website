export interface SanitySlug {
  current: string;
}

export interface SanityImageLike {
  _type?: string;
  asset?: unknown;
  alt?: string;
  [key: string]: unknown;
}

export type FattamanoProductStatus = 'available' | 'sold_out' | 'coming_soon' | 'concept';

export interface RichTextBlock {
  _type?: string;
  children?: Array<{ text?: string }>;
}

export interface FattamanoProduct {
  title: string;
  slug: SanitySlug;
  tagline?: string;
  images?: SanityImageLike[];
  category: string;
  priceCents?: number;
  priceDisplayOverride?: string;
  buyUrl?: string;
  status: FattamanoProductStatus;
  description?: RichTextBlock[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
  };
}
