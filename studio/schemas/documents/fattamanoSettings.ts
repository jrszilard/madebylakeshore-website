import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'fattamanoSettings',
  title: 'fattamano Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'heroHeadline',
      title: 'Hero Headline',
      type: 'string',
      description: 'Big text on home page.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'heroSubcopy',
      title: 'Hero Subcopy',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'aboutBody',
      title: 'About Body',
      type: 'blockContent',
      description: 'Copy for /about page.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'footerCopy',
      title: 'Footer Copy',
      type: 'string',
      description: 'Small footer phrase. Falls back to "fatto a mano — made by hand, sometimes well" if empty.',
    }),
    defineField({
      name: 'notFoundCopy',
      title: '404 Page Copy',
      type: 'blockContent',
      description: 'Body of the custom 404 page.',
    }),
    defineField({
      name: 'contactEmail',
      title: 'Contact Email',
      type: 'string',
      description: 'For "DM to buy" / inquiries.',
      validation: (Rule) => Rule.required().email(),
    }),
    defineField({
      name: 'shippingZones',
      title: 'Shipping Zones',
      type: 'array',
      description:
        'Destination zones and their flat rate. The first zone whose country list contains the customer's country wins. The union of all countries here is exactly where checkout will ship.',
      of: [
        {
          type: 'object',
          name: 'shippingZone',
          fields: [
            { name: 'label', title: 'Label', type: 'string', validation: (R) => R.required() },
            {
              name: 'countryCodes',
              title: 'Country codes (ISO-3166-1 alpha-2, e.g. US, CA, GB)',
              type: 'array',
              of: [{ type: 'string' }],
              options: { layout: 'tags' },
              validation: (R) => R.required().min(1),
            },
            {
              name: 'rateCents',
              title: 'Flat rate (cents)',
              type: 'number',
              description: 'e.g. 500 = $5.00',
              validation: (R) => R.required().integer().min(0),
            },
          ],
          preview: {
            select: { label: 'label', rate: 'rateCents', countries: 'countryCodes' },
            prepare: ({ label, rate, countries }) => ({
              title: `${label} — $${((rate ?? 0) / 100).toFixed(2)}`,
              subtitle: (countries || []).join(', '),
            }),
          },
        },
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'shippingFallbackBehavior',
      title: 'If a destination matches no zone',
      type: 'string',
      options: { list: [{ title: 'Reject (do not ship)', value: 'reject' }], layout: 'radio' },
      initialValue: 'reject',
    }),
  ],
  preview: {
    prepare: () => ({ title: 'fattamano Settings' }),
  },
});
