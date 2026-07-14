#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createClient } from '@sanity/client';

const apply = process.argv.includes('--apply');
const deleteSource = process.argv.includes('--delete-source');
const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
const dataset = process.env.SANITY_STUDIO_DATASET || 'production';
const token = process.env.SANITY_EDITOR_API_TOKEN || process.env.SANITY_API_TOKEN;

if (!projectId || !token) {
  throw new Error('SANITY_STUDIO_PROJECT_ID and SANITY_EDITOR_API_TOKEN (or SANITY_API_TOKEN) are required');
}
if (deleteSource && !apply) throw new Error('--delete-source requires --apply');

const client = createClient({ projectId, dataset, token, apiVersion: '2024-01-01', useCdn: false });
const orderId = (sessionId) =>
  `fattamano.order.${createHash('sha256').update(sessionId).digest('hex')}`;

const allOrders = await client.fetch(`*[_type == "fattamanoCheckoutSession"]{
  _id, status, items, subtotalCents, createdAt
}`);
const orders = allOrders.filter((order) => !order._id.startsWith('fattamano.order.'));
const productIds = [...new Set(orders.flatMap((order) => (order.items || []).map((item) => item.productId)).filter(Boolean))];
const products = await client.fetch(
  `*[_type == "fattamanoProduct" && _id in $ids]{ _id, title, priceCents }`,
  { ids: productIds },
);
const productMap = new Map(products.map((product) => [product._id, product]));

const migrated = orders.map((order) => {
  const paid = order.status === 'fulfilled';
  return {
    _id: orderId(order._id),
    _type: 'fattamanoCheckoutSession',
    items: (order.items || []).map((item) => {
      const product = productMap.get(item.productId);
      return {
        _key: item._key || item.productId,
        productId: item.productId,
        title: product?.title || item.productId,
        unitAmountCents: product?.priceCents || 0,
        qty: item.qty,
      };
    }),
    subtotalCents: order.subtotalCents,
    status: order.status || 'pending',
    paymentStatus: paid ? 'paid' : 'pending',
    fulfillmentStatus: 'new',
    // Historical paid orders were handled before dedicated alerts existed. Mark
    // them sent so webhook retries cannot emit old alerts or inflate counters.
    notificationStatus: paid ? 'sent' : 'pending',
    analyticsRecorded: paid,
    createdAt: order.createdAt,
  };
});

console.log(`${apply ? 'Migrating' : 'Would migrate'} ${migrated.length} public order document(s) to token-only dotted IDs.`);
if (!apply) {
  console.log('Dry run only. Re-run with --apply, verify Studio, then --apply --delete-source.');
  process.exit(0);
}

for (const order of migrated) await client.createOrReplace(order);
const targetIds = migrated.map((order) => order._id);
const targetCount = targetIds.length
  ? await client.fetch('count(*[_type == "fattamanoCheckoutSession" && _id in $ids])', { ids: targetIds })
  : 0;
if (targetCount !== migrated.length) {
  throw new Error(`Verification failed: found ${targetCount}, expected ${migrated.length} migrated order(s)`);
}
console.log(`Verified ${targetCount} token-only dotted order document(s).`);

const publicClient = createClient({ projectId, dataset, apiVersion: '2024-01-01', useCdn: false });
const publiclyVisible = targetIds.length
  ? await publicClient.fetch('count(*[_id in $ids])', { ids: targetIds })
  : 0;
if (publiclyVisible !== 0) {
  throw new Error(`Privacy verification failed: ${publiclyVisible} dotted order document(s) are publicly readable`);
}
console.log('Verified migrated dotted order IDs are invisible to unauthenticated reads.');

if (deleteSource) {
  for (const order of orders) await client.delete(order._id);
  const remainingIds = await client.fetch('*[_type == "fattamanoCheckoutSession"]{ _id }');
  const remaining = remainingIds.filter((order) => !order._id.startsWith('fattamano.order.')).length;
  if (remaining !== 0) throw new Error(`Source cleanup incomplete: ${remaining} public order(s) remain`);
  console.log('Deleted legacy public order documents after dotted-ID verification.');
} else {
  console.log('Legacy source documents retained. Review /fattamano-orders, then re-run with --apply --delete-source.');
}
