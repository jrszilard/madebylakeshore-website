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
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Painting', value: 'painting' },
          { title: 'Drawing', value: 'drawing' },
          { title: 'Writing', value: 'writing' },
          { title: 'Mixed Media', value: 'mixed-media' },
          { title: 'Print', value: 'print' },
          { title: 'Other', value: 'other' },
        ],
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
            { name: 'size', title: 'Size', type: 'string' },
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
      category: 'category',
      media: 'images.0',
      price: 'price',
      available: 'originalAvailable',
    },
    prepare({ title, category, media, price, available }) {
      const availability = available ? 'Available' : 'Sold';
      const priceDisplay = price ? `$${price}` : 'Price on request';
      return {
        title,
        subtitle: `${category} • ${priceDisplay} • ${availability}`,
        media,
      };
    },
  },
});
