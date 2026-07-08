import { defineType, defineField, defineArrayMember } from 'sanity';

export default defineType({
  name: 'shopProduct',
  title: 'Shop Product',
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
          { title: 'Postcard', value: 'postcard' },
          { title: 'Greeting Card', value: 'greeting-card' },
          { title: 'Print', value: 'print' },
          { title: 'Sticker', value: 'sticker' },
          { title: 'Other', value: 'other' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [{ type: 'figure' }],
      validation: (Rule) => Rule.required().min(1),
      description: 'First image is used as the card thumbnail.',
    }),
    defineField({
      name: 'blurb',
      title: 'Blurb',
      type: 'string',
      description: 'Short tagline shown on shop cards.',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'blockContent',
    }),
    defineField({
      name: 'price',
      title: 'Price',
      type: 'number',
      description: 'Price in USD',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'available',
      title: 'Available',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'stock',
      title: 'Stock (optional)',
      type: 'number',
      description:
        'Leave blank for unlimited / print-on-demand. Set a number for limited stock; it decrements on each sale and flips Available off at 0.',
      validation: (Rule) => Rule.min(0).integer(),
    }),
    defineField({
      name: 'styles',
      title: 'Style Options',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'e.g. "Red", "Forest Green", "8×10"',
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: { select: { title: 'label' } },
        }),
      ],
      description: 'Optional variants (colors, sizes, etc.). Leave empty for single-style products.',
    }),
    defineField({
      name: 'relatedArtwork',
      title: 'Related Artwork',
      type: 'reference',
      to: [{ type: 'artwork' }],
      description: 'Optional — link this product back to the original artwork it\'s based on.',
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      media: 'images.0',
      category: 'category',
      available: 'available',
    },
    prepare({ title, media, category, available }) {
      return {
        title,
        subtitle: `${category || 'uncategorized'}${available ? '' : ' • sold out'}`,
        media,
      };
    },
  },
});
