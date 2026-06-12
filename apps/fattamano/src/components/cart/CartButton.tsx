import { useCart } from '../../lib/cart/useCart';

export default function CartButton() {
  const { count } = useCart();
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('ft-cart-open'))}
      className="relative font-body text-sm text-ft-ink hover:text-ft-shout"
      aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
    >
      cart{count > 0 ? ` (${count})` : ''}
    </button>
  );
}
