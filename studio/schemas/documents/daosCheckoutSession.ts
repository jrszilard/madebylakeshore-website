import { defineType, defineField } from 'sanity';

// Token-only operational order. Dotted document IDs are excluded from Sanity's
// unauthenticated public reads. Customer PII remains in Stripe.
export default defineType({
  name: 'daosCheckoutSession',
  title: 'Order',
  type: 'document',
  groups: [
    { name: 'fulfillment', title: 'Fulfillment', default: true },
    { name: 'payment', title: 'Payment' },
    { name: 'system', title: 'System' },
  ],
  fields: [
    defineField({
      name: 'fulfillmentStatus',
      title: 'Fulfillment status',
      type: 'string',
      group: 'fulfillment',
      options: {
        list: [
          { title: 'New — needs attention', value: 'new' },
          { title: 'Packing', value: 'packing' },
          { title: 'Shipped', value: 'shipped' },
          { title: 'Cancelled', value: 'cancelled' },
        ],
        layout: 'radio',
      },
      initialValue: 'new',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'fulfillmentNote',
      title: 'Fulfillment note',
      type: 'text',
      rows: 3,
      group: 'fulfillment',
      description: 'Optional internal packing/tracking note. Do not copy customer PII here.',
    }),
    defineField({
      name: 'shippedAt',
      title: 'Shipped at',
      type: 'datetime',
      group: 'fulfillment',
      description: 'Set when the order is marked shipped.',
    }),
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      group: 'fulfillment',
      readOnly: true,
      of: [
        {
          type: 'object',
          fields: [
            { name: 'productId', title: 'Product ID', type: 'string' },
            { name: 'type', title: 'Product type', type: 'string' },
            { name: 'title', title: 'Title at purchase', type: 'string' },
            { name: 'styleLabel', title: 'Variant', type: 'string' },
            { name: 'unitAmountCents', title: 'Unit price (cents)', type: 'number' },
            { name: 'qty', title: 'Quantity', type: 'number' },
          ],
          preview: {
            select: { title: 'title', styleLabel: 'styleLabel', qty: 'qty', unitAmountCents: 'unitAmountCents' },
            prepare: ({ title, styleLabel, qty, unitAmountCents }) => ({
              title: `${qty ?? 0} × ${title ?? 'Unknown product'}${styleLabel ? ` — ${styleLabel}` : ''}`,
              subtitle: `$${(((unitAmountCents ?? 0) * (qty ?? 0)) / 100).toFixed(2)}`,
            }),
          },
        },
      ],
    }),
    defineField({ name: 'subtotalCents', title: 'Subtotal before shipping (cents)', type: 'number', group: 'payment', readOnly: true }),
    defineField({ name: 'amountTotalCents', title: 'Paid total (cents)', type: 'number', group: 'payment', readOnly: true }),
    defineField({ name: 'currency', title: 'Currency', type: 'string', group: 'payment', readOnly: true }),
    defineField({
      name: 'paymentStatus',
      title: 'Payment status',
      type: 'string',
      group: 'payment',
      readOnly: true,
      options: { list: ['pending', 'paid'] },
    }),
    defineField({ name: 'paidAt', title: 'Paid at', type: 'datetime', group: 'payment', readOnly: true }),
    defineField({
      name: 'notificationStatus',
      title: 'Merchant notification',
      type: 'string',
      group: 'system',
      readOnly: true,
      options: { list: ['pending', 'sending', 'sent', 'failed'] },
    }),
    defineField({ name: 'notificationAttemptedAt', title: 'Notification attempted at', type: 'datetime', group: 'system', readOnly: true }),
    defineField({ name: 'notificationSentAt', title: 'Notification sent at', type: 'datetime', group: 'system', readOnly: true }),
    defineField({ name: 'notificationMessageId', title: 'Notification message ID', type: 'string', group: 'system', readOnly: true }),
    defineField({ name: 'notificationError', title: 'Notification error', type: 'text', group: 'system', readOnly: true }),
    defineField({ name: 'status', title: 'Legacy processing status', type: 'string', group: 'system', readOnly: true, hidden: true }),
    defineField({ name: 'stripeEventId', title: 'Stripe event ID', type: 'string', group: 'system', readOnly: true }),
    defineField({ name: 'createdAt', title: 'Created at', type: 'datetime', group: 'system', readOnly: true }),
  ],
  orderings: [
    { title: 'Newest first', name: 'createdAtDesc', by: [{ field: 'createdAt', direction: 'desc' }] },
  ],
  preview: {
    select: {
      id: '_id',
      fulfillmentStatus: 'fulfillmentStatus',
      paymentStatus: 'paymentStatus',
      total: 'amountTotalCents',
      createdAt: 'createdAt',
    },
    prepare: ({ id, fulfillmentStatus, paymentStatus, total, createdAt }) => ({
      title: `${fulfillmentStatus ?? 'new'} · $${((total ?? 0) / 100).toFixed(2)}`,
      subtitle: `${paymentStatus ?? 'pending'} · ${createdAt ?? ''} · ${String(id).slice(-10)}`,
    }),
  },
});
