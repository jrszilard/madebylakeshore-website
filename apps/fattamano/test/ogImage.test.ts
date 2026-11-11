import { describe, it, expect } from 'vitest';
import { ogCard, productOgImagePath, productOgText, type OgNode } from '../src/lib/ogImage';

// Every piece of text on the card, in order.
function texts(node: OgNode): string[] {
  const { children } = node.props;
  if (typeof children === 'string') return [children];
  return (children ?? []).flatMap(texts);
}

describe('product preview images', () => {
  it('live at /og/<slug>.png', () => {
    expect(productOgImagePath('the-cloud-locally-hosted')).toBe('/og/the-cloud-locally-hosted.png');
  });

  it('show the title, then the tagline, or the category when there is no tagline', () => {
    expect(productOgText({ title: 'Permanent Underclass', tagline: 'A durable label.', category: 'sticker' })).toEqual({
      title: 'Permanent Underclass',
      subtitle: 'A durable label.',
    });
    expect(productOgText({ title: 'Permanent Underclass', category: 'sticker' }).subtitle).toBe('sticker');
    expect(productOgText({ title: '', category: '' })).toEqual({ title: 'fattamano', subtitle: '' });
  });
});

describe('the preview card', () => {
  it('carries the brand name, the title and the subtitle as text', () => {
    expect(texts(ogCard('Dead People Wanted', 'A fake funeral-home ad.'))).toEqual([
      'fattamano',
      'Dead People Wanted',
      'A fake funeral-home ad.',
    ]);
  });

  it('leaves the subtitle out when there is none', () => {
    expect(texts(ogCard('Dead People Wanted', ''))).toEqual(['fattamano', 'Dead People Wanted']);
  });

  it("keeps markup in a product's name as plain text, so it can't break the card", () => {
    const name = 'Salt & <b>Vinegar</b> "Edition"';
    expect(texts(ogCard(name, '<div>not a div</div>'))).toEqual(['fattamano', name, '<div>not a div</div>']);
  });

  it('sets a long title smaller', () => {
    const titleSize = (title: string) => {
      const [, , text] = ogCard(title, '').props.children as OgNode[];
      return (text.props.children as OgNode[])[0].props.style.fontSize;
    };
    expect(titleSize('Short')).toBe('96px');
    expect(titleSize('A title that runs to more than forty characters')).toBe('72px');
  });
});
