import { readdir, readFile, writeFile } from 'node:fs/promises';

// @astrojs/vercel 7.x is the last adapter line for Astro 4, and it only knows Node 18 and 20.
// Built on anything newer, it writes `runtime: "nodejs18.x"` into every function's
// .vc-config.json, which Vercel rejects now that 18 and 20 are discontinued. This wraps the
// adapter and rewrites that runtime to the Node major the build actually ran on (the Vercel
// project's Node.js Version setting). Remove it once the apps move to Astro 5 / adapter 8+.
export function withBuildNodeRuntime(adapter) {
  let outDir;
  const configDone = adapter.hooks['astro:config:done'];
  const buildDone = adapter.hooks['astro:build:done'];

  adapter.hooks['astro:config:done'] = (params) => {
    outDir = params.config.outDir;
    return configDone?.(params);
  };

  adapter.hooks['astro:build:done'] = async (params) => {
    await buildDone?.(params);

    const runtime = `nodejs${process.versions.node.split('.')[0]}.x`;
    const functionsDir = new URL('./functions/', outDir);
    const entries = await readdir(functionsDir, { recursive: true }).catch(() => []);

    for (const entry of entries) {
      if (!entry.endsWith('.vc-config.json')) continue;
      const file = new URL(entry, functionsDir);
      const vcConfig = JSON.parse(await readFile(file, 'utf8'));
      if (!vcConfig.runtime?.startsWith('nodejs') || vcConfig.runtime === runtime) continue;
      params.logger.info(`${entry}: runtime ${vcConfig.runtime} -> ${runtime}`);
      vcConfig.runtime = runtime;
      await writeFile(file, JSON.stringify(vcConfig, null, '\t'));
    }
  };

  return adapter;
}
