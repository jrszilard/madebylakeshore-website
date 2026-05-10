import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'banner',
  title: 'Site Banner',
  type: 'document',
  fields: [
    defineField({
      name: 'active',
      title: 'Active',
      type: 'boolean',
      description: 'Toggle the banner on or off without deleting it.',
      initialValue: false,
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'cta1',
      title: 'Primary CTA',
      type: 'object',
      fields: [
        defineField({ name: 'label', title: 'Label', type: 'string' }),
        defineField({ name: 'url', title: 'URL', type: 'string', description: 'Use a full URL or a relative path like /events' }),
      ],
    }),
    defineField({
      name: 'cta2',
      title: 'Secondary CTA',
      type: 'object',
      fields: [
        defineField({ name: 'label', title: 'Label', type: 'string' }),
        defineField({ name: 'url', title: 'URL', type: 'string', description: 'Use a full URL or a relative path like /events' }),
      ],
    }),
  ],
  preview: {
    select: { title: 'title', active: 'active' },
    prepare: ({ title, active }) => ({
      title: title || 'Site Banner',
      subtitle: active ? '● Active' : '○ Inactive',
    }),
  },
});
