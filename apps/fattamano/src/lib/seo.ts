import { urlFor } from './sanity';
import { formatPrice } from './format';
import type { FattamanoProduct, SanityImageLike } from './types';

export const SITE_URL = 'https://fattamano.com';
export const SITE_NAME = 'fattamano';
export const DEFAULT_DESCRIPTION =
  'Handmade stickers, shirts, prints, and fake-company artifacts by Wilma of Lakeshore Studios.';

export function absoluteUrl(path = '/') {
  return new URL(path, SITE_URL).toString();
}

export function productImageUrl(image?: SanityImageLike | null, width = 1200) {
  if (!image) return null;
  return urlFor(image)?.width(width).url() ?? null;
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'OnlineStore'],
    '@id': absoluteUrl('/#organization'),
    name: SITE_NAME,
    url: absoluteUrl('/'),
    logo: absoluteUrl('/og-default.png'),
    description: DEFAULT_DESCRIPTION,
    brand: {
      '@type': 'Brand',
      name: SITE_NAME,
    },
    parentOrganization: {
      '@type': 'Organization',
      name: 'Design & Other Stories',
      url: 'https://designandotherstories.com',
    },
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': absoluteUrl('/#website'),
    name: SITE_NAME,
    url: absoluteUrl('/'),
    description: DEFAULT_DESCRIPTION,
    publisher: { '@id': absoluteUrl('/#organization') },
  };
}

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function collectionPageSchema({
  name,
  description,
  path,
}: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: absoluteUrl(path),
    isPartOf: { '@id': absoluteUrl('/#website') },
    publisher: { '@id': absoluteUrl('/#organization') },
  };
}

export function articleSchema({
  title,
  description,
  path,
  datePublished,
  dateModified = datePublished,
}: {
  title: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url: absoluteUrl(path),
    datePublished,
    dateModified,
    author: {
      '@type': 'Person',
      name: 'Wilma Bonilla',
    },
    publisher: { '@id': absoluteUrl('/#organization') },
    mainEntityOfPage: absoluteUrl(path),
  };
}

export function productSchema(product: FattamanoProduct) {
  const price = typeof product.priceCents === 'number' ? (product.priceCents / 100).toFixed(2) : undefined;
  const image = productImageUrl(product.images?.[0]);
  const path = `/things/${product.slug.current}`;
  const availability =
    product.status === 'available' && (product.stock ?? 0) > 0
      ? 'https://schema.org/InStock'
      : product.status === 'coming_soon' || product.status === 'concept'
        ? 'https://schema.org/PreOrder'
        : 'https://schema.org/OutOfStock';

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.seo?.metaDescription || product.tagline || `${product.title} — handmade by fattamano.`,
    image: image ? [image] : undefined,
    url: absoluteUrl(path),
    brand: {
      '@type': 'Brand',
      name: SITE_NAME,
    },
    category: product.category,
    sku: product._id,
    offers: price
      ? {
          '@type': 'Offer',
          url: absoluteUrl(path),
          priceCurrency: 'USD',
          price,
          availability,
          itemCondition: 'https://schema.org/NewCondition',
          seller: { '@id': absoluteUrl('/#organization') },
        }
      : undefined,
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Display price',
        value: formatPrice(product.priceCents, product.priceDisplayOverride) || 'Contact for price',
      },
      {
        '@type': 'PropertyValue',
        name: 'Made by',
        value: 'Handmade by Wilma Bonilla',
      },
    ],
  };
}
