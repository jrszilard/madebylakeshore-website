import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'codeBlock',
  title: 'Code Block',
  type: 'object',
  fields: [
    defineField({
      name: 'language',
      title: 'Language',
      type: 'string',
      options: {
        list: [
          { title: 'TypeScript', value: 'typescript' },
          { title: 'JavaScript', value: 'javascript' },
          { title: 'TSX', value: 'tsx' },
          { title: 'JSX', value: 'jsx' },
          { title: 'Bash', value: 'bash' },
          { title: 'Python', value: 'python' },
          { title: 'JSON', value: 'json' },
          { title: 'CSS', value: 'css' },
          { title: 'HTML', value: 'html' },
          { title: 'Plain Text', value: 'text' },
        ],
      },
      initialValue: 'typescript',
    }),
    defineField({
      name: 'filename',
      title: 'Filename',
      type: 'string',
      description: 'Optional filename to display above the code block',
    }),
    defineField({
      name: 'code',
      title: 'Code',
      type: 'text',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      language: 'language',
      filename: 'filename',
      code: 'code',
    },
    prepare({ language, filename, code }) {
      return {
        title: filename || `Code: ${language || 'text'}`,
        subtitle: code ? code.slice(0, 80) : '',
      };
    },
  },
});
