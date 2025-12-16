import { createSanityClientWithConfig, queries } from '@lakeshore/shared-ui/sanity';

// Create Sanity client with this app's environment variables
const { client, urlFor, fetchSanity } = createSanityClientWithConfig({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET || 'production',
  token: import.meta.env.SANITY_API_TOKEN,
});

export { client as sanityClient, urlFor, fetchSanity, queries };
