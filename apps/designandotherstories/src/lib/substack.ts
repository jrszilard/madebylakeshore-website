import { SUBSTACK_URL, SUBSTACK_FEED_URL } from './config';

export const SUBSTACK_FALLBACK_URL = SUBSTACK_URL;

export interface SubstackPost {
  title: string;
  link: string;
  excerpt: string;
  pubDate: string;
  coverImage: string | null;
  categories: string[];
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function extractText(xml: string, tag: string): string {
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'));
  if (cdataMatch) return cdataMatch[1].trim();
  const plainMatch = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (plainMatch) return plainMatch[1].trim();
  return '';
}

function extractAttribute(xml: string, tag: string, attr: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]+${attr}="([^"]*)"`, 'i'));
  return match ? match[1] : null;
}

function parseRssFeed(xml: string, tag?: string): SubstackPost[] {
  const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
  const items: SubstackPost[] = [];
  let match: RegExpExecArray | null;

  while ((match = itemPattern.exec(xml)) !== null) {
    const itemXml = match[1];

    const title = stripHtml(extractText(itemXml, 'title'));
    const link = extractText(itemXml, 'link') || extractAttribute(itemXml, 'link', 'href') || '';
    const rawDescription = extractText(itemXml, 'description');
    const plainDescription = stripHtml(rawDescription);
    const excerpt =
      plainDescription.length > 200
        ? plainDescription.slice(0, 200).replace(/\s+\S*$/, '') + '\u2026'
        : plainDescription;
    const pubDate = extractText(itemXml, 'pubDate');
    const coverImage = extractAttribute(itemXml, 'enclosure', 'url');

    const categoryPattern = /<category[^>]*>([\s\S]*?)<\/category>/gi;
    const categories: string[] = [];
    let catMatch: RegExpExecArray | null;
    while ((catMatch = categoryPattern.exec(itemXml)) !== null) {
      const cat = stripHtml(catMatch[1]).trim();
      if (cat) categories.push(cat);
    }

    if (!title || !link) continue;

    if (tag) {
      const normalizedTag = tag.toLowerCase();
      const hasTag = categories.some((c) => c.toLowerCase() === normalizedTag);
      if (!hasTag) continue;
    }

    items.push({ title, link, excerpt, pubDate, coverImage, categories });
  }

  return items;
}

export async function fetchSubstackFeed(tag?: string): Promise<SubstackPost[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(SUBSTACK_FEED_URL, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Substack RSS fetch failed: ${response.status} ${response.statusText}`);
      return [];
    }

    const xml = await response.text();
    return parseRssFeed(xml, tag);
  } catch (err) {
    console.error('Failed to fetch Substack feed:', err);
    return [];
  }
}
