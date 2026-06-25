import { createServerSanityClient } from '@lakeshore/shared-ui/sanity';
import { requireServerEnv } from './env';

let _bundle: ReturnType<typeof createServerSanityClient> | null = null;

function bundle() {
  if (!_bundle) {
    _bundle = createServerSanityClient({
      projectId:
        requireServerEnv('PUBLIC_SANITY_PROJECT_ID'),
      dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
      token: requireServerEnv('SANITY_WRITE_TOKEN'),
    });
  }
  return _bundle;
}

// Read with the write client (no CDN -> always fresh, critical for stock checks).
export function sanityWriteFetch<T = any>(query: string, params?: Record<string, any>): Promise<T> {
  return bundle().fetch<T>(query, params);
}

// Raw @sanity/client for transactions/patches/createIfNotExists.
export function sanityWriteClient() {
  return bundle().client;
}
