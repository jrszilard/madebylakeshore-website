import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'studioSettings',
  title: 'Studio Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'timeline',
      title: 'Our Story — Timeline',
      type: 'array',
      description: 'Add entries in chronological order. Each entry appears as a step on the Our Story timeline.',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'year', title: 'Year / Period', type: 'string', description: 'e.g. "2018" or "2020–2022"' }),
          defineField({ name: 'title', title: 'Title', type: 'string' }),
          defineField({ name: 'description', title: 'Description', type: 'text', rows: 3 }),
        ],
        preview: {
          select: { title: 'title', subtitle: 'year' },
        },
      }],
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Studio Settings' }),
  },
});
