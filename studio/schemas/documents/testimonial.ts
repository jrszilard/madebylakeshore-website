import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'testimonial',
  title: 'Testimonial',
  type: 'document',
  fields: [
    defineField({
      name: 'quote',
      title: 'Quote',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'authorName',
      title: 'Author Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'authorTitle',
      title: 'Author Title',
      type: 'string',
    }),
    defineField({
      name: 'company',
      title: 'Company',
      type: 'string',
    }),
    defineField({
      name: 'authorImage',
      title: 'Author Image',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'relatedTo',
      title: 'Related To',
      type: 'reference',
      to: [{ type: 'person' }],
      description: 'Which consultant is this testimonial for?',
    }),
    defineField({
      name: 'serviceType',
      title: 'Service Type',
      type: 'string',
      options: {
        list: [
          { title: 'Design', value: 'design' },
          { title: 'Data', value: 'data' },
          { title: 'AI', value: 'ai' },
        ],
      },
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      quote: 'quote',
      author: 'authorName',
      company: 'company',
    },
    prepare({ quote, author, company }) {
      return {
        title: quote?.substring(0, 50) + '...',
        subtitle: `${author}${company ? ` • ${company}` : ''}`,
      };
    },
  },
});
