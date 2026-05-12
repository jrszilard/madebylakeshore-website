import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'fattamanoSettings',
  title: 'fattamano Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'heroHeadline',
      title: 'Hero Headline',
      type: 'string',
      description: 'Big text on home page.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'heroSubcopy',
      title: 'Hero Subcopy',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'aboutBody',
      title: 'About Body',
      type: 'blockContent',
      description: 'Copy for /about page.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'footerCopy',
      title: 'Footer Copy',
      type: 'string',
      description: 'Small footer phrase. Falls back to "fatto a mano — made by hand, sometimes well" if empty.',
    }),
    defineField({
      name: 'notFoundCopy',
      title: '404 Page Copy',
      type: 'blockContent',
      description: 'Body of the custom 404 page.',
    }),
    defineField({
      name: 'contactEmail',
      title: 'Contact Email',
      type: 'string',
      description: 'For "DM to buy" / inquiries.',
      validation: (Rule) => Rule.required().email(),
    }),
  ],
  preview: {
    prepare: () => ({ title: 'fattamano Settings' }),
  },
});
