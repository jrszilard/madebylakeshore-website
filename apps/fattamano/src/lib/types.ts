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
  _id: string;
  title: string;
  slug: SanitySlug;
  tagline?: string;
  images?: SanityImageLike[];
  category: string;
  /** Real Fake Ads campaign slug (bare, e.g. 'wewantdeadpeople') this object advertises. */
  campaign?: string;
  priceCents?: number;
  priceDisplayOverride?: string;
  buyUrl?: string;
  status: FattamanoProductStatus;
  stock?: number;
  description?: RichTextBlock[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
  };
}

export interface ShippingZone {
  label: string;
  countryCodes: string[];
  rateCents: number;
  // Optional: when the cart subtotal (cents) reaches this, the zone ships free.
  // Omit to always charge the flat rate (e.g. international zones).
  freeShippingThresholdCents?: number;
}

export interface FattamanoSettings {
  heroHeadline?: string;
  heroSubcopy?: string;
  contactEmail?: string;
  shippingZones?: ShippingZone[];
  shippingFallbackBehavior?: 'reject';
}

// One line in the cart (client) and the unit the checkout validates.
export interface CartItem {
  productId: string; // Sanity _id
  slug: string;
  title: string;
  priceCents: number;
  image?: SanityImageLike | null;
  qty: number;
}

// Authoritative product row fetched server-side at checkout.
export interface ProductRow {
  _id: string;
  title: string;
  priceCents?: number;
  status: FattamanoProductStatus;
  stock?: number;
  image?: SanityImageLike | null;
}
