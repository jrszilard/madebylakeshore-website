import { useCart } from '../../lib/cart/useCart';

export default function CartButton() {
  const { count } = useCart();
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('daos-cart-open'))}
      className="relative font-body text-sm text-daos-ink hover:text-daos-terracotta"
      aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
    >
      cart{count > 0 ? ` (${count})` : ''}
    </button>
  );
}
