import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { slashlessPages, slashlessRules, STATIC_RULE_LIMIT } from '../../integrations/slashless-pages.mjs';

describe('slashlessRules', () => {
  it('gives each page a rewrite from its no-slash address, and the home page none', () => {
    expect(slashlessRules(['wewantdeadpeople', '', 'things/the-cloud-locally-hosted', 'things'])).toEqual([
      '/things /things/ 200',
      '/things/the-cloud-locally-hosted /things/the-cloud-locally-hosted/ 200',
      '/wewantdeadpeople /wewantdeadpeople/ 200',
    ]);
  });
});

describe('slashlessRules, given a folder name that could break the rules file', () => {
  it('writes no rule for it: a space, a line break, a wildcard or a placeholder would change what a line means', () => {
    expect(
      slashlessRules([
        'things/fine-name_1.2~x',
        'things/two words',
        'things/a\n/evil https://evil.example 301',
        'things/star*',
        'things/:splat',
        'things/quote"',
        'things//double',
        '/leading',
        'trailing/',
      ]),
    ).toEqual(['/things/fine-name_1.2~x /things/fine-name_1.2~x/ 200']);
  });
});

describe('the build step', () => {
  let dist: string;
  const logger = { info: vi.fn(), warn: vi.fn() };
  const run = () => (slashlessPages().hooks as any)['astro:build:done']({ dir: pathToFileURL(dist + '/'), logger });
  const page = async (dir: string) => {
    await mkdir(join(dist, dir), { recursive: true });
    await writeFile(join(dist, dir, 'index.html'), '<!doctype html>');
  };
  const rulesWritten = async () =>
    (await readFile(join(dist, '_redirects'), 'utf8')).split('\n').filter((l) => l && !l.startsWith('#'));

  beforeEach(async () => {
    dist = await mkdtemp(join(tmpdir(), 'fattamano-dist-'));
    logger.info.mockClear();
    logger.warn.mockClear();
  });
  afterEach(() => rm(dist, { recursive: true, force: true }));

  it("adds a rule for every built page after the site's own, skipping files and the Worker's code", async () => {
    await writeFile(join(dist, '_redirects'), '# old image address\n/api/og /og-default.png 302\n');
    await page('');
    await page('wewantdeadpeople');
    await page('things');
    await page('things/permanent-underclass');
    await page('_worker.js/pages'); // not a page: the Worker's own output
    await mkdir(join(dist, 'og'), { recursive: true });
    await writeFile(join(dist, 'og', 'permanent-underclass.png'), '');
    await writeFile(join(dist, '404.html'), '');

    await run();

    expect(await rulesWritten()).toEqual([
      '/api/og /og-default.png 302',
      '/things /things/ 200',
      '/things/permanent-underclass /things/permanent-underclass/ 200',
      '/wewantdeadpeople /wewantdeadpeople/ 200',
    ]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns about a page it leaves without a rule', async () => {
    await page('about');
    await page('things/two words');
    await run();
    expect(await rulesWritten()).toEqual(['/about /about/ 200']);
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('writes the file when the site has no rules of its own', async () => {
    await page('about');
    await run();
    expect(await rulesWritten()).toEqual(['/about /about/ 200']);
  });

  it("stops at Cloudflare's limit and says so, since a page without a rule still works through a redirect", async () => {
    await writeFile(
      join(dist, '_redirects'),
      Array.from({ length: STATIC_RULE_LIMIT - 1 }, (_, i) => `/old-${i} /new-${i} 301`).join('\n') + '\n',
    );
    await page('about');
    await page('notes');

    await run();

    const written = await rulesWritten();
    expect(written).toHaveLength(STATIC_RULE_LIMIT);
    expect(written.at(-1)).toBe('/about /about/ 200');
    expect(logger.warn).toHaveBeenCalledOnce();
  });
});
