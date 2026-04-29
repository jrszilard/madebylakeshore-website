export const SHOP_PLATFORM: 'snipcart' | 'etsy' | 'inquiry' | null = 'snipcart';
export const SUBSTACK_URL = 'https://designandtheotherstories.substack.com';
export const SUBSTACK_FEED_URL = `${SUBSTACK_URL}/feed`;
export const SUBSTACK_EMBED_URL = `${SUBSTACK_URL}/embed`;
export const SUBSTACK_SHORT_STORIES_SECTION_ID = '216645';

// Marketplace links — update these when stores go live.
// They auto-propagate to structured data, footer, FAQ, and llms.txt.
export const MARKETPLACE_LINKS = {
  etsy: null as string | null,   // e.g. 'https://www.etsy.com/shop/designandotherstories'
  ebay: null as string | null,   // e.g. 'https://www.ebay.com/str/designandotherstories'
} as const;

export const SITE_URL = 'https://designandotherstories.com';
export const ARTIST_NAME = 'W. H. Bonilla';
export const BRAND_NAME = 'Design & Other Stories';
