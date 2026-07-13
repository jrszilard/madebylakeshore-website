import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemas';
import { structure } from './structure';
import { fattamanoStructure } from './fattamanoStructure';
import { fattamanoOrdersStructure } from './fattamanoOrdersStructure';

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'YOUR_PROJECT_ID_HERE';
const dataset = process.env.SANITY_STUDIO_DATASET || 'production';
const orderDataset = process.env.SANITY_STUDIO_ORDER_DATASET || 'fattamano-orders';

const isSharedSchema = (t: (typeof schemaTypes)[number]) => t.type !== 'document';
const isPrivateFattamanoSchema = (name: string) =>
  name === 'fattamanoCheckoutSession' || name === 'fattamanoAnalyticsDaily';

const mainSchemaTypes = schemaTypes.filter((t) => {
  const name = String(t.name);
  return !name.startsWith('fattamano') || isSharedSchema(t);
});
const fattamanoSchemaTypes = schemaTypes.filter((t) => {
  const name = String(t.name);
  return (name.startsWith('fattamano') && !isPrivateFattamanoSchema(name)) || isSharedSchema(t);
});
const fattamanoOrderSchemaTypes = schemaTypes.filter((t) =>
  isPrivateFattamanoSchema(String(t.name)),
);

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
  {
    name: 'fattamano-orders',
    title: 'fattamano Orders (private)',
    basePath: '/fattamano-orders',
    projectId,
    dataset: orderDataset,
    plugins: [structureTool({ structure: fattamanoOrdersStructure }), visionTool()],
    schema: { types: fattamanoOrderSchemaTypes },
  },
]);
