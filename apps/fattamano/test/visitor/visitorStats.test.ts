import { describe, it, expect } from 'vitest';
import { classifyVisitor } from '../../src/lib/server/visitorStats';

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
