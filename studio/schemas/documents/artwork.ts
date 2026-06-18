import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'artwork',
  title: 'Artwork',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'artworkType',
      title: 'Type',
      type: 'string',
      options: {
        list: [
          { title: 'Original', value: 'original' },
          { title: 'Photography', value: 'photography' },
        ],
        layout: 'radio',
      },
      initialValue: 'original',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'images',
      title: 'Photos',
      type: 'array',
      of: [{ type: 'figure' }],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'blockContent',
    }),
    defineField({
      name: 'forSale',
      title: 'Listed for Sale',
      type: 'boolean',
      description: 'When true, this piece appears in the Shop. Can be true even if original is sold (if prints are available).',
      initialValue: false,
    }),
    defineField({
      name: 'price',
      title: 'Price',
      type: 'number',
      description: 'Price in USD',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'originalAvailable',
      title: 'Original Available',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'printsAvailable',
      title: 'Prints Available',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'printOptions',
      title: 'Print Options',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'size',
              title: 'Size',
              type: 'string',
              options: {
                list: [
                  { title: '4×6 in', value: '4×6 in' },
                  { title: '5×7 in', value: '5×7 in' },
                  { title: '8×10 in', value: '8×10 in' },
                  { title: '11×14 in', value: '11×14 in' },
                  { title: '12×16 in', value: '12×16 in' },
                  { title: '16×20 in', value: '16×20 in' },
                  { title: '18×24 in', value: '18×24 in' },
                  { title: '24×36 in', value: '24×36 in' },
                ],
              },
            },
            { name: 'price', title: 'Price', type: 'number' },
            { name: 'inStock', title: 'In Stock', type: 'boolean', initialValue: true },
          ],
        },
      ],
      hidden: ({ parent }) => !parent?.printsAvailable,
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'collection',
      title: 'Collection',
      type: 'reference',
      to: [{ type: 'artCollection' }],
    }),
    defineField({
      name: 'secretLinkRegion',
      title: 'Secret Link Region (easter egg)',
      type: 'object',
      description: 'Optional clickable overlay on the artwork detail page image. Useful for hiding a link to a sister site or a related piece.',
      fields: [
        defineField({
          name: 'enabled',
          title: 'Enabled',
          type: 'boolean',
          initialValue: false,
        }),
        defineField({
          name: 'url',
          title: 'URL',
          type: 'url',
          validation: (Rule) =>
            Rule.uri({ scheme: ['http', 'https'] }).custom((value, ctx) => {
              const enabled = (ctx.parent as any)?.enabled;
              if (enabled && !value) return 'URL required when enabled';
              return true;
            }),
        }),
        defineField({
          name: 'xPct',
          title: 'X position (% from left)',
          type: 'number',
          description: '0 = left edge, 100 = right edge',
          validation: (Rule) => Rule.min(0).max(100),
        }),
        defineField({
          name: 'yPct',
          title: 'Y position (% from top)',
          type: 'number',
          validation: (Rule) => Rule.min(0).max(100),
        }),
        defineField({
          name: 'widthPct',
          title: 'Width (% of image width)',
          type: 'number',
          initialValue: 15,
          validation: (Rule) => Rule.min(1).max(100),
        }),
        defineField({
          name: 'heightPct',
          title: 'Height (% of image height)',
          type: 'number',
          initialValue: 10,
          validation: (Rule) => Rule.min(1).max(100),
        }),
      ],
      options: { collapsible: true, collapsed: true },
    }),
  ],
  preview: {
    select: {
      title: 'title',
      media: 'images.0',
      artworkType: 'artworkType',
    },
    prepare({ title, media, artworkType }) {
      return {
        title,
        subtitle: artworkType === 'photography' ? 'Photography' : 'Original',
        media,
      };
    },
  },
});
