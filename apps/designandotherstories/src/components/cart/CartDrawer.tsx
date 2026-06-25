import { useEffect, useState } from 'react';
import { useCart } from '../../lib/cart/useCart';
import { formatMoneyCents } from '../../lib/format';

export default function CartDrawer({
  freeShippingThresholdCents,
}: {
  freeShippingThresholdCents?: number | null;
}) {
  const { items, subtotalCents, dispatch } = useCart();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('daos-cart-open', onOpen);
    return () => window.removeEventListener('daos-cart-open', onOpen);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-label="Cart">
      <div className="absolute inset-0 bg-daos-ink/40" onClick={() => setOpen(false)} />
      <aside className="relative bg-daos-paper w-full max-w-md h-full p-6 overflow-y-auto border-l-2 border-daos-ink">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display text-2xl text-daos-ink">Your cart</h2>
          <button onClick={() => setOpen(false)} aria-label="Close cart" className="text-daos-charcoal hover:text-daos-terracotta text-xl">×</button>
        </div>

        {items.length === 0 ? (
          <p className="font-body text-daos-charcoal">Nothing in here yet.</p>
        ) : (
          <>
            <ul className="space-y-4">
              {items.map((i) => (
                <li key={i.productId} className="flex justify-between items-center gap-3">
                  <div>
                    <p className="font-body text-daos-ink">{i.title}</p>
                    <p className="font-body text-sm text-daos-charcoal">{formatMoneyCents(i.priceCents)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {i.type === 'artwork' ? (
                      <span className="w-14 border border-daos-ink px-2 py-1 font-body text-center text-daos-ink" aria-label={`Quantity for ${i.title}`}>
                        1
                      </span>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        value={i.qty}
                        onChange={(e) => dispatch({ type: 'setQty', productId: i.productId, qty: parseInt(e.target.value || '0', 10) })}
                        className="w-14 border border-daos-ink px-2 py-1 font-body text-daos-ink"
                        aria-label={`Quantity for ${i.title}`}
                      />
                    )}
                    <button onClick={() => dispatch({ type: 'remove', productId: i.productId })} aria-label={`Remove ${i.title}`} className="text-daos-charcoal hover:text-daos-terracotta font-sans text-xs uppercase tracking-widest">remove</button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-8 border-t-2 border-daos-ink pt-4">
              <p className="flex justify-between font-display text-lg text-daos-ink">
                <span>Subtotal</span><span>{formatMoneyCents(subtotalCents)}</span>
              </p>
              {typeof freeShippingThresholdCents === 'number' && freeShippingThresholdCents > 0 ? (
                subtotalCents >= freeShippingThresholdCents ? (
                  <p className="font-body text-sm text-daos-ink mt-1">
                    Free U.S. shipping — international calculated at checkout.
                  </p>
                ) : (
                  <p className="font-body text-sm text-daos-charcoal mt-1">
                    Add {formatMoneyCents(freeShippingThresholdCents - subtotalCents)} more for free U.S. shipping.
                  </p>
                )
              ) : (
                <p className="font-body text-sm text-daos-charcoal mt-1">Shipping calculated at checkout.</p>
              )}
              <a href="/checkout" className="btn-warm mt-4 w-full justify-center">
                Checkout
              </a>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
