import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'artistProfile',
  title: 'Artist Profile',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'portrait',
      title: 'Portrait',
      type: 'figure',
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'blockContent',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'shortBio',
      title: 'Short Bio',
      type: 'text',
      rows: 3,
      description: 'A brief one-paragraph bio for cards and previews.',
    }),
    defineField({
      name: 'socialLinks',
      title: 'Social Links',
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
      name: 'substackUrl',
      title: 'Substack URL',
      type: 'url',
    }),
  ],
  preview: {
    select: {
      title: 'name',
      media: 'portrait',
    },
    prepare({ title, media }) {
      return {
        title,
        media,
      };
    },
  },
});
