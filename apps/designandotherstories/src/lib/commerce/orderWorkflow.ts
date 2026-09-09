export interface NotificationState {
  notificationStatus?: 'pending' | 'sending' | 'sent' | 'failed';
  notificationAttemptedAt?: string;
}

// A 'sending' claim older than the stale window is treated as abandoned — the
// serverless invocation that claimed it died before recording an outcome — so a
// Stripe retry can pick the notification back up rather than wedging forever.
const STALE_CLAIM_MS = 5 * 60 * 1000;

export function notificationClaimable(order: NotificationState, now = Date.now()): boolean {
  if (order.notificationStatus === 'sent') return false;
  if (order.notificationStatus !== 'sending') return true;
  const attempted = Date.parse(order.notificationAttemptedAt || '');
  return !Number.isFinite(attempted) || now - attempted > STALE_CLAIM_MS;
}
