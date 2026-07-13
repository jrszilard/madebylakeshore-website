import { analyticsDocument, type FunnelEventInput } from '../analytics/events';
import { orderClient } from './orderStore';

export async function incrementFunnelEvent(input: FunnelEventInput, date = new Date()): Promise<void> {
  const document = analyticsDocument(input, date);
  await orderClient()
    .transaction()
    .createIfNotExists(document)
    .patch(document._id, (patch) => patch.inc({ count: 1 }).set({ updatedAt: date.toISOString() }))
    .commit();
}
