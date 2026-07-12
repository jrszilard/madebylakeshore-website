import { useState } from 'react';

export interface GalleryItem {
  id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
  artworkType: string;
  artworkTypeLabel: string;
  forSale?: boolean;
  originalAvailable?: boolean;
  price?: number;
}

function GalleryCard({ item }: { item: GalleryItem }) {
  const isAvailable = item.forSale && (item.originalAvailable ?? true);

  return (
    <a
      href={`/gallery/${item.slug}`}
      className="group relative block overflow-hidden break-inside-avoid mb-1.5 bg-daos-warm"
    >
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.title}
          className="w-full block"
          loading="lazy"
        />
      ) : (
        <div className="aspect-[3/4] bg-gradient-to-br from-daos-warm to-daos-clay flex items-center justify-center">
          <span className="font-display text-daos-ink/30 text-lg text-center px-4">{item.title}</span>
        </div>
      )}

      <div className="absolute inset-0 bg-daos-ink/0 group-hover:bg-daos-ink/55 transition-colors duration-300" />

      <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <h3 className="font-display italic text-daos-cream text-lg leading-snug">{item.title}</h3>
        <p className="font-sans text-xs text-daos-cream/70 uppercase tracking-widest mt-1">{item.artworkTypeLabel}</p>
        {isAvailable && item.price != null && (
          <p className="font-sans text-sm text-daos-cream/90 mt-2">${item.price.toLocaleString()}</p>
        )}
        {item.forSale && !isAvailable && (
          <p className="font-sans text-xs text-daos-cream/50 uppercase tracking-widest mt-1">Sold</p>
        )}
      </div>
    </a>
  );
}

export default function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [activeFilter, setActiveFilter] = useState('all');

  const types = ['all', ...Array.from(new Set(items.map((i) => i.artworkType)))];

  const typeLabel = (type: string) => {
    if (type === 'all') return 'All';
    return items.find((i) => i.artworkType === type)?.artworkTypeLabel ?? type;
  };

  const visible = activeFilter === 'all' ? items : items.filter((i) => i.artworkType === activeFilter);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] lg:grid-cols-[1fr_3fr] gap-1.5 items-start">
      {/* Column 1: Work tile */}
      <div className="sticky top-20 bg-daos-ink flex flex-col justify-end p-6 aspect-[3/4]">
        <p className="font-sans text-xs uppercase tracking-widest text-daos-marigold mb-3">Gallery</p>
        <h1
          className="font-display italic text-daos-cream leading-none"
          style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontVariationSettings: '"opsz" 144, "SOFT" 100' }}
        >
          Work
        </h1>
      </div>

      {/* Column 2: Filters + image grid */}
      <div>
        {types.length > 2 && (
          <div className="flex flex-wrap gap-2 mb-1.5">
            {types.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setActiveFilter(type)}
                className={
                  activeFilter === type
                    ? 'px-4 py-2 bg-daos-marigold border border-daos-marigold font-sans text-sm text-daos-ink'
                    : 'px-4 py-2 border border-daos-cream/30 font-sans text-sm text-daos-cream/70 hover:border-daos-cream/60 hover:text-daos-cream transition-colors'
                }
              >
                {typeLabel(type)}
              </button>
            ))}
          </div>
        )}

        {visible.length === 0 ? (
          <p className="font-body text-daos-cream/70 text-lg py-20 text-center">Nothing here yet.</p>
        ) : (
          <div className="columns-2 lg:columns-3 gap-1.5">
            {visible.map((item) => (
              <GalleryCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
