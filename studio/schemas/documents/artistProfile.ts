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
      name: 'heroImage',
      title: 'Hero Image',
      type: 'figure',
      description: 'Full-bleed cover image displayed on the home page hero section.',
    }),
    defineField({
      name: 'aboutImages',
      title: 'About Page Images',
      type: 'array',
      of: [{ type: 'figure' }],
      description: 'Photos for the mosaic grid at the top of the About page. 3–4 images work best.',
    }),
    defineField({
      name: 'mediums',
      title: 'Mediums',
      type: 'array',
      description: 'Each medium gets its own section on the About page with a description and WIP image carousel.',
      of: [
        {
          type: 'object',
          title: 'Medium',
          fields: [
            {
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (Rule: any) => Rule.required(),
            },
            {
              name: 'description',
              title: 'Description',
              type: 'text',
              rows: 4,
              description: 'How and why you got into this medium.',
            },
            {
              name: 'images',
              title: 'WIP Images',
              type: 'array',
              of: [{ type: 'figure' }],
            },
          ],
          preview: {
            select: { title: 'title', media: 'images.0' },
          },
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'name',
      media: 'heroImage',
    },
    prepare({ title, media }) {
      return { title, media };
    },
  },
});
