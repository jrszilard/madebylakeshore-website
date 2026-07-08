export interface FattamanoNote {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  date: string;
  tags: string[];
  body: string[];
  cta?: {
    label: string;
    href: string;
  };
}

export const notes: FattamanoNote[] = [
  {
    slug: 'real-fake-ads-real-stickers-for-fake-companies',
    title: 'Real Fake Ads: real stickers for fake companies',
    description:
      'A short explanation of Real Fake Ads, the fattamano collection of handmade stickers that advertise fictional companies with actual fake websites.',
    eyebrow: 'field note / public mischief',
    date: '2026-07-08',
    tags: ['real fake ads', 'fake company stickers', 'handmade stickers'],
    body: [
      'Real Fake Ads is a collection of real physical stickers for fake companies. The sticker is the ad. The business is fictional. The website is real enough to become inconvenient.',
      'Each campaign starts like a tiny local ad that escaped from a newspaper, procurement deck, or compliance training slide. Dead People Wanted looks like a funeral-home flyer. SameDeck Partners looks like a consultancy that has already billed you for the same recommendation twice. Model Citizen AI promises responsible AI for irresponsible deadlines because of course it does.',
      'The joke works best when the sticker leaves the store and enters the world. A QR code or URL sends the curious person to a complete fake-company page, where the premise keeps going. It is a product, a prop, and a small act of public storytelling.',
      'Search engines may call this “novelty stickers” or “satire merchandise.” We call it evidence that a company should not exist, but somehow has collateral.'
    ],
    cta: {
      label: 'Browse the Real Fake Ads archive',
      href: '/things/real-fake-ads',
    },
  },
  {
    slug: 'why-buy-a-sticker-for-a-company-that-does-not-exist',
    title: 'Why buy a sticker for a company that does not exist?',
    description:
      'Why fake-company stickers work as jokes, tiny stories, laptop decoration, and handmade satire objects.',
    eyebrow: 'acquisition memo / questionable commerce',
    date: '2026-07-08',
    tags: ['satire stickers', 'funny stickers', 'fake ads'],
    body: [
      'A sticker for a real company usually says you belong to something. A sticker for a fake company says you have questions about why everything sounds like a real company now.',
      'That is the useful part. Fake-company stickers make corporate language visible by pushing it half an inch too far. “Your company is unique. Our recommendation is not.” is funny because it is fake, and also because everyone has heard the real version in a conference room with bad coffee.',
      'The sticker becomes a portable punchline. Put it on a laptop, water bottle, notebook, toolbox, or cash register and it starts a small investigation: Is that real? Why does it sound real? Should I scan this? The answer is usually no, yes, and unfortunately yes.',
      'Fattamano makes these as small-batch handmade objects, not mass-market brand merch. The point is not to join a fandom. The point is to carry around a tiny fake ad for a world that is already advertising at you too much.'
    ],
    cta: {
      label: 'Buy a fake ad sticker',
      href: '/things/dead-people-wanted-sticker',
    },
  },
  {
    slug: 'handmade-satire-stickers-from-new-hampshire',
    title: 'Handmade satire stickers from New Hampshire',
    description:
      'Fattamano makes small-batch handmade stickers, including Real Fake Ads, from the Design & Other Stories side room in New Hampshire.',
    eyebrow: 'local file / human-made nonsense',
    date: '2026-07-08',
    tags: ['New Hampshire handmade stickers', 'small batch stickers', 'artist made gifts'],
    body: [
      'Fattamano is the strange little side room of Design & Other Stories: handmade objects, phrases, stickers, shirts, prints, and small jokes that did not want to stand politely next to the paintings.',
      'The work is made in small batches by Wilma Bonilla, with a website arranged by machines that have been asked to remember the old internet. The result is part handmade shop, part fake boutique, part catalog for ideas that are too dumb or too specific to become a normal product line.',
      'If you are looking for handmade stickers in New Hampshire, this is not the tidy craft-fair version of that sentence. It is the one with fake funeral homes, fake consulting firms, AI governance jokes, and product descriptions that are overqualified for adhesive paper.',
      'That is the point. Fattamano is human-made, locally weird, and intentionally hard to flatten into a platform category.'
    ],
    cta: {
      label: 'Enter the unoptimized catalog',
      href: '/things',
    },
  },
];

export function getNoteBySlug(slug: string) {
  return notes.find((note) => note.slug === slug);
}
