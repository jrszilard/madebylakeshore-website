import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemas';
import { structure } from './structure';
import { fattamanoStructure } from './fattamanoStructure';

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'YOUR_PROJECT_ID_HERE';
const dataset = process.env.SANITY_STUDIO_DATASET || 'production';

const isSharedSchema = (t: (typeof schemaTypes)[number]) => t.type !== 'document';

const mainSchemaTypes = schemaTypes.filter((t) => {
  const name = String(t.name);
  return !name.startsWith('fattamano') || isSharedSchema(t);
});
const fattamanoSchemaTypes = schemaTypes.filter((t) => {
  const name = String(t.name);
  return name.startsWith('fattamano') || isSharedSchema(t);
});

export default defineConfig([
  {
    name: 'lakeshore-studios',
    title: 'Lakeshore Studios',
    basePath: '/lakeshore-studios',
    projectId,
    dataset,
    plugins: [structureTool({ structure }), visionTool()],
    schema: { types: mainSchemaTypes },
  },
  {
    name: 'fattamano',
    title: 'fattamano',
    basePath: '/fattamano',
    projectId,
    dataset,
    plugins: [structureTool({ structure: fattamanoStructure }), visionTool()],
    schema: { types: fattamanoSchemaTypes },
  },
]);
