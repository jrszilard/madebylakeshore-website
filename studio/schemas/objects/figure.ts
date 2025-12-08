import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'figure',
  title: 'Figure',
  type: 'image',
  options: {
    hotspot: true,
  },
  fields: [
    defineField({
      name: 'alt',
      title: 'Alt Text',
      type: 'string',
      description: 'Important for accessibility and SEO.',
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
    }),
  ],
  preview: {
    select: {
      imageUrl: 'asset.url',
      alt: 'alt',
    },
  },
});
