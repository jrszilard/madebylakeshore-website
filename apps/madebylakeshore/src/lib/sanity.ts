import { createSanityClientWithConfig, queries } from '@lakeshore/shared-ui/sanity';

// Get env var from either import.meta.env (Astro) or process.env (Vercel build)
function getEnvVar(name: string, fallback = ''): string {
  // Try import.meta.env first (Astro's preferred method)
  if (typeof import.meta !== 'undefined' && import.meta.env?.[name]) {
    return import.meta.env[name];
  }
  // Fallback to process.env (works in Vercel build)
  if (typeof process !== 'undefined' && process.env?.[name]) {
    return process.env[name] as string;
  }
  return fallback;
}

// Lazy-initialize the Sanity client to ensure env vars are available
let _client: ReturnType<typeof createSanityClientWithConfig> | null = null;

function getClient() {
  if (!_client) {
    const projectId = getEnvVar('PUBLIC_SANITY_PROJECT_ID') || getEnvVar('SANITY_PROJECT_ID');
    const dataset = getEnvVar('PUBLIC_SANITY_DATASET') || getEnvVar('SANITY_DATASET', 'production');
    const token = getEnvVar('SANITY_API_TOKEN');

    _client = createSanityClientWithConfig({
      projectId,
      dataset,
      token,
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
