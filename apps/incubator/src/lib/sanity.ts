import { createSanityClientWithConfig, queries } from '@lakeshore/shared-ui/sanity';

// Lazy-initialize the Sanity client to ensure env vars are available
let _client: ReturnType<typeof createSanityClientWithConfig> | null = null;

function getClient() {
  if (!_client) {
    _client = createSanityClientWithConfig({
      projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
      dataset: import.meta.env.PUBLIC_SANITY_DATASET || 'production',
      token: import.meta.env.SANITY_API_TOKEN,
    });
  }
  return _client;
}

// Export a proxy that lazily initializes the client
export const sanityClient = {
  fetch: <T>(query: string, params?: Record<string, unknown>): Promise<T> => {
    return getClient().client.fetch<T>(query, params);
  },
};

export function urlFor(source: any) {
  return getClient().urlFor(source);
}

export { queries };
