import { createSanityClientWithConfig, queries } from '@lakeshore/shared-ui/sanity';
import type { FattamanoSettings } from './types';

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
type SanityClientBundle = ReturnType<typeof createSanityClientWithConfig>;
type SanityImageBuilder = ReturnType<SanityClientBundle['urlFor']>;

let _client: SanityClientBundle | null = null;

function getClient() {
  if (!_client) {
    // Check multiple possible env var names
    const projectId =
      getEnvVar('PUBLIC_SANITY_PROJECT_ID') ||
      getEnvVar('SANITY_PROJECT_ID') ||
      getEnvVar('SANITY_STUDIO_PROJECT_ID');

    const dataset =
      getEnvVar('PUBLIC_SANITY_DATASET') ||
      getEnvVar('SANITY_DATASET') ||
      getEnvVar('SANITY_STUDIO_DATASET') ||
      'production';

    _client = createSanityClientWithConfig({
      projectId,
      dataset,
    });
  }
  return _client;
}

// Export a proxy that lazily initializes the client
export const sanityClient = {
  fetch: <T = any>(query: string, params?: Record<string, any>): Promise<T> => {
    try {
      return getClient().client.fetch(query, params) as Promise<T>;
    } catch (err) {
      return Promise.reject(err);
    }
  },
};

// How long one read of the shop's settings serves the pages rendered after it.
export const SETTINGS_FRESH_MS = 60_000;
let settingsRead: { at: number; value: unknown } | null = null;

/**
 * The shop's settings document, for rendering pages. One read serves every page rendered in the next minute: the
 * layout and the 404 page both want it, and the Worker renders the 404 for every unknown address a scanner
 * tries. Only the answer is kept, never the request for it (a Worker can't wait on another visit's request), and
 * a failed read isn't kept at all.
 *
 * Checkout doesn't use this: it reads prices, stock and shipping rates fresh, through the write client.
 */
export async function fetchSettings<T = FattamanoSettings | null>(now: () => number = Date.now): Promise<T> {
  if (settingsRead && now() - settingsRead.at < SETTINGS_FRESH_MS) return settingsRead.value as T;
  const value = await sanityClient.fetch<T>(queries.fattamanoSettings);
  settingsRead = { at: now(), value };
  return value;
}

export function urlFor(source: any): SanityImageBuilder | null {
  try {
    return getClient().urlFor(source);
  } catch (err) {
    console.warn('Unable to build Sanity image URL', err);
    return null;
  }
}

export { queries };
