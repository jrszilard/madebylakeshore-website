// Server settings are read when a request needs them, never at build time: on Cloudflare they are Worker secrets,
// which exist only at runtime (process.env carries them, see wrangler.jsonc). import.meta.env is the fallback for
// local dev, where Astro loads .env.local into it.
function readServerEnv(name: string): string | undefined {
  const fromProcess = typeof process !== 'undefined' ? process.env?.[name] : undefined;
  const fromImport =
    typeof import.meta !== 'undefined' ? (import.meta as any).env?.[name] : undefined;
  return fromProcess || fromImport || undefined;
}

export function requireServerEnv(name: string): string {
  const value = readServerEnv(name);
  if (!value) throw new Error(`Missing required server env var: ${name}`);
  return value;
}

/** A setting the site works without. */
export function optionalServerEnv(name: string): string | undefined {
  return readServerEnv(name);
}
