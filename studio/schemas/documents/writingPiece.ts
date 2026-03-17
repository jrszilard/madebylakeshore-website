import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'writingPiece',
  title: 'Writing Piece',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'figure',
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      options: {
        list: [
          { title: 'Short Story', value: 'short-story' },
          { title: 'Essay', value: 'essay' },
          { title: 'Poem', value: 'poem' },
          { title: 'Serial Chapter', value: 'serial-chapter' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'book',
      title: 'Parent Book',
      type: 'reference',
      to: [{ type: 'book' }],
      description: 'The book or series this piece belongs to, if any.',
    }),
    defineField({
      name: 'substackUrl',
      title: 'Substack URL',
      type: 'url',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publishedDate',
      title: 'Published Date',
      type: 'date',
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
      description: 'Show this writing piece in the Latest Writing swimlane on the home page.',
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
  ],
  orderings: [
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
      bookTitle: 'book.title',
      media: 'coverImage',
    },
    prepare({ title, type, bookTitle, media }) {
      const typeLabels: Record<string, string> = {
        'short-story': 'Short Story',
        essay: 'Essay',
        poem: 'Poem',
        'serial-chapter': 'Serial Chapter',
      };
      const subtitle = [typeLabels[type] ?? type, bookTitle]
        .filter(Boolean)
        .join(' • ');
      return {
        title,
        subtitle,
        media,
      };
    },
  },
});
