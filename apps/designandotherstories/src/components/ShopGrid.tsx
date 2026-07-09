import { useState } from 'react';

export interface ShopItem {
  id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
  medium?: string;
  price?: number;
  category: string;
  categoryLabel: string;
  available: boolean;
  printsAvailable?: boolean;
}

function ShopCard({ item }: { item: ShopItem }) {
  const isSold = !item.available;
  const hasPrints = isSold && item.printsAvailable;
  const isDimmed = isSold && !item.printsAvailable;

  return (
    <article className={`group flex flex-col border border-[#3B45E0] bg-daos-thread overflow-hidden${isDimmed ? ' opacity-60' : ''}`}>
      <a href={`/shop/${item.slug}`} className="block">
        <div className="relative overflow-hidden bg-daos-warm aspect-[16/9]">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-daos-warm to-daos-clay flex items-center justify-center">
              <span className="font-display text-daos-ink/30 text-lg text-center px-4">{item.title}</span>
            </div>
          )}
          {isSold && (
            <div className="absolute top-3 left-3">
              <span className="px-3 py-1 bg-daos-ink text-daos-cream text-xs font-sans uppercase tracking-wider">Sold</span>
            </div>
          )}
        </div>
      </a>
      <div className="flex-1 p-4 space-y-3">
        <div className="space-y-1">
          <p className="font-sans text-xs uppercase tracking-widest text-daos-charcoal">{item.categoryLabel}</p>
          <h3 className="font-serif text-xl text-daos-ink leading-snug">
            <a href={`/shop/${item.slug}`} className="hover:text-daos-terracotta transition-colors">
              {item.title}
            </a>
          </h3>
        </div>
        {!isSold && item.price != null && (
          <p className="font-sans font-medium text-daos-ink">${item.price.toLocaleString()}</p>
        )}
        {hasPrints && (
          <a href={`/shop/${item.slug}#prints`} className="inline-block font-sans text-sm text-daos-terracotta hover:underline transition-colors">
            Prints available &rarr;
          </a>
        )}
        {isSold && !hasPrints && (
          <p className="font-sans text-sm text-daos-charcoal">Sold</p>
        )}
      </div>
    </article>
  );
}

export default function ShopGrid({ items }: { items: ShopItem[] }) {
  const [activeFilter, setActiveFilter] = useState('all');

  const categories = ['all', ...Array.from(new Set(items.map((i) => i.category)))];

  const categoryLabel = (cat: string) => {
    if (cat === 'all') return 'All';
    return items.find((i) => i.category === cat)?.categoryLabel ?? cat;
  };

  const visible = activeFilter === 'all' ? items : items.filter((i) => i.category === activeFilter);

  return (
    <div>
      {categories.length > 2 && (
        <div className="flex flex-wrap gap-2 px-4 py-4">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveFilter(cat)}
              className={
                activeFilter === cat
                  ? 'px-4 py-2 bg-daos-terracotta border border-daos-terracotta font-sans text-sm text-white'
                  : 'px-4 py-2 border border-daos-warm font-sans text-sm text-daos-charcoal hover:border-daos-ink hover:text-daos-ink transition-colors'
              }
            >
              {categoryLabel(cat)}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="font-body text-daos-charcoal text-lg py-20 text-center">Nothing here yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {activeFilter === 'all' && (
            <div className="bg-daos-terracotta flex flex-col justify-end p-6">
              <p className="font-sans text-xs uppercase tracking-widest text-white/60 mb-3">Shop</p>
              <h1 className="font-display italic text-white leading-tight" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', fontVariationSettings: '"opsz" 144, "SOFT" 100' }}>All Products</h1>
            </div>
          )}
          {visible.map((item) => (
            <ShopCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
