import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'person',
  title: 'Person',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      description: 'e.g., "Design Consultant" or "Data & AI Consultant"',
    }),
    defineField({
      name: 'image',
      title: 'Photo',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'blockContent',
    }),
    defineField({
      name: 'shortBio',
      title: 'Short Bio',
      type: 'text',
      rows: 3,
      description: 'A brief one-paragraph bio for cards and previews.',
    }),
    defineField({
      name: 'calendlyUrl',
      title: 'Calendly URL',
      type: 'url',
      description: 'Link to your Calendly scheduling page.',
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
    }),
    defineField({
      name: 'social',
      title: 'Social Links',
      type: 'object',
      fields: [
        { name: 'linkedin', title: 'LinkedIn', type: 'url' },
        { name: 'twitter', title: 'Twitter/X', type: 'url' },
        { name: 'instagram', title: 'Instagram', type: 'url' },
        { name: 'dribbble', title: 'Dribbble', type: 'url' },
        { name: 'github', title: 'GitHub', type: 'url' },
      ],
    }),
    // Personal portfolio fields
    defineField({
      name: 'headline',
      title: 'Personal Headline',
      type: 'string',
      description: 'A punchy personal tagline, e.g. "Product Designer. Gamer. Dog Mom."',
    }),
    defineField({
      name: 'location',
      title: 'Locations',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Cities or places you call home.',
    }),
    defineField({
      name: 'interests',
      title: 'Interests',
      type: 'array',
      description: 'Hobbies and personal interests. Add an image to show a hover preview.',
      of: [{
        type: 'object',
        fields: [
          { name: 'label', title: 'Label', type: 'string' },
          { name: 'image', title: 'Image', type: 'image', options: { hotspot: true } },
        ],
        preview: { select: { title: 'label', media: 'image' } },
      }],
    }),
    defineField({
      name: 'favoriteShows',
      title: 'Favorite Shows',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'favoriteBooks',
      title: 'Favorite Books',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'currentlyListening',
      title: 'Currently Listening To',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Podcasts, albums, artists, etc.',
    }),
    defineField({
      name: 'photoGallery',
      title: 'Personal Photo Gallery',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            { name: 'alt', title: 'Alt text', type: 'string' },
            { name: 'caption', title: 'Caption', type: 'string' },
          ],
        },
      ],
    }),
    defineField({
      name: 'companies',
      title: 'Companies / Experience',
      type: 'array',
      description: 'Logos of companies you have worked with.',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'name', title: 'Company Name', type: 'string' },
            {
              name: 'logo',
              title: 'Logo',
              type: 'image',
              options: { hotspot: false },
            },
          ],
          preview: {
            select: { title: 'name', media: 'logo' },
          },
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'role',
      media: 'image',
    },
  },
});
