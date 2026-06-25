import { createServerSanityClient } from '@lakeshore/shared-ui/sanity';

let _bundle: ReturnType<typeof createServerSanityClient> | null = null;

// Resolve a runtime env var from process.env or import.meta.env. Dynamic access
// (a variable key) is NOT inlined by Vite, so this reads the value present in the
// serverless runtime — which is why the names must actually be set at runtime.
function readEnv(name: string): string | undefined {
  const fromProcess = typeof process !== 'undefined' ? process.env?.[name] : undefined;
  const fromImport =
    typeof import.meta !== 'undefined' ? (import.meta as any).env?.[name] : undefined;
  return fromProcess || fromImport || undefined;
}

function firstEnv(names: string[]): string | undefined {
  for (const n of names) {
    const v = readEnv(n);
    if (v) return v;
  }
  return undefined;
}

function bundle() {
  if (!_bundle) {
    // Mirror the read client's tolerant naming so the write client works regardless
    // of which env-var name a given deploy uses for the Sanity project/dataset.
    const projectId = firstEnv([
      'PUBLIC_SANITY_PROJECT_ID',
      'SANITY_PROJECT_ID',
      'SANITY_STUDIO_PROJECT_ID',
    ]);
    if (!projectId) {
      throw new Error(
        'Missing Sanity project id (set PUBLIC_SANITY_PROJECT_ID, SANITY_PROJECT_ID, or SANITY_STUDIO_PROJECT_ID)'
      );
    }
    const dataset =
      firstEnv(['PUBLIC_SANITY_DATASET', 'SANITY_DATASET', 'SANITY_STUDIO_DATASET']) || 'production';
    const token = firstEnv(['SANITY_WRITE_TOKEN', 'SANITY_API_TOKEN', 'SANITY_EDITOR_API_TOKEN']);
    if (!token) {
      throw new Error(
        'Missing Sanity write token (set SANITY_WRITE_TOKEN, SANITY_API_TOKEN, or SANITY_EDITOR_API_TOKEN with write access)'
      );
    }
    _bundle = createServerSanityClient({ projectId, dataset, token });
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
