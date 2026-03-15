import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'event',
  title: 'Event',
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
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'eventType',
      title: 'Event Type',
      type: 'string',
      options: {
        list: [
          { title: 'Art Fair', value: 'art-fair' },
          { title: 'Market', value: 'market' },
          { title: 'Exhibition', value: 'exhibition' },
          { title: 'Book Signing', value: 'book-signing' },
          { title: 'Workshop', value: 'workshop' },
          { title: 'Other', value: 'other' },
        ],
      },
    }),
    defineField({
      name: 'startDate',
      title: 'Start Date',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'endDate',
      title: 'End Date',
      type: 'datetime',
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'object',
      fields: [
        {
          name: 'venueName',
          title: 'Venue Name',
          type: 'string',
        },
        {
          name: 'address',
          title: 'Address',
          type: 'string',
        },
        {
          name: 'city',
          title: 'City',
          type: 'string',
          validation: (Rule) => Rule.required(),
        },
        {
          name: 'state',
          title: 'State',
          type: 'string',
        },
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'blockContent',
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'figure',
    }),
    defineField({
      name: 'bringingArtwork',
      title: 'Bringing Artwork',
      description: 'Artwork pieces being exhibited or sold at this event.',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'artwork' }] }],
    }),
    defineField({
      name: 'bringingBooks',
      title: 'Bringing Books',
      description: 'Books being sold or signed at this event.',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'book' }] }],
    }),
    defineField({
      name: 'externalUrl',
      title: 'External URL',
      type: 'url',
      description: 'Link to event page, tickets, or more information.',
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
    }),
  ],
  orderings: [
    {
      title: 'Start Date, Upcoming First',
      name: 'startDateAsc',
      by: [{ field: 'startDate', direction: 'asc' }],
    },
    {
      title: 'Start Date, Most Recent First',
      name: 'startDateDesc',
      by: [{ field: 'startDate', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      title: 'title',
      startDate: 'startDate',
      city: 'location.city',
      state: 'location.state',
      media: 'coverImage',
    },
    prepare({ title, startDate, city, state, media }) {
      const dateDisplay = startDate
        ? new Date(startDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'Date TBD';
      const locationDisplay = [city, state].filter(Boolean).join(', ');
      return {
        title,
        subtitle: [dateDisplay, locationDisplay].filter(Boolean).join(' • '),
        media,
      };
    },
  },
});
