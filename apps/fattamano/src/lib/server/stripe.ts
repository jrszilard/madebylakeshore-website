import Stripe from 'stripe';
import { requireServerEnv } from './env';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(requireServerEnv('STRIPE_SECRET_KEY'));
  }
  return _stripe;
}
