import { useCart } from '../../lib/cart/useCart';

export default function CartButton() {
  const { count } = useCart();
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('ft-cart-open'))}
      className="border-2 border-ft-ink bg-ft-paper px-3 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-ft-ink shadow-[3px_3px_0_#1A1A1A] transition-all hover:-translate-y-0.5 hover:text-ft-shout hover:shadow-[4px_4px_0_#1A1A1A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ft-shout"
      aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
    >
      cart{count > 0 ? ` (${count})` : ''}
    </button>
  );
}
