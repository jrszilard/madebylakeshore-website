export function requireServerEnv(name: string): string {
  const fromProcess = typeof process !== 'undefined' ? process.env?.[name] : undefined;
  const fromImport =
    typeof import.meta !== 'undefined' ? (import.meta as any).env?.[name] : undefined;
  const value = fromProcess || fromImport;
  if (!value) throw new Error(`Missing required server env var: ${name}`);
  return value;
}
