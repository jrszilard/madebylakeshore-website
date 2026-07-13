import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'fattamanoAnalyticsDaily',
  title: 'fattamano Funnel Counter',
  type: 'document',
  readOnly: true,
  fields: [
    defineField({ name: 'day', title: 'Day', type: 'date' }),
    defineField({ name: 'event', title: 'Event', type: 'string' }),
    defineField({ name: 'productSlug', title: 'Product slug', type: 'string' }),
    defineField({ name: 'count', title: 'Count', type: 'number' }),
    defineField({ name: 'updatedAt', title: 'Updated at', type: 'datetime' }),
  ],
  preview: {
    select: { event: 'event', productSlug: 'productSlug', count: 'count', day: 'day' },
    prepare: ({ event, productSlug, count, day }) => ({
      title: `${event ?? 'event'} · ${count ?? 0}`,
      subtitle: `${day ?? ''}${productSlug ? ` · ${productSlug}` : ''}`,
    }),
  },
});
