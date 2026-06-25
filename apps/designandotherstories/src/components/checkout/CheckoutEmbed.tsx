import { loadStripe } from '@stripe/stripe-js';
import type {
  StripeEmbeddedCheckoutShippingDetailsChangeEvent,
  ResultAction,
} from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { useCallback } from 'react';
import { getSnapshot } from '../../lib/cart/cartStore';

interface Props {
  publishableKey: string;
}

const stripePromiseCache: { p?: ReturnType<typeof loadStripe> } = {};

export default function CheckoutEmbed({ publishableKey }: Props) {
  const stripePromise = (stripePromiseCache.p ??= loadStripe(publishableKey));

  const fetchClientSecret = useCallback(async () => {
    const items = getSnapshot().items.map((i) => ({ productId: i.productId, qty: i.qty }));
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items),
    });
    if (!res.ok) throw new Error('Could not start checkout');
    const { clientSecret } = await res.json();
    return clientSecret as string;
  }, []);

  // Stripe calls this when the customer enters/changes their shipping address.
  // The event carries the session id + the entered address; we forward both to
  // the server, which resolves the zone rate and updates the session. We accept
  // or reject based purely on the server's verdict (HTTP status). The body the
  // client returns to Stripe is { type: 'accept' | 'reject' } -- the rate itself
  // is applied server-side via /api/calculate-shipping-options.
  const onShippingDetailsChange = useCallback(
    async (
      event: StripeEmbeddedCheckoutShippingDetailsChangeEvent
    ): Promise<ResultAction> => {
      const res = await fetch('/api/calculate-shipping-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutSessionId: event.checkoutSessionId,
          shippingDetails: event.shippingDetails,
        }),
      });
      if (!res.ok) return { type: 'reject', errorMessage: "We can't ship there yet." };
      return { type: 'accept' };
    },
    []
  );

  return (
    <EmbeddedCheckoutProvider
      stripe={stripePromise}
      options={{ fetchClientSecret, onShippingDetailsChange }}
    >
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}
