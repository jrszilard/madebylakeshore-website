import { useState, useEffect } from 'react';

interface SubstackPost {
  title: string;
  link: string;
  excerpt: string;
  coverImage: string | null;
  categories: string[];
}

interface Props {
  substackTag: string;
  feedUrl: string;
  fallbackUrl: string;
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

function parseFeed(xml: string, tag: string): SubstackPost[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const items = Array.from(doc.querySelectorAll('item'));
  const normalizedTag = tag.toLowerCase();

  const posts: SubstackPost[] = [];

  for (const item of items) {
    const title = item.querySelector('title')?.textContent?.trim() ?? '';
    const link = item.querySelector('link')?.textContent?.trim() ?? '';
    const rawDescription = item.querySelector('description')?.textContent ?? '';
    const plainDescription = stripHtml(rawDescription);
    const excerpt =
      plainDescription.length > 200
        ? plainDescription.slice(0, 200).replace(/\s+\S*$/, '') + '\u2026'
        : plainDescription;

    const categoryEls = Array.from(item.querySelectorAll('category'));
    const categories = categoryEls
      .map((el) => el.textContent?.trim() ?? '')
      .filter(Boolean);

    const enclosure = item.querySelector('enclosure');
    const coverImage = enclosure?.getAttribute('url') ?? null;

    if (!title || !link) continue;

    const hasTag = categories.some((c) => c.toLowerCase() === normalizedTag);
    if (!hasTag) continue;

    posts.push({ title, link, excerpt, coverImage, categories });
  }

  return posts;
}

export default function RelatedSubstackPosts({ substackTag, feedUrl, fallbackUrl: _fallbackUrl }: Props) {
  const [posts, setPosts] = useState<SubstackPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(feedUrl);
        if (!res.ok) throw new Error('Feed fetch failed');
        const xml = await res.text();
        if (!cancelled) {
          const parsed = parseFeed(xml, substackTag);
          setPosts(parsed.slice(0, 3));
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [feedUrl, substackTag]);

  if (loading) {
    return (
      <p style={{ fontFamily: '"Work Sans", system-ui, sans-serif' }} className="text-sm text-daos-charcoal">
        Loading posts&hellip;
      </p>
    );
  }

  if (error || posts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <a
          key={post.link}
          href={post.link}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex gap-4 bg-daos-paper rounded-sm p-4 hover:shadow-md transition-shadow duration-300"
        >
          {/* Thumbnail */}
          <div className="flex-shrink-0 w-20 h-[60px] rounded-sm overflow-hidden bg-daos-warm">
            {post.coverImage ? (
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-daos-warm to-daos-clay" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            <h4
              style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
              className="text-sm font-medium text-daos-ink group-hover:text-daos-terracotta transition-colors leading-snug line-clamp-2"
            >
              {post.title}
            </h4>
            <p
              style={{ fontFamily: '"Libre Baskerville", Georgia, serif' }}
              className="text-xs text-daos-charcoal leading-relaxed line-clamp-2"
            >
              {post.excerpt}
            </p>
            <div className="flex items-center justify-between">
              {post.categories[0] && (
                <span
                  style={{ fontFamily: '"Work Sans", system-ui, sans-serif' }}
                  className="text-xs text-daos-sage uppercase tracking-wider"
                >
                  {post.categories[0]}
                </span>
              )}
              <span
                style={{ fontFamily: '"Work Sans", system-ui, sans-serif' }}
                className="text-xs text-daos-terracotta group-hover:underline"
              >
                Read &rarr;
              </span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
