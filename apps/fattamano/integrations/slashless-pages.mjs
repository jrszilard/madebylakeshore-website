// Both /wewantdeadpeople and /wewantdeadpeople/ answered 200 on Vercel. Cloudflare's static files answer one form
// and redirect the other: a page built as wewantdeadpeople/index.html is served at /wewantdeadpeople/, and
// /wewantdeadpeople gets a 307 there. The no-slash form is the one printed on the stickers and used by every link
// on the site, so each built page gets a rewrite rule in dist/_redirects that serves it at the no-slash address too
// (status 200: Cloudflare answers with the page, with no redirect). The canonical tags and the sitemap keep the
// trailing-slash form, as before the move.
//
// Without a rule a page still works, through the 307, so going over Cloudflare's limit only costs that redirect.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// Cloudflare reads at most 2,000 static rules from a _redirects file.
export const STATIC_RULE_LIMIT = 2000;

// A page's folder becomes a line in _redirects, where a space would start another field and "*" or ":" mean
// something. Product folders are named by Sanity slugs, so only plain URL-safe names are written.
const PLAIN_PATH = /^[A-Za-z0-9._~-]+(\/[A-Za-z0-9._~-]+)*$/;

/**
 * The rewrite rules for the pages built as <dir>/index.html, given their directories. The home page ('') needs
 * none, and a page with anything but plain characters in its path gets none.
 */
export function slashlessRules(pageDirs) {
  return pageDirs
    .filter((dir) => PLAIN_PATH.test(dir))
    .sort()
    .map((dir) => `/${dir} /${dir}/ 200`);
}

async function pageDirsIn(root, dir = '') {
  const found = [];
  for (const entry of await readdir(join(root, dir), { withFileTypes: true })) {
    if (entry.isDirectory()) {
      // The Worker's own code is not a page.
      if (dir === '' && entry.name === '_worker.js') continue;
      found.push(...(await pageDirsIn(root, join(dir, entry.name))));
    } else if (entry.name === 'index.html') {
      found.push(dir.split('\\').join('/'));
    }
  }
  return found;
}

export function slashlessPages() {
  return {
    name: 'fattamano:slashless-pages',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const file = join(root, '_redirects');
        const existing = await readFile(file, 'utf8').catch(() => '');
        const written = existing.split('\n').filter((line) => line.trim() && !line.trim().startsWith('#'));
        const pageDirs = await pageDirsIn(root);
        const rules = slashlessRules(pageDirs);
        const unruled = pageDirs.length - rules.length - (pageDirs.includes('') ? 1 : 0);
        if (unruled > 0) {
          logger.warn(`${unruled} page(s) with unusual characters in their path answer /page with a redirect to /page/.`);
        }
        const room = Math.max(0, STATIC_RULE_LIMIT - written.length);
        if (rules.length > room) {
          logger.warn(
            `${rules.length} pages but room for ${room} rewrite rules: the rest answer /page with a redirect to /page/.`,
          );
        }
        const kept = rules.slice(0, room);
        const body = [existing.trimEnd(), '# Added by integrations/slashless-pages.mjs when the site is built.', ...kept];
        await writeFile(file, body.filter(Boolean).join('\n') + '\n');
        logger.info(`${kept.length} pages also answer without a trailing slash`);
      },
    },
  };
}
