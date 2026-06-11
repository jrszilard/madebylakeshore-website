import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'fattamanoProduct',
  title: 'fattamano Product',
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
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
      description: 'Stable identifier — appears in URLs. Do not change after publishing.',
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      description: 'One-line punchline shown on cards.',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'blockContent',
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
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Sticker', value: 'sticker' },
          { title: 'Shirt', value: 'shirt' },
          { title: 'Print', value: 'print' },
          { title: 'Other', value: 'other' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'priceCents',
      title: 'Price (cents)',
      type: 'number',
      description: 'Integer cents (e.g., 500 = $5.00). Display-only at v1.',
      validation: (Rule) => Rule.min(0).integer(),
    }),
    defineField({
      name: 'priceDisplayOverride',
      title: 'Price Display Override',
      type: 'string',
      description: 'If set, displayed instead of computed price. E.g., "name your price", "free with order".',
    }),
    defineField({
      name: 'buyUrl',
      title: 'Buy URL',
      type: 'url',
      description: 'Where to actually buy this item. Leave empty to show "DM to buy".',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Available', value: 'available' },
          { title: 'Sold Out', value: 'sold_out' },
          { title: 'Coming Soon', value: 'coming_soon' },
          { title: 'Concept (might make this if there is interest)', value: 'concept' },
        ],
        layout: 'radio',
      },
      initialValue: 'available',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'dateAdded',
      title: 'Date Added',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'featured',
      title: 'Featured on Home',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
    }),
  ],
  orderings: [
    {
      title: 'Date Added, New',
      name: 'dateAddedDesc',
      by: [{ field: 'dateAdded', direction: 'desc' }],
    },
    {
      title: 'Title, A→Z',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'title',
      category: 'category',
      status: 'status',
      media: 'images.0',
    },
    prepare({ title, category, status, media }) {
      const statusLabel = status === 'available' ? '' : ` • ${status}`;
      return {
        title,
        subtitle: `${category || 'uncategorized'}${statusLabel}`,
        media,
      };
    },
  },
});
