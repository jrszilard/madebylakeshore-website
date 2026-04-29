/**
 * JSON-LD structured data generators for SEO/GEO/AEO optimization.
 *
 * These produce schema.org compliant JSON-LD objects that help search engines
 * and AI answer engines (ChatGPT, Perplexity, Google AI Overviews) understand
 * and cite our content.
 */

const SITE_URL = 'https://designandotherstories.com';
const SITE_NAME = 'Design & Other Stories';
const ARTIST_NAME = 'W. H. Bonilla';

// ─── WebSite schema (homepage) ─────────────────────────────────────────────

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description:
      'A small studio making literary fiction and traditional art by hand in New Hampshire. Original paintings, drawings, and books — made one piece at a time.',
    creator: personSchema(),
  };
}

// ─── Person schema (artist identity — critical for entity establishment) ────

export function personSchema(opts?: { imageUrl?: string; socialLinks?: { platform: string; url: string }[] }) {
  const sameAs = (opts?.socialLinks ?? []).map((l) => l.url);
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: ARTIST_NAME,
    alternateName: 'Wilma Bonilla',
    url: `${SITE_URL}/about`,
    jobTitle: 'Artist & Writer',
    description:
      'Painter, printmaker, and writer based in New Hampshire. Makes original art and literary fiction — ink, watercolor, graphite, novels, and short stories.',
    knowsAbout: [
      'Watercolor painting',
      'Ink drawing',
      'Graphite drawing',
      'Printmaking',
      'Literary fiction',
      'Short stories',
      'Handmade art',
    ],
    ...(opts?.imageUrl ? { image: opts.imageUrl } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    address: {
      '@type': 'PostalAddress',
      addressRegion: 'NH',
      addressCountry: 'US',
    },
  };
}

// ─── Organization schema (the studio) ──────────────────────────────────────

export function organizationSchema(opts?: { logoUrl?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    ...(opts?.logoUrl ? { logo: opts.logoUrl } : {}),
    description:
      'A New Hampshire studio making original paintings, drawings, prints, and literary fiction by hand.',
    founder: {
      '@type': 'Person',
      name: ARTIST_NAME,
    },
    address: {
      '@type': 'PostalAddress',
      addressRegion: 'NH',
      addressCountry: 'US',
    },
  };
}

// ─── VisualArtwork schema (individual art pieces) ──────────────────────────

export function artworkSchema(opts: {
  title: string;
  slug: string;
  description?: string;
  medium?: string;
  dimensions?: { width?: number; height?: number; unit?: string };
  year?: number;
  imageUrl?: string;
  price?: number;
  available?: boolean;
  collection?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: opts.title,
    url: `${SITE_URL}/gallery/${opts.slug}`,
    ...(opts.description ? { description: opts.description } : {}),
    creator: {
      '@type': 'Person',
      name: ARTIST_NAME,
    },
    ...(opts.medium ? { artMedium: opts.medium } : {}),
    ...(opts.year ? { dateCreated: String(opts.year) } : {}),
    ...(opts.imageUrl ? { image: opts.imageUrl } : {}),
    ...(opts.collection ? { isPartOf: { '@type': 'CreativeWork', name: opts.collection } } : {}),
    artform: 'Painting',
    ...(opts.dimensions?.width && opts.dimensions?.height
      ? {
          width: { '@type': 'Distance', name: `${opts.dimensions.width} ${opts.dimensions.unit || 'in'}` },
          height: { '@type': 'Distance', name: `${opts.dimensions.height} ${opts.dimensions.unit || 'in'}` },
        }
      : {}),
    ...(opts.price
      ? {
          offers: {
            '@type': 'Offer',
            price: opts.price,
            priceCurrency: 'USD',
            availability: opts.available
              ? 'https://schema.org/InStock'
              : 'https://schema.org/SoldOut',
            seller: {
              '@type': 'Organization',
              name: SITE_NAME,
            },
          },
        }
      : {}),
  };
}

// ─── Product schema (for shop items — Google Merchant compatibility) ───────

export function productSchema(opts: {
  title: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  price?: number;
  available?: boolean;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: opts.title,
    url: `${SITE_URL}/gallery/${opts.slug}`,
    ...(opts.description ? { description: opts.description } : {}),
    ...(opts.imageUrl ? { image: opts.imageUrl } : {}),
    brand: {
      '@type': 'Brand',
      name: SITE_NAME,
    },
    ...(opts.price
      ? {
          offers: {
            '@type': 'Offer',
            price: opts.price,
            priceCurrency: 'USD',
            availability: opts.available
              ? 'https://schema.org/InStock'
              : 'https://schema.org/SoldOut',
            seller: {
              '@type': 'Organization',
              name: SITE_NAME,
            },
          },
        }
      : {}),
  };
}

// ─── Event schema ──────────────────────────────────────────────────────────

export function eventSchema(opts: {
  title: string;
  slug: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: {
    venueName?: string;
    address?: string;
    city?: string;
    state?: string;
  };
  eventType?: string;
  imageUrl?: string;
  externalUrl?: string;
}) {
  const locationParts = [opts.location?.venueName, opts.location?.city, opts.location?.state].filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: opts.title,
    url: opts.externalUrl || `${SITE_URL}/events/${opts.slug}`,
    ...(opts.description ? { description: opts.description } : {}),
    startDate: opts.startDate,
    ...(opts.endDate ? { endDate: opts.endDate } : {}),
    ...(opts.imageUrl ? { image: opts.imageUrl } : {}),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    organizer: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    performer: {
      '@type': 'Person',
      name: ARTIST_NAME,
    },
    ...(opts.location
      ? {
          location: {
            '@type': 'Place',
            name: opts.location.venueName || locationParts.join(', '),
            address: {
              '@type': 'PostalAddress',
              ...(opts.location.address ? { streetAddress: opts.location.address } : {}),
              ...(opts.location.city ? { addressLocality: opts.location.city } : {}),
              ...(opts.location.state ? { addressRegion: opts.location.state } : {}),
              addressCountry: 'US',
            },
          },
        }
      : {}),
  };
}

// ─── Book / CreativeWork schema ────────────────────────────────────────────

export function bookSchema(opts: {
  title: string;
  slug: string;
  description?: string;
  type?: string;
  imageUrl?: string;
  purchaseLinks?: { platform: string; url: string }[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: opts.title,
    url: `${SITE_URL}/writing/${opts.slug}`,
    ...(opts.description ? { description: opts.description } : {}),
    ...(opts.imageUrl ? { image: opts.imageUrl } : {}),
    author: {
      '@type': 'Person',
      name: ARTIST_NAME,
    },
    ...(opts.type ? { bookFormat: 'https://schema.org/Paperback' } : {}),
    ...(opts.purchaseLinks && opts.purchaseLinks.length > 0
      ? {
          offers: opts.purchaseLinks.map((link) => ({
            '@type': 'Offer',
            url: link.url,
            seller: {
              '@type': 'Organization',
              name: link.platform,
            },
          })),
        }
      : {}),
  };
}

// ─── BreadcrumbList schema ─────────────────────────────────────────────────

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

// ─── FAQPage schema (critical for AEO) ────────────────────────────────────

export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

// ─── CollectionPage schema ─────────────────────────────────────────────────

export function collectionSchema(opts: {
  title: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  artworkCount?: number;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: opts.title,
    url: `${SITE_URL}/gallery/collections/${opts.slug}`,
    ...(opts.description ? { description: opts.description } : {}),
    ...(opts.imageUrl ? { image: opts.imageUrl } : {}),
    creator: {
      '@type': 'Person',
      name: ARTIST_NAME,
    },
    ...(opts.artworkCount ? { numberOfItems: opts.artworkCount } : {}),
  };
}

// ─── Helper to serialize to <script> tag ───────────────────────────────────

export function toJsonLdString(schema: object | object[]): string {
  const data = Array.isArray(schema) ? schema : [schema];
  return data.map((d) => JSON.stringify(d)).join('\n');
}
