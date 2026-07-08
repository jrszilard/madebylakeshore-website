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
    <article className={`group bg-daos-paper rounded-sm overflow-hidden hover:shadow-lg transition-shadow duration-300${isDimmed ? ' opacity-60' : ''}`}>
      <a href={`/shop/${item.slug}`} className="block">
        <div className="relative overflow-hidden bg-daos-warm aspect-[3/4]">
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
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <p className="font-sans text-xs uppercase tracking-widest text-daos-charcoal">{item.categoryLabel}</p>
          <h3 className="font-display text-lg text-daos-ink leading-snug">
            <a href={`/shop/${item.slug}`} className="hover:text-daos-terracotta transition-colors">
              {item.title}
            </a>
          </h3>
          {item.medium && <p className="font-sans text-sm text-daos-charcoal">{item.medium}</p>}
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
        <div className="flex flex-wrap gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveFilter(cat)}
              className={
                activeFilter === cat
                  ? 'px-4 py-2 border-2 border-daos-ink font-sans text-sm text-daos-ink'
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((item) => (
            <ShopCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
