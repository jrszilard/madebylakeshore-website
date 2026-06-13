import { useEffect, useState } from 'react';
import { useCart } from '../../lib/cart/useCart';

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CartDrawer() {
  const { items, subtotalCents, dispatch } = useCart();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('ft-cart-open', onOpen);
    return () => window.removeEventListener('ft-cart-open', onOpen);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-label="Cart">
      <div className="absolute inset-0 bg-ft-ink/40" onClick={() => setOpen(false)} />
      <aside className="relative bg-ft-paper w-full max-w-md h-full p-6 overflow-y-auto border-l-2 border-ft-ink">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display text-2xl">your cart</h2>
          <button onClick={() => setOpen(false)} aria-label="Close cart" className="text-ft-smudge hover:text-ft-shout text-xl">×</button>
        </div>

        {items.length === 0 ? (
          <p className="font-body text-ft-smudge">nothing in here yet.</p>
        ) : (
          <>
            <ul className="space-y-4">
              {items.map((i) => (
                <li key={i.productId} className="flex justify-between items-center gap-3">
                  <div>
                    <p className="font-body text-ft-ink">{i.title}</p>
                    <p className="font-body text-sm text-ft-smudge">{money(i.priceCents)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={i.qty}
                      onChange={(e) => dispatch({ type: 'setQty', productId: i.productId, qty: parseInt(e.target.value || '0', 10) })}
                      className="w-14 border border-ft-ink px-2 py-1 font-body"
                      aria-label={`Quantity for ${i.title}`}
                    />
                    <button onClick={() => dispatch({ type: 'remove', productId: i.productId })} aria-label={`Remove ${i.title}`} className="text-ft-smudge hover:text-ft-shout">remove</button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-8 border-t-2 border-ft-ink pt-4">
              <p className="flex justify-between font-display text-lg">
                <span>subtotal</span><span>{money(subtotalCents)}</span>
              </p>
              <p className="font-body text-sm text-ft-smudge mt-1">shipping calculated at checkout</p>
              <a href="/checkout" className="mt-4 block text-center bg-ft-shout text-ft-paper font-display px-6 py-3 text-lg hover:bg-ft-ink transition-colors">
                checkout
              </a>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
