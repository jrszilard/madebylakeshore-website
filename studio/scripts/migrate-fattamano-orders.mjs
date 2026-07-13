#!/usr/bin/env node
import { createClient } from '@sanity/client';

const apply = process.argv.includes('--apply');
const deleteSource = process.argv.includes('--delete-source');
const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
const sourceDataset = process.env.SANITY_STUDIO_DATASET || 'production';
const targetDataset = process.env.SANITY_STUDIO_ORDER_DATASET || 'fattamano-orders';
const token = process.env.SANITY_EDITOR_API_TOKEN || process.env.SANITY_API_TOKEN;

if (!projectId || !token) {
  throw new Error('SANITY_STUDIO_PROJECT_ID and SANITY_EDITOR_API_TOKEN (or SANITY_API_TOKEN) are required');
}
if (deleteSource && !apply) throw new Error('--delete-source requires --apply');

const client = (dataset) => createClient({ projectId, dataset, token, apiVersion: '2024-01-01', useCdn: false });
const source = client(sourceDataset);
const target = client(targetDataset);
const datasets = await source.datasets.list();
const targetInfo = datasets.find((dataset) => dataset.name === targetDataset);
if (!targetInfo) throw new Error(`Target dataset ${targetDataset} does not exist`);
if (targetInfo.aclMode !== 'private') throw new Error(`Target dataset ${targetDataset} must be private`);

const orders = await source.fetch(`*[_type == "fattamanoCheckoutSession"]{
  _id, status, items, subtotalCents, createdAt
}`);
const productIds = [...new Set(orders.flatMap((order) => (order.items || []).map((item) => item.productId)).filter(Boolean))];
const products = await source.fetch(
  `*[_type == "fattamanoProduct" && _id in $ids]{ _id, title, priceCents }`,
  { ids: productIds },
);
const productMap = new Map(products.map((product) => [product._id, product]));

const { createHash } = await import('node:crypto');
const receiptId = (sessionId) =>
  `fattamano-stock-receipt-${createHash('sha256').update(sessionId).digest('hex')}`;

const migrated = orders.map((order) => {
  const paid = order.status === 'fulfilled';
  return {
    _id: order._id,
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
    // them sent so a future webhook retry does not send a surprise old-order email.
    notificationStatus: paid ? 'sent' : 'pending',
    analyticsRecorded: paid,
    createdAt: order.createdAt,
  };
});

console.log(`${apply ? 'Migrating' : 'Would migrate'} ${migrated.length} order(s) from ${sourceDataset} to private ${targetDataset}.`);
if (!apply) {
  console.log('Dry run only. Re-run with --apply, then verify, then --apply --delete-source.');
  process.exit(0);
}

for (const order of migrated) {
  await target.createOrReplace(order);
  await source.createIfNotExists({
    _id: receiptId(order._id),
    _type: 'fattamanoStockReceipt',
    applied: order.paymentStatus === 'paid',
  });
}

const targetCount = await target.fetch('count(*[_type == "fattamanoCheckoutSession"])');
if (targetCount < migrated.length) throw new Error(`Verification failed: target has ${targetCount}, expected at least ${migrated.length}`);
console.log(`Verified ${targetCount} private order document(s).`);

if (deleteSource) {
  for (const order of orders) await source.delete(order._id);
  const remaining = await source.fetch('count(*[_type == "fattamanoCheckoutSession"])');
  if (remaining !== 0) throw new Error(`Source cleanup incomplete: ${remaining} order(s) remain`);
  console.log('Deleted public fattamanoCheckoutSession documents after private verification.');
} else {
  console.log('Source documents retained. Review private Studio, then re-run with --apply --delete-source.');
}
