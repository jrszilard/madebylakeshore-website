import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'book',
  title: 'Book',
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
      name: 'coverImage',
      title: 'Cover Image',
      type: 'figure',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'blurb',
      title: 'Blurb',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'blockContent',
    }),
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      options: {
        list: [
          { title: 'Novel', value: 'novel' },
          { title: 'Novella', value: 'novella' },
          { title: 'Short Story Collection', value: 'short-story-collection' },
          { title: 'Poetry', value: 'poetry' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Published', value: 'published' },
          { title: 'Coming Soon', value: 'coming-soon' },
          { title: 'In Progress', value: 'in-progress' },
        ],
      },
      initialValue: 'in-progress',
    }),
    defineField({
      name: 'publishedDate',
      title: 'Published Date',
      type: 'date',
    }),
    defineField({
      name: 'fromThisWorld',
      title: 'From This World',
      description: 'Related books and writing pieces that share this world.',
      type: 'array',
      of: [
        { type: 'reference', to: [{ type: 'book' }, { type: 'writingPiece' }] },
      ],
    }),
    defineField({
      name: 'purchaseLinks',
      title: 'Purchase Links',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'platform',
              title: 'Platform',
              type: 'string',
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'url',
              title: 'URL',
              type: 'url',
              validation: (Rule) => Rule.required(),
            },
          ],
          preview: {
            select: { title: 'platform', subtitle: 'url' },
          },
        },
      ],
    }),
    defineField({
      name: 'substackTag',
      title: 'Substack Tag',
      type: 'string',
      description: 'Tag used on Substack to filter posts related to this book.',
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'featuredOnHome',
      title: 'Featured on Home',
      type: 'boolean',
      initialValue: false,
      description: 'Show this book in the Latest Writing swimlane on the home page.',
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Manual sort order (lower numbers appear first).',
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
    }),
  ],
  orderings: [
    {
      title: 'Order, Ascending',
      name: 'orderAsc',
      by: [{ field: 'order', direction: 'asc' }],
    },
    {
      title: 'Published Date, New',
      name: 'publishedDateDesc',
      by: [{ field: 'publishedDate', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      title: 'title',
      type: 'type',
      status: 'status',
      media: 'coverImage',
    },
    prepare({ title, type, status, media }) {
      const typeLabels: Record<string, string> = {
        novel: 'Novel',
        novella: 'Novella',
        'short-story-collection': 'Short Story Collection',
        poetry: 'Poetry',
      };
      const statusLabels: Record<string, string> = {
        published: 'Published',
        'coming-soon': 'Coming Soon',
        'in-progress': 'In Progress',
      };
      return {
        title,
        subtitle: `${typeLabels[type] ?? type} • ${statusLabels[status] ?? status}`,
        media,
      };
    },
  },
});
