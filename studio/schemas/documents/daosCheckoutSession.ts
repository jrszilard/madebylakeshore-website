import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'daosCheckoutSession',
  title: 'Checkout Session (internal)',
  type: 'document',
  // Internal plumbing: idempotency + cart source for the Stripe webhook.
  fields: [
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'productId', title: 'Product ID', type: 'string' },
            { name: 'type', title: 'Type', type: 'string' },
            { name: 'qty', title: 'Qty', type: 'number' },
          ],
        },
      ],
    }),
    defineField({ name: 'subtotalCents', title: 'Subtotal (cents)', type: 'number' }),
    defineField({ name: 'status', title: 'Status', type: 'string' }),
    defineField({ name: 'createdAt', title: 'Created At', type: 'datetime' }),
  ],
  preview: {
    select: { id: '_id', status: 'status' },
    prepare({ id, status }) { return { title: id, subtitle: status }; },
  },
});
