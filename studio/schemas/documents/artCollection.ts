import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'artCollection',
  title: 'Art Collection',
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
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'text',
      rows: 2,
      description: 'Short editorial line shown over the cover image.',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'blockContent',
    }),
    defineField({
      name: 'releaseDate',
      title: 'Release Date',
      type: 'date',
      description: 'When this drop was released.',
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'figure',
    }),
    defineField({
      name: 'essayBlocks',
      title: 'Visual Essay',
      description: 'Build the collection essay block by block. A swimlane of all pieces in the collection appears automatically at the end.',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'imageBlock',
          title: 'Image',
          fields: [
            {
              name: 'style',
              title: 'Style',
              type: 'string',
              options: {
                list: [
                  { title: 'Full bleed (edge to edge)', value: 'full-bleed' },
                  { title: 'Full width (in container)', value: 'full-width' },
                ],
                layout: 'radio',
              },
              initialValue: 'full-width',
              validation: (Rule: any) => Rule.required(),
            },
            {
              name: 'image',
              title: 'Image',
              type: 'figure',
              validation: (Rule: any) => Rule.required(),
            },
            {
              name: 'caption',
              title: 'Caption',
              type: 'string',
            },
          ],
          preview: {
            select: { style: 'style', media: 'image' },
            prepare({ style, media }: any) {
              return {
                title: style === 'full-bleed' ? 'Image — Full bleed' : 'Image — Full width',
                media,
              };
            },
          },
        },
        {
          type: 'object',
          name: 'textBlock',
          title: 'Text',
          fields: [
            {
              name: 'style',
              title: 'Style',
              type: 'string',
              options: {
                list: [
                  { title: 'Full bleed (edge to edge, dark background)', value: 'full-bleed' },
                  { title: 'Full width (in container)', value: 'full-width' },
                ],
                layout: 'radio',
              },
              initialValue: 'full-width',
              validation: (Rule: any) => Rule.required(),
            },
            {
              name: 'heading',
              title: 'Heading',
              type: 'string',
            },
            {
              name: 'body',
              title: 'Body',
              type: 'text',
              rows: 5,
              validation: (Rule: any) => Rule.required(),
            },
          ],
          preview: {
            select: { style: 'style', title: 'heading', subtitle: 'body' },
            prepare({ style, title, subtitle }: any) {
              return {
                title: title ?? (style === 'full-bleed' ? 'Text — Full bleed' : 'Text — Full width'),
                subtitle: subtitle ?? '',
              };
            },
          },
        },
      ],
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
    }),
  ],
});
