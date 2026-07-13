import type { FunnelEvent } from './events';

export function trackFunnelEvent(event: FunnelEvent, productSlug?: string): void {
  if (typeof window === 'undefined') return;
  const body = JSON.stringify({ event, productSlug });
  void fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
    credentials: 'same-origin',
  }).catch(() => {});
}
