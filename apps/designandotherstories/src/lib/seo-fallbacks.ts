/**
 * Build-time SEO fallback generators.
 *
 * When Sanity SEO fields are empty, these produce decent meta titles
 * and descriptions from existing content fields. This means every page
 * gets good SEO even if Wilma never touches the SEO tab.
 */

const BRAND = 'Design & Other Stories';
const ARTIST = 'W. H. Bonilla';

/** Truncate text to a max length at a word boundary, adding ellipsis. */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const truncated = text.slice(0, max).replace(/\s+\S*$/, '');
  return truncated + '…';
}

/** Strip basic HTML tags if present. */
function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Generate a meta title for an artwork page.
 * Format: "Title — Medium | Design & Other Stories"
 */
export function artworkMetaTitle(artwork: {
  title: string;
  medium?: string;
  seo?: { metaTitle?: string };
}): string {
  if (artwork.seo?.metaTitle) return artwork.seo.metaTitle;
  const parts = [artwork.title];
  if (artwork.medium) parts.push(artwork.medium);
  return truncate(`${parts.join(' — ')} | ${BRAND}`, 60);
}

/**
 * Generate a meta description for an artwork page.
 * Pulls from seo.metaDescription > story > generated description.
 */
export function artworkMetaDescription(artwork: {
  title: string;
  medium?: string;
  year?: number;
  story?: string;
  seo?: { metaDescription?: string };
}): string {
  if (artwork.seo?.metaDescription) return artwork.seo.metaDescription;
  if (artwork.story) return truncate(stripTags(artwork.story), 155);

  const parts = [`"${artwork.title}"`];
  if (artwork.medium) parts.push(`${artwork.medium}`);
  parts.push(`by ${ARTIST}`);
  if (artwork.year) parts.push(`(${artwork.year})`);
  parts.push('— original handmade art from New Hampshire');
  return truncate(parts.join(' '), 155);
}

/**
 * Generate a meta title for an event page.
 */
export function eventMetaTitle(event: {
  title: string;
  location?: { city?: string; state?: string };
  seo?: { metaTitle?: string };
}): string {
  if (event.seo?.metaTitle) return event.seo.metaTitle;
  const loc = [event.location?.city, event.location?.state].filter(Boolean).join(', ');
  const suffix = loc ? ` in ${loc}` : '';
  return truncate(`${event.title}${suffix} | ${BRAND}`, 60);
}

/**
 * Generate a meta description for an event page.
 */
export function eventMetaDescription(event: {
  title: string;
  startDate: string;
  location?: { venueName?: string; city?: string; state?: string };
  eventType?: string;
  seo?: { metaDescription?: string };
}): string {
  if (event.seo?.metaDescription) return event.seo.metaDescription;

  const date = new Date(event.startDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const loc = [event.location?.venueName, event.location?.city, event.location?.state]
    .filter(Boolean)
    .join(', ');
  const type = event.eventType?.replace('-', ' ') || 'event';

  return truncate(
    `Find ${BRAND} at ${event.title} — ${type} on ${date}${loc ? ` at ${loc}` : ''}. Original handmade art by ${ARTIST}.`,
    155,
  );
}

/**
 * Generate a meta title for a book page.
 */
export function bookMetaTitle(book: {
  title: string;
  type?: string;
  seo?: { metaTitle?: string };
}): string {
  if (book.seo?.metaTitle) return book.seo.metaTitle;
  const typeLabel = book.type ? ` — ${book.type.replace('-', ' ')}` : '';
  return truncate(`${book.title}${typeLabel} by ${ARTIST} | ${BRAND}`, 60);
}

/**
 * Generate a meta description for a book page.
 */
export function bookMetaDescription(book: {
  title: string;
  blurb?: string;
  type?: string;
  seo?: { metaDescription?: string };
}): string {
  if (book.seo?.metaDescription) return book.seo.metaDescription;
  if (book.blurb) return truncate(stripTags(book.blurb), 155);

  const typeLabel = book.type?.replace('-', ' ') || 'literary fiction';
  return truncate(
    `"${book.title}" — ${typeLabel} by ${ARTIST}. Stories about connection, found family, and the weight of ordinary moments.`,
    155,
  );
}

/**
 * Generate a meta description for a collection page.
 */
export function collectionMetaDescription(collection: {
  title: string;
  tagline?: string;
  artworkCount?: number;
}): string {
  if (collection.tagline) return truncate(collection.tagline, 155);
  const countStr = collection.artworkCount ? `${collection.artworkCount} pieces` : 'original art';
  return truncate(
    `"${collection.title}" — a collection of ${countStr} by ${ARTIST}. Handmade paintings, drawings, and prints from New Hampshire.`,
    155,
  );
}
