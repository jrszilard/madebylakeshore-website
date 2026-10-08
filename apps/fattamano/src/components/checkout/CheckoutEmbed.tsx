import { loadStripe } from '@stripe/stripe-js';
import type { StripeCheckoutFormChangeEvent, StripeCheckoutFormConfirmEvent } from '@stripe/stripe-js';
import { CheckoutFormProvider, CheckoutForm, useCheckoutForm } from '@stripe/react-stripe-js/checkout';
import { useCallback, useMemo, useRef } from 'react';
import { getSnapshot } from '../../lib/cart/cartStore';
import { trackFunnelEvent } from '../../lib/analytics/client';

interface Props {
  publishableKey: string;
}

const stripePromiseCache: { p?: ReturnType<typeof loadStripe> } = {};

// Express wallets collect the shipping address inside their own sheet, which
// bypasses the runServerUpdate flow that applies our zone rate — a wallet order
// would ship at the $0 placeholder. `permissions: update_shipping_details` used
// to disable these automatically; Stripe has retired that parameter, so we turn
// them off explicitly to keep the same behaviour.
const CHECKOUT_FORM_OPTIONS = {
  expressCheckout: {
    paymentMethods: {
      applePay: 'never',
      googlePay: 'never',
      amazonPay: 'never',
      paypal: 'never',
      klarna: 'never',
      link: 'never',
    },
  },
} as const;

async function createSession(): Promise<string> {
  const items = getSnapshot().items.map((i) => ({ productId: i.productId, qty: i.qty }));
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  });
  if (!res.ok) throw new Error('Could not start checkout');
  const { clientSecret } = await res.json();
  trackFunnelEvent('checkout_started');
  return clientSecret as string;
}

// Resolves the zone rate for the entered address. The server is authoritative:
// it re-reads the zone table and writes shipping_options onto the session with
// our secret key. The customer never picks their own price.
async function applyShippingRate(sessionId: string, shippingAddress: unknown) {
  const res = await fetch('/api/calculate-shipping-options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ checkoutSessionId: sessionId, shippingDetails: shippingAddress }),
  });
  const result = await res.json().catch(() => null);
  if (!res.ok || result?.type === 'error') {
    throw new Error(result?.message || "We can't ship there yet.");
  }
  return result;
}

function CheckoutPage() {
  const checkoutState = useCheckoutForm();
  // The change event fires on every keystroke; this latch keeps us to one
  // server round-trip per completed address, and re-arms if the customer edits it.
  const rateRequested = useRef(false);

  const handleChange = useCallback(
    async (event: StripeCheckoutFormChangeEvent) => {
      const { value, status } = event;
      if (checkoutState.type !== 'success') return;

      // The provider has already resolved the SDK actions, so runServerUpdate and
      // the session id sit directly on `checkout`.
      const { checkout } = checkoutState;

      if (status.shippingAddress?.complete && !rateRequested.current) {
        rateRequested.current = true;
        try {
          // runServerUpdate refreshes the session state afterwards so the
          // displayed total matches what our server just set. It times out at 20s.
          await checkout.runServerUpdate(() =>
            applyShippingRate(checkout.id, value.shippingAddress)
          );
        } catch {
          rateRequested.current = false;
        }
      } else if (!status.shippingAddress?.complete && rateRequested.current) {
        rateRequested.current = false;
      }
    },
    [checkoutState]
  );

  const handleConfirm = useCallback(
    async (event: StripeCheckoutFormConfirmEvent) => {
      if (checkoutState.type !== 'success') return;
      try {
        await checkoutState.checkout.confirm({ formConfirmEvent: event });
      } catch (err) {
        console.error('[checkout] confirm failed', err);
      }
    },
    [checkoutState]
  );

  if (checkoutState.type === 'error') {
    return <p>Checkout is temporarily unavailable. Please try again shortly.</p>;
  }

  return (
    <CheckoutForm
      options={CHECKOUT_FORM_OPTIONS}
      onChange={handleChange}
      onConfirm={handleConfirm}
    />
  );
}

export default function CheckoutEmbed({ publishableKey }: Props) {
  const stripePromise = (stripePromiseCache.p ??= loadStripe(publishableKey));
  const clientSecret = useMemo(() => createSession(), []);

  return (
    <CheckoutFormProvider stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutPage />
    </CheckoutFormProvider>
  );
}
