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
      name: 'collection',
      title: 'Collection',
      type: 'reference',
      to: [{ type: 'artCollection' }],
    }),
    defineField({
      name: 'images',
      title: 'Images',
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
      name: 'story',
      title: 'Artist Story',
      type: 'text',
      rows: 4,
      description: 'The story behind this piece.',
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
      name: 'medium',
      title: 'Medium',
      type: 'string',
      description: 'e.g., "Oil on canvas", "Graphite on paper"',
    }),
    defineField({
      name: 'dimensions',
      title: 'Dimensions',
      type: 'object',
      fields: [
        { name: 'width', title: 'Width', type: 'number' },
        { name: 'height', title: 'Height', type: 'number' },
        { name: 'depth', title: 'Depth', type: 'number' },
        { 
          name: 'unit', 
          title: 'Unit', 
          type: 'string',
          options: {
            list: [
              { title: 'inches', value: 'in' },
              { title: 'centimeters', value: 'cm' },
            ],
          },
          initialValue: 'in',
        },
      ],
    }),
    defineField({
      name: 'year',
      title: 'Year Created',
      type: 'number',
    }),
    defineField({
      name: 'price',
      title: 'Price',
      type: 'number',
      description: 'Price in USD',
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
      name: 'forSale',
      title: 'Listed for Sale',
      type: 'boolean',
      description: 'When true, this piece appears in the Shop. Can be true even if original is sold (if prints are available).',
      initialValue: false,
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags',
      },
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
    }),
  ],
  orderings: [
    {
      title: 'Year, New',
      name: 'yearDesc',
      by: [{ field: 'year', direction: 'desc' }],
    },
    {
      title: 'Price, Low to High',
      name: 'priceAsc',
      by: [{ field: 'price', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'title',
      media: 'images.0',
      price: 'price',
      available: 'originalAvailable',
    },
    prepare({ title, media, price, available }) {
      const availability = available ? 'Available' : 'Sold';
      const priceDisplay = price ? `$${price}` : 'Price on request';
      return {
        title,
        subtitle: `${priceDisplay} • ${availability}`,
        media,
      };
    },
  },
});
