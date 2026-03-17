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
      name: 'lookbookContent',
      title: 'Lookbook Content',
      description: 'Build the collection page by interleaving artwork and editorial text in any order.',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'artworkEntry',
          title: 'Artwork',
          fields: [
            {
              name: 'artwork',
              title: 'Artwork',
              type: 'reference',
              to: [{ type: 'artwork' }],
              validation: (Rule: any) => Rule.required(),
            },
          ],
          preview: {
            select: { title: 'artwork.title', media: 'artwork.images.0' },
            prepare({ title, media }: any) {
              return { title: title ?? 'Untitled artwork', media };
            },
          },
        },
        {
          type: 'object',
          name: 'editorialText',
          title: 'Editorial Text',
          fields: [
            {
              name: 'layout',
              title: 'Layout',
              type: 'string',
              options: {
                list: [
                  { title: 'Full width', value: 'fullwidth' },
                  { title: 'Inline (card in grid)', value: 'inline' },
                ],
                layout: 'radio',
              },
              initialValue: 'fullwidth',
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
              rows: 4,
              validation: (Rule: any) => Rule.required(),
            },
          ],
          preview: {
            select: { title: 'heading', subtitle: 'body', layout: 'layout' },
            prepare({ title, subtitle, layout }: any) {
              return {
                title: title ?? 'Editorial text',
                subtitle: `${layout === 'inline' ? 'Inline' : 'Full width'} — ${subtitle ?? ''}`,
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
