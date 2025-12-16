import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemas';
import { structure } from './structure';

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'YOUR_PROJECT_ID_HERE';
const dataset = process.env.SANITY_STUDIO_DATASET || 'production';

export default defineConfig({
  name: 'lakeshore-studios',
  title: 'Lakeshore Studios CMS',
  
  projectId,
  dataset,
  
  plugins: [
    structureTool({ structure }),
    visionTool(),
  ],
  
  schema: {
    types: schemaTypes,
  },
});