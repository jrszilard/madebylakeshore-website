import { useEffect, useRef, useState } from 'react';
import { useCart } from '../../lib/cart/useCart';
import { cartThumb } from '../../lib/cart/cartImage';

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CartDrawer({
  freeShippingThresholdCents,
}: {
  freeShippingThresholdCents?: number | null;
}) {
  const { items, subtotalCents, dispatch } = useCart();
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('ft-cart-open', onOpen);
    return () => window.removeEventListener('ft-cart-open', onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="ft-cart-title">
      <button type="button" className="absolute inset-0 cursor-default bg-ft-ink/40" onClick={() => setOpen(false)} aria-label="Dismiss cart" />
      <aside ref={panelRef} className="relative bg-ft-paper w-full max-w-md h-full p-6 overflow-y-auto border-l-2 border-ft-ink shadow-[-8px_0_0_#1A1A1A]">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ft-smudge">acquisition staging area</p>
            <h2 id="ft-cart-title" className="font-display text-2xl mt-1">your cart</h2>
          </div>
          <button ref={closeButtonRef} onClick={() => setOpen(false)} aria-label="Close cart" className="border-2 border-ft-ink px-3 py-1 text-ft-smudge hover:bg-ft-splash hover:text-ft-ink text-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ft-shout">×</button>
        </div>

        {items.length === 0 ? (
          <div className="border-2 border-dashed border-ft-smudge bg-white p-5">
            <p className="font-display text-xl text-ft-ink">nothing in here yet.</p>
            <p className="mt-2 font-body text-sm leading-relaxed text-ft-smudge">
              the objects are disappointed, but they are being professional about it.
            </p>
            <a
              href="/things"
              className="mt-4 inline-flex border-2 border-ft-ink bg-ft-splash px-4 py-2 font-display shadow-[4px_4px_0_#1A1A1A] hover:text-ft-shout focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ft-shout"
            >
              browse things →
            </a>
          </div>
        ) : (
          <>
            <ul className="space-y-4">
              {items.map((i) => {
                const thumb = cartThumb(i.image);
                return (
                  <li key={i.productId} className="flex items-center gap-3 border-2 border-ft-ink bg-white p-3 shadow-[3px_3px_0_#1A1A1A]">
                    {thumb ? (
                      <img src={thumb} alt="" width={56} height={56} className="h-14 w-14 shrink-0 border border-ft-ink object-cover" loading="lazy" />
                    ) : (
                      <div aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center border border-ft-ink bg-ft-paper font-mono text-lg text-ft-smudge">▧</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-ft-ink leading-snug">{i.title}</p>
                      <p className="font-body text-sm text-ft-smudge">{money(i.priceCents)} each</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={i.qty}
                        onChange={(e) => dispatch({ type: 'setQty', productId: i.productId, qty: parseInt(e.target.value || '0', 10) })}
                        className="w-14 border border-ft-ink px-2 py-1 font-body"
                        aria-label={`Quantity for ${i.title}`}
                      />
                      <button onClick={() => dispatch({ type: 'remove', productId: i.productId })} aria-label={`Remove ${i.title}`} className="text-ft-smudge underline underline-offset-2 hover:text-ft-shout">remove</button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-8 border-t-2 border-ft-ink pt-4">
              <p className="flex justify-between font-display text-lg">
                <span>subtotal</span><span>{money(subtotalCents)}</span>
              </p>
              {typeof freeShippingThresholdCents === 'number' && freeShippingThresholdCents > 0 ? (
                subtotalCents >= freeShippingThresholdCents ? (
                  <p className="font-body text-sm text-ft-ink mt-1">
                    you've got free u.s. shipping — international calculated at checkout
                  </p>
                ) : (
                  <p className="font-body text-sm text-ft-smudge mt-1">
                    add {money(freeShippingThresholdCents - subtotalCents)} more for free u.s. shipping
                  </p>
                )
              ) : (
                <p className="font-body text-sm text-ft-smudge mt-1">shipping calculated at checkout</p>
              )}
              <div className="mt-4 border border-dashed border-ft-smudge bg-white p-3 font-body text-xs leading-relaxed text-ft-smudge">
                Secure Stripe checkout. Card details never touch fattamano. Every order is packed by a real human.
              </div>
              <a href="/checkout" className="mt-4 block border-2 border-ft-ink bg-ft-shout text-center text-ft-paper font-display px-6 py-3 text-lg shadow-[4px_4px_0_#1A1A1A] hover:bg-ft-ink transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ft-shout">
                secure checkout →
              </a>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
