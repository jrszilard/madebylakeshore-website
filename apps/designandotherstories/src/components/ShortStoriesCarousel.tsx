import { useRef, useState, useEffect } from 'react';
import type { SubstackPost } from '../lib/substack';

interface Props {
  posts: SubstackPost[];
}

export default function ShortStoriesCarousel({ posts }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  function updateArrows() {
    const el = scrollRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }

  useEffect(() => {
    updateArrows();
  }, [posts]);

  function scrollPrev() {
    scrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' });
  }

  function scrollNext() {
    scrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' });
  }

  if (posts.length === 0) {
    return (
      <p className="font-body text-sm text-daos-charcoal">
        No short stories yet — check back soon.
      </p>
    );
  }

  return (
    <div className="relative">
      {/* Prev button */}
      {!atStart && (
        <button
          onClick={scrollPrev}
          aria-label="Scroll left"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-daos-paper shadow-sm border border-daos-warm hover:bg-daos-warm transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {/* Scroll container */}
      <div
        ref={scrollRef}
        onScroll={updateArrows}
        className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {posts.map((post) => (
          <a
            key={post.link}
            href={post.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group block snap-start flex-shrink-0 w-[85vw] sm:w-[45%] md:w-[32%] lg:w-[24%]"
          >
            <div className="aspect-[3/2] overflow-hidden rounded-sm bg-daos-warm mb-3">
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
            <div className="space-y-1">
              <p className="font-sans text-xs text-daos-clay uppercase tracking-wider">Short Story</p>
              <h3 className="font-display text-lg font-bold text-daos-ink group-hover:text-daos-terracotta transition-colors leading-snug">
                {post.title}
              </h3>
              {post.excerpt && (
                <p className="font-body text-sm text-daos-charcoal line-clamp-2">{post.excerpt}</p>
              )}
            </div>
          </a>
        ))}
      </div>

      {/* Next button */}
      {!atEnd && (
        <button
          onClick={scrollNext}
          aria-label="Scroll right"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-daos-paper shadow-sm border border-daos-warm hover:bg-daos-warm transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
