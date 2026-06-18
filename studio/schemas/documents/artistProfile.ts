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
      name: 'aboutHeadline',
      title: 'About Headline',
      type: 'string',
      description: 'Large heading at the top of the About page.',
    }),
    defineField({
      name: 'aboutPullQuote',
      title: 'About Pull Quote',
      type: 'text',
      rows: 2,
      description: 'Italic pull quote displayed below the headline.',
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'text',
      rows: 8,
      description: 'Full bio shown on the About page. Separate paragraphs with a blank line.',
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
      description: 'Each medium is shown as a card on the About page with an icon and description.',
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
              name: 'icon',
              title: 'Icon',
              type: 'string',
              options: {
                list: [
                  { title: 'Painting', value: 'painting' },
                  { title: 'Printmaking', value: 'printmaking' },
                  { title: 'Drawing (Ink & Pencil)', value: 'drawing' },
                  { title: 'Writing', value: 'writing' },
                  { title: 'Photography', value: 'photography' },
                  { title: 'Other', value: 'other' },
                ],
                layout: 'radio',
              },
              initialValue: 'other',
            },
          ],
          preview: {
            select: { title: 'title', subtitle: 'icon' },
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
