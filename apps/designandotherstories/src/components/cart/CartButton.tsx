import { useCart } from '../../lib/cart/useCart';

export default function CartButton({ theme = 'dark' }: { theme?: 'dark' | 'light' }) {
  const { count } = useCart();
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('daos-cart-open'))}
      className={`relative transition-colors ${theme === 'light' ? 'text-daos-cream hover:text-daos-marigold' : 'text-daos-ink hover:text-daos-terracotta'}`}
      aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-daos-terracotta text-white text-[10px] font-sans flex items-center justify-center rounded-full">
          {count}
        </span>
      )}
    </button>
  );
}
