import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'daosShopSettings',
  title: 'Shop Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Label',
      type: 'string',
      initialValue: 'Shop Settings',
      readOnly: true,
    }),
    defineField({
      name: 'shippingZones',
      title: 'Shipping Zones',
      type: 'array',
      description:
        'Flat shipping rate per zone. Typically one domestic zone (e.g. US) and one international zone. Free shipping kicks in when the order subtotal reaches the threshold.',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'label', title: 'Label', type: 'string', validation: (Rule) => Rule.required() },
            {
              name: 'countryCodes',
              title: 'Country Codes (ISO-3166-1 alpha-2, e.g. US, CA)',
              type: 'array',
              of: [{ type: 'string' }],
              validation: (Rule) => Rule.required().min(1),
            },
            {
              name: 'rateCents',
              title: 'Flat Rate (cents)',
              type: 'number',
              validation: (Rule) => Rule.required().min(0).integer(),
            },
            {
              name: 'freeShippingThresholdCents',
              title: 'Free Shipping Threshold (cents, optional)',
              type: 'number',
              validation: (Rule) => Rule.min(0).integer(),
            },
          ],
          preview: {
            select: { title: 'label', rate: 'rateCents' },
            prepare({ title, rate }) {
              return { title: title || 'Zone', subtitle: rate != null ? `$${(rate / 100).toFixed(2)}` : '' };
            },
          },
        },
      ],
    }),
  ],
  preview: { prepare() { return { title: 'Shop Settings' }; } },
});
