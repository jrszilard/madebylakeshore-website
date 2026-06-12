import { useEffect, useState } from 'react';
import type { CartItem } from '../../lib/types';
import { dispatch } from '../../lib/cart/cartStore';

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
      <span className="inline-block bg-ft-smudge text-ft-paper font-display px-6 py-3 text-lg">
        sold out
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        dispatch({ type: 'add', item: { ...item, qty: 1 } });
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
      className="inline-block bg-ft-shout text-ft-paper font-display px-6 py-3 text-lg hover:bg-ft-ink transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ft-ink focus-visible:outline-offset-2"
    >
      {added ? 'added ✓' : 'add to cart'}
    </button>
  );
}
