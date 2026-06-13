import { defineType, defineField } from 'sanity';

// Internal plumbing doc. _id is set to the Stripe Checkout Session id, which
// gives free idempotency. Stores no customer PII (address/email live in Stripe).
export default defineType({
  name: 'fattamanoCheckoutSession',
  title: 'fattamano Order (internal)',
  type: 'document',
  readOnly: true,
  fields: [
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'productId', type: 'string' },
            { name: 'qty', type: 'number' },
          ],
        },
      ],
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: { list: ['pending', 'fulfilled'] },
      initialValue: 'pending',
    }),
    defineField({ name: 'createdAt', title: 'Created At', type: 'datetime' }),
  ],
  preview: {
    select: { status: 'status', createdAt: 'createdAt' },
    prepare: ({ status, createdAt }) => ({
      title: `${status ?? 'pending'}`,
      subtitle: createdAt ?? '',
    }),
  },
});
