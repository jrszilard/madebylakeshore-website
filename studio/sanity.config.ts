import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemas';
import { structure } from './structure';

// You'll need to create a project at sanity.io and get these values
const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'your-project-id';
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
