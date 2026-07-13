export interface NotificationState {
  notificationStatus?: 'pending' | 'sending' | 'sent' | 'failed';
  notificationAttemptedAt?: string;
}

export function notificationClaimable(order: NotificationState, now = Date.now()): boolean {
  if (order.notificationStatus === 'sent') return false;
  if (order.notificationStatus !== 'sending') return true;
  const attempted = Date.parse(order.notificationAttemptedAt || '');
  return !Number.isFinite(attempted) || now - attempted > 5 * 60 * 1000;
}
