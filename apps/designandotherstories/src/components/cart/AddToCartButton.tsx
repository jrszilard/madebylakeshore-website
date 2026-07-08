import { useEffect, useState } from 'react';
import type { CartItem, StyleOption } from '../../lib/types';
import { dispatch } from '../../lib/cart/cartStore';

interface Props {
  item: CartItem;
  initialAvailable: boolean;
  styles?: StyleOption[];
}

export default function AddToCartButton({ item, initialAvailable, styles = [] }: Props) {
  const [available, setAvailable] = useState(initialAvailable);
  const [added, setAdded] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(
    styles.length === 1 ? styles[0].label : null
  );

  useEffect(() => {
    let active = true;
    fetch(`/api/availability?ids=${encodeURIComponent(item.productId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((rows: { _id: string; inStock: boolean }[] | null) => {
        if (!active || !rows) return;
        const row = rows.find((x) => x._id === item.productId);
        if (row) setAvailable(Boolean(row.inStock));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [item.productId]);

  if (!available) {
    return (
      <span className="btn-outline inline-block cursor-default opacity-60">
        Sold out
      </span>
    );
  }

  const needsStyle = styles.length > 1;
  const canAdd = !needsStyle || selectedStyle !== null;

  return (
    <div className="space-y-4">
      {styles.length > 1 && (
        <div>
          <p className="font-sans text-xs uppercase tracking-widest text-daos-charcoal mb-2">Style</p>
          <div className="flex flex-wrap gap-2">
            {styles.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setSelectedStyle(s.label)}
                className={
                  selectedStyle === s.label
                    ? 'px-3 py-1.5 border-2 border-daos-ink font-sans text-sm text-daos-ink'
                    : 'px-3 py-1.5 border border-daos-warm font-sans text-sm text-daos-charcoal hover:border-daos-ink hover:text-daos-ink transition-colors'
                }
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        disabled={!canAdd}
        onClick={() => {
          if (!canAdd) return;
          const finalItem: CartItem = {
            ...item,
            ...(selectedStyle ? { styleLabel: selectedStyle } : {}),
            qty: 1,
          };
          dispatch({ type: 'add', item: finalItem });
          setAdded(true);
          setTimeout(() => setAdded(false), 1500);
        }}
        className={canAdd ? 'btn-warm' : 'btn-warm opacity-40 cursor-not-allowed'}
      >
        {added ? 'Added' : needsStyle && !selectedStyle ? 'Select a style' : 'Add to cart'}
      </button>
    </div>
  );
}
