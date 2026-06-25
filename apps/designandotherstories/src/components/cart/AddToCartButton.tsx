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

  return (
    <button
      type="button"
      onClick={() => {
        dispatch({ type: 'add', item: { ...item, qty: 1 } });
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
      className="btn-warm"
    >
      {added ? 'Added' : 'Add to cart'}
    </button>
  );
}
