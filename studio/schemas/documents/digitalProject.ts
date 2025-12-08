import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'digitalProject',
  title: 'Digital Project',
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
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      description: 'A short catchy description.',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Concept', value: 'concept' },
          { title: 'In Development', value: 'in-development' },
          { title: 'Beta', value: 'beta' },
          { title: 'Launched', value: 'launched' },
          { title: 'Archived', value: 'archived' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'projectType',
      title: 'Project Type',
      type: 'string',
      options: {
        list: [
          { title: 'Web App', value: 'web-app' },
          { title: 'Mobile App', value: 'mobile-app' },
          { title: 'SaaS Tool', value: 'saas' },
          { title: 'Open Source', value: 'open-source' },
          { title: 'Template/Download', value: 'template' },
          { title: 'Experiment', value: 'experiment' },
        ],
      },
    }),
    defineField({
      name: 'icon',
      title: 'Icon/Logo',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'featuredImage',
      title: 'Featured Image',
      type: 'figure',
    }),
    defineField({
      name: 'screenshots',
      title: 'Screenshots',
      type: 'array',
      of: [{ type: 'figure' }],
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'blockContent',
    }),
    defineField({
      name: 'techStack',
      title: 'Tech Stack',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags',
      },
    }),
    defineField({
      name: 'liveUrl',
      title: 'Live URL',
      type: 'url',
    }),
    defineField({
      name: 'githubUrl',
      title: 'GitHub URL',
      type: 'url',
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'launchDate',
      title: 'Launch Date',
      type: 'date',
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
    }),
  ],
  orderings: [
    {
      title: 'Launch Date, New',
      name: 'launchDateDesc',
      by: [{ field: 'launchDate', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      title: 'title',
      status: 'status',
      media: 'icon',
    },
    prepare({ title, status, media }) {
      const statusLabels: Record<string, string> = {
        concept: '💡 Concept',
        'in-development': '🔨 In Development',
        beta: '🧪 Beta',
        launched: '🚀 Launched',
        archived: '📦 Archived',
      };
      return {
        title,
        subtitle: statusLabels[status] || status,
        media,
      };
    },
  },
});
