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
      name: 'sku',
      title: 'SKU',
      type: 'string',
      description:
        'Stock-keeping unit, e.g. "ST-013". Prefix by category: PC postcard, PR print, PP photo print, ST sticker, BM bookmark, NP notepad, MG magnet.',
      validation: (Rule) =>
        Rule.regex(/^[A-Z]{2}-\d{3}$/, { name: 'SKU format' }).error(
          'Use two uppercase letters, a hyphen, then three digits — e.g. ST-013.'
        ),
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
          { title: 'Photo Print', value: 'photo-print' },
          { title: 'Sticker', value: 'sticker' },
          { title: 'Bookmark', value: 'bookmark' },
          { title: 'Notepad', value: 'notepad' },
          { title: 'Magnet', value: 'magnet' },
          { title: 'Bundle', value: 'bundle' },
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
            defineField({
              name: 'sku',
              title: 'Variant SKU',
              type: 'string',
              description: 'Product SKU plus a variant suffix, e.g. "ST-013-BLU".',
            }),
          ],
          preview: { select: { title: 'label', subtitle: 'sku' } },
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
      sku: 'sku',
    },
    prepare({ title, media, category, available, sku }) {
      return {
        title,
        subtitle: `${sku ? `${sku} • ` : ''}${category || 'uncategorized'}${available ? '' : ' • sold out'}`,
        media,
      };
    },
  },
});
