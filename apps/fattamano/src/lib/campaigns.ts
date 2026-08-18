/**
 * Real Fake Ads campaign registry — the single source of truth for fake businesses.
 *
 * Every fake company gets one permanent entry here. The archive page, the /things
 * callout, the fake sites' disclosure footers, the footer directory, the homepage
 * featured-collection band, and the 404 random-business link all render from this
 * list. Adding fake business #009 = add one entry + one page file.
 *
 * Permanent constraints (see knowledge-base decisions 2026-08-18):
 * - `route` is a ROOT url and never changes. These URLs are printed on physical
 *   stickers. Do not "tidy" them under a path prefix.
 * - `number` is permanent. Fake businesses are never renumbered.
 */

export interface CampaignTheme {
  /** Panel background class (usually an arbitrary-value Tailwind bg). */
  bg: string;
  /** Accent text class used on the dark panel. */
  accent: string;
  /** Button classes (bg + text) for the campaign's primary CTA. */
  button: string;
}

export interface FakeBusiness {
  /** Permanent registry number (displayed as "fake business 001"). Never reused. */
  number: number;
  /** Root path of the fake site, e.g. '/wewantdeadpeople'. Permanent. */
  route: string;
  /** Display URL shown on ads/cards, e.g. 'fattamano.com/wewantdeadpeople'. */
  destination: string;
  /** Fake company name. */
  name: string;
  /** Short form for link clusters, e.g. 'Oops' -> 'Oops site'. */
  shortName: string;
  /** Fake industry, e.g. 'funeral home / crematory'. */
  label: string;
  /** The ad's tagline. */
  tagline: string;
  /** One-paragraph description used on the archive card. */
  description: string;
  theme: CampaignTheme;
  /** 25-cell pseudo-QR pattern (indices of filled cells in a 5x5 grid). */
  qr: number[];
  /** Real product that proves this fake business exists, if one is for sale. */
  productRoute?: string;
  /** CTA label for the product link, e.g. 'Buy evidence this funeral home exists'. */
  productCta?: string;
}

export const fakeBusinesses: FakeBusiness[] = [
  {
    number: 1,
    route: '/wewantdeadpeople',
    destination: 'fattamano.com/wewantdeadpeople',
    name: 'Dead People Wanted',
    shortName: 'Dead People',
    label: 'funeral home / crematory',
    tagline: "You've got dead people. We want dead people.",
    description:
      'A suspiciously calm funeral-home ad for logistics language, AI condolences, and businesses named by a procurement bot with no sense of mortality.',
    theme: {
      bg: 'bg-ft-ink',
      accent: 'text-ft-splash',
      button: 'bg-ft-splash text-ft-ink',
    },
    qr: [0, 1, 2, 5, 7, 10, 11, 12, 14, 16, 18, 19, 20, 22, 24],
    productRoute: '/things/dead-people-wanted-sticker',
    productCta: 'Buy evidence this funeral home exists',
  },
  {
    number: 2,
    route: '/samedeckpartners',
    destination: 'fattamano.com/samedeckpartners',
    name: 'SameDeck Partners',
    shortName: 'SameDeck',
    label: 'transformation consultancy',
    tagline: 'Your company is unique. Our recommendation is not.',
    description:
      'A fake advisory firm for the consultancy cycle that sold everyone a Single Source of Truth, then came back with a Single Source of Warmth™.',
    theme: {
      bg: 'bg-[#07111f]',
      accent: 'text-[#5eead4]',
      button: 'bg-[#5eead4] text-[#07111f]',
    },
    qr: [0, 1, 2, 4, 5, 7, 9, 10, 12, 13, 15, 16, 18, 20, 22, 23, 24],
    productRoute: '/things/samedeck-partners-sticker',
    productCta: 'Buy evidence this consultancy exists',
  },
  {
    number: 3,
    route: '/oopsallcompliance',
    destination: 'fattamano.com/oopsallcompliance',
    name: 'Oops! All Compliance',
    shortName: 'Oops',
    label: 'risk theater / policy snacks',
    tagline: 'Making sure nothing happens, correctly.',
    description:
      'A cereal-box-colored compliance firm for teams that need guardrails, governance, and one more annual training everyone clicks through too fast.',
    theme: {
      bg: 'bg-[#ef2b2d]',
      accent: 'text-[#ffe96b]',
      button: 'bg-[#ffe96b] text-[#151515]',
    },
    qr: [0, 1, 2, 4, 6, 7, 9, 10, 12, 13, 14, 17, 19, 20, 22, 23, 24],
  },
  {
    number: 4,
    route: '/burialcoin',
    destination: 'fattamano.com/burialcoin',
    name: 'BurialCoin',
    shortName: 'BurialCoin',
    label: 'post-life fintech',
    tagline: 'The future of post-life liquidity.',
    description:
      'A crypto-adjacent estate product for people who looked at probate and thought: what if this also had a Discord?',
    theme: {
      bg: 'bg-[#06130d]',
      accent: 'text-[#d6a73a]',
      button: 'bg-[#d6a73a] text-[#06130d]',
    },
    qr: [0, 1, 2, 5, 6, 8, 10, 11, 12, 15, 16, 18, 20, 21, 22, 24],
  },
  {
    number: 5,
    route: '/modelcitizenai',
    destination: 'fattamano.com/modelcitizenai',
    name: 'Model Citizen AI',
    shortName: 'Model Citizen',
    label: 'responsible AI / irresponsible deadlines',
    tagline: 'Responsible AI for irresponsible deadlines.',
    description:
      'An enterprise AI vendor promising governance, productivity, and legally reviewable magic from a chatbot that confidently skimmed the meeting notes.',
    theme: {
      bg: 'bg-[#0f172a]',
      accent: 'text-[#a5b4fc]',
      button: 'bg-[#a5b4fc] text-[#0f172a]',
    },
    qr: [0, 2, 3, 4, 5, 7, 8, 11, 12, 13, 15, 17, 18, 19, 21, 23, 24],
  },
  {
    number: 6,
    route: '/sightunseenaerials',
    destination: 'fattamano.com/sightunseenaerials',
    name: 'Sight Unseen Aerials',
    shortName: 'Sight Unseen',
    label: 'autonomous drone photography',
    tagline: 'Drone photography by feel, firmware, and a legally required visual observer.',
    description:
      'A fake aerial-photo company run by a blind founder, a nervous spotter, and a drone that trusts automation more than anyone should.',
    theme: {
      bg: 'bg-[#075985]',
      accent: 'text-[#7dd3fc]',
      button: 'bg-[#7dd3fc] text-[#07111f]',
    },
    qr: [0, 1, 3, 4, 6, 8, 9, 10, 12, 14, 16, 17, 20, 21, 22, 24],
  },
  {
    number: 7,
    route: '/localcopydepartment',
    destination: 'fattamano.com/localcopydepartment',
    name: 'Local Copy Department',
    shortName: 'Local Copy',
    label: 'physical media infrastructure',
    tagline: "If you can hold it, they can't sunset it.",
    description:
      'A fake anti-cloud office selling useful 3D printed infrastructure for USB drives, DVDs, CDs, and other things cloud services would prefer you forgot how to own.',
    theme: {
      bg: 'bg-[#18253a]',
      accent: 'text-[#ffd84d]',
      button: 'bg-[#ffd84d] text-[#18253a]',
    },
    qr: [0, 1, 2, 3, 5, 7, 8, 10, 12, 13, 14, 16, 17, 19, 21, 22, 23, 24],
    productRoute: '/things/the-cloud-locally-hosted',
    productCta: 'Buy the evidence: The Cloud, Locally Hosted',
  },
  {
    number: 8,
    route: '/alwayswatch',
    destination: 'fattamano.com/alwayswatch',
    name: 'AlwaysWatch',
    shortName: 'AlwaysWatch',
    label: 'surveillance exception products',
    tagline: "Privacy is just data we haven't processed yet.",
    description:
      'A fictional surveillance vendor offering the Blind Spot Vault: useful 3D printed floppy and CD password records for information too important to upload.',
    theme: {
      bg: 'bg-[#07111f]',
      accent: 'text-[#61ffd6]',
      button: 'bg-[#61ffd6] text-[#07111f]',
    },
    qr: [0, 1, 2, 4, 6, 8, 10, 11, 12, 14, 16, 18, 19, 20, 22, 23, 24],
  },
];

export function getCampaignByRoute(route: string): FakeBusiness | undefined {
  return fakeBusinesses.find((c) => c.route === route);
}

/** Campaigns that currently have a real product for sale. */
export function campaignsWithProducts(): FakeBusiness[] {
  return fakeBusinesses.filter((c) => Boolean(c.productRoute));
}

/**
 * Deterministic "random" fake business for 404s and such: rotates daily so the
 * joke stays fresh without needing randomness at request time on a static page.
 */
export function fakeBusinessOfTheDay(date = new Date()): FakeBusiness {
  const dayIndex = Math.floor(date.getTime() / 86_400_000);
  return fakeBusinesses[dayIndex % fakeBusinesses.length];
}

export function formatBusinessNumber(n: number): string {
  return String(n).padStart(3, '0');
}
