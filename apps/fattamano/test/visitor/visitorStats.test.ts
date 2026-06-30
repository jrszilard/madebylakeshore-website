import { describe, it, expect, vi } from 'vitest';
import {
  classifyVisitor,
  readStats,
  incrementStats,
  deferWrite,
  planVisit,
  applyOptimistic,
  STATS_DOC_ID,
  STATS_DOC_TYPE,
} from '../../src/lib/server/visitorStats';

const HUMAN_UAS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
];

const BOT_UAS = [
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.0; +https://openai.com/gptbot',
  'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
];

describe('classifyVisitor', () => {
  it('classifies real browser UAs as human', () => {
    for (const ua of HUMAN_UAS) expect(classifyVisitor(ua)).toBe('human');
  });
  it('classifies known bot UAs as bot', () => {
    for (const ua of BOT_UAS) expect(classifyVisitor(ua)).toBe('bot');
  });
  it('treats empty or missing UA as bot', () => {
    expect(classifyVisitor('')).toBe('bot');
    expect(classifyVisitor(null)).toBe('bot');
  });
});

describe('planVisit', () => {
  it('counts a bot as total + bots, no cookie', () => {
    expect(planVisit('bot', false)).toEqual({ increments: { total: 1, bots: 1 }, setHumanCookie: false });
  });
  it('counts a new human as total + humans and sets the cookie', () => {
    expect(planVisit('human', false)).toEqual({ increments: { total: 1, humans: 1 }, setHumanCookie: true });
  });
  it('counts a returning human as total only, no cookie', () => {
    expect(planVisit('human', true)).toEqual({ increments: { total: 1 }, setHumanCookie: false });
  });
});

describe('applyOptimistic', () => {
  it('adds increments field by field', () => {
    expect(applyOptimistic({ total: 10, humans: 4, bots: 6 }, { total: 1, bots: 1 }))
      .toEqual({ total: 11, humans: 4, bots: 7 });
  });
  it('treats missing increment fields as zero', () => {
    expect(applyOptimistic({ total: 10, humans: 4, bots: 6 }, { total: 1 }))
      .toEqual({ total: 11, humans: 4, bots: 6 });
  });
});

describe('readStats', () => {
  it('maps a found doc to stats', async () => {
    const fetcher = (async () => ({ total: 500, humans: 12, bots: 488 })) as any;
    expect(await readStats(fetcher)).toEqual({ total: 500, humans: 12, bots: 488 });
  });
  it('returns zeros when the doc does not exist yet', async () => {
    const fetcher = (async () => null) as any;
    expect(await readStats(fetcher)).toEqual({ total: 0, humans: 0, bots: 0 });
  });
  it('returns null when the read throws', async () => {
    const fetcher = (async () => { throw new Error('sanity down'); }) as any;
    expect(await readStats(fetcher)).toBeNull();
  });
});

function makeClient(opts: { failFirstCommit?: boolean } = {}) {
  let commitCount = 0;
  const commit = vi.fn(async () => {
    commitCount += 1;
    if (opts.failFirstCommit && commitCount === 1) throw new Error('document does not exist');
    return {};
  });
  const inc = vi.fn(() => ({ commit }));
  const patch = vi.fn(() => ({ inc }));
  const createIfNotExists = vi.fn(async () => ({}));
  return { patch, inc, commit, createIfNotExists };
}

describe('incrementStats', () => {
  it('patches and increments the stats doc', async () => {
    const client = makeClient();
    await incrementStats({ total: 1, humans: 1 }, client as any);
    expect(client.patch).toHaveBeenCalledWith(STATS_DOC_ID);
    expect(client.inc).toHaveBeenCalledWith({ total: 1, humans: 1 });
    expect(client.commit).toHaveBeenCalledTimes(1);
    expect(client.createIfNotExists).not.toHaveBeenCalled();
  });

  it('creates the doc then retries when the first patch fails', async () => {
    const client = makeClient({ failFirstCommit: true });
    await incrementStats({ total: 1, bots: 1 }, client as any);
    expect(client.createIfNotExists).toHaveBeenCalledWith({
      _id: STATS_DOC_ID,
      _type: STATS_DOC_TYPE,
      total: 0,
      humans: 0,
      bots: 0,
    });
    expect(client.commit).toHaveBeenCalledTimes(2);
  });
});

describe('deferWrite', () => {
  it('does not throw and swallows rejection', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => deferWrite(Promise.resolve('ok'))).not.toThrow();
    expect(() => deferWrite(Promise.reject(new Error('boom')))).not.toThrow();
    await Promise.resolve();
    warn.mockRestore();
  });
});
