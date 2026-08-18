import { useEffect, useState } from 'react';
import type { CartItem } from '../../lib/types';
import { dispatch } from '../../lib/cart/cartStore';
import { trackFunnelEvent } from '../../lib/analytics/client';

interface Props {
  item: CartItem; // qty defaults to 1 when added
  initialAvailable: boolean;
}

export default function AddToCartButton({ item, initialAvailable }: Props) {
  const [available, setAvailable] = useState(initialAvailable);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/availability?ids=${encodeURIComponent(item.productId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((rows: { _id: string; status: string; stock: number }[] | null) => {
        if (!active || !rows) return;
        const row = rows.find((x) => x._id === item.productId);
        if (row) setAvailable(row.status === 'available' && row.stock > 0);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [item.productId]);

  if (!available) {
    return (
      <span className="inline-block cursor-not-allowed border-2 border-ft-ink bg-ft-smudge px-6 py-3 font-display text-lg text-ft-paper">
        sold out
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        dispatch({ type: 'add', item: { ...item, qty: 1 } });
        trackFunnelEvent('add_to_cart', item.slug);
        window.dispatchEvent(new CustomEvent('ft-cart-open'));
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
      className="inline-block border-2 border-ft-ink bg-ft-shout text-ft-paper font-display px-6 py-3 text-lg shadow-[5px_5px_0_#1A1A1A] hover:bg-ft-ink hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0_#1A1A1A] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ft-ink focus-visible:outline-offset-2"
    >
      {added ? 'added ✓' : 'add to cart'}
    </button>
  );
}
