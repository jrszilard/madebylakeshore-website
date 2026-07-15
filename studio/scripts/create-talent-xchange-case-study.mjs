import { getCliClient } from 'sanity/cli';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const client = getCliClient({ apiVersion: '2024-01-01' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.resolve(__dirname, '../../content-drafts/talent-xchange/images');

const CONSULTANT_REF = '4007f512-5725-4910-8cc6-90775cc34b06'; // Wilma

function key() {
  return Math.random().toString(36).slice(2, 14);
}

function block(text) {
  return {
    _key: key(),
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [{ _key: key(), _type: 'span', marks: [], text }],
  };
}

async function uploadImage(filename, alt) {
  const filePath = path.join(IMAGES_DIR, filename);
  const asset = await client.assets.upload('image', fs.createReadStream(filePath), {
    filename,
  });
  return {
    _type: 'figure',
    _key: key(),
    asset: { _type: 'reference', _ref: asset._id },
    alt,
  };
}

async function run() {
  console.log('Uploading images...');

  const featuredImage = await uploadImage(
    'talent-xchange-featured.png',
    'TalentXchange logo on a diagonal navy, violet, and orange brand banner'
  );

  const gallery = [
    await uploadImage(
      '01-linkedin-header-dots.png',
      'TalentXchange logo on a white background with a purple circle and orange dot grid'
    ),
    await uploadImage(
      '02-color-range-wordmark.png',
      'TalentXchange wordmark tested across six brand colors'
    ),
    await uploadImage(
      '03-identity-concept-board.png',
      'TalentXchange identity concept board showing wordmark, typography, shape system, and color palette'
    ),
    await uploadImage(
      '04-company-profile-template.png',
      "TalentXchange company profile template featuring the brand's geometric pattern system"
    ),
  ];

  console.log('Creating case study document...');

  const doc = {
    _type: 'caseStudy',
    title: 'TalentXchange',
    slug: { _type: 'slug', current: 'talent-xchange' },
    author: [{ _type: 'reference', _ref: CONSULTANT_REF, _key: key() }],
    client: 'TalentXchange',
    category: 'design',
    serviceAreas: ['brand-identity'],
    featured: false,
    featuredImage,
    gallery,
    excerpt:
      "A ground-up brand identity, including the wordmark, color system, and a geometric shape language, built to make TalentXchange's new staffing platform feel established from day one.",
    challenge: [
      block(
        "Launching a new platform inside an established industry is a credibility problem before it's a design problem. TalentXchange needed to feel like it had been in the market for years: trustworthy enough for candidates to hand over their careers to, and established enough for client companies to bet their hiring on, despite being brand new. A generic \"startup\" look would undercut that trust before a single conversation happened. The identity needed to project stability and confidence from the very first impression: the logo, the LinkedIn header, the first deck a prospective client opened."
      ),
    ],
    solution: [
      block(
        'I built the identity around a single simple move: an unmistakable wordmark and a color and shape system versatile enough to carry it everywhere the brand needed to show up.'
      ),
      block(
        'The wordmark stacks "talent" over "Xchange," with the capital X doing double duty: it\'s the visual anchor of the mark and a literal nod to the exchange at the center of the business. From there, I developed a bold, saturated palette (deep navy, violet, warm cream, and a high-energy orange, with teal and black as supporting players) that reads as confident rather than corporate-safe, a deliberate departure from the muted, interchangeable palettes that dominate staffing and recruiting brands.'
      ),
      block(
        'Around that core, I built a geometric shape language (circles, arcs, dot grids, diamonds, capsule forms) that gives the brand room to flex across formats without ever feeling improvised. The same shapes that split a LinkedIn header on a diagonal also structure a company profile deck, so every touchpoint feels like it belongs to the same system, whether it\'s a recruiter\'s social banner or a boardroom pitch.'
      ),
      block(
        'I explored multiple directions before landing on this system, and stress-tested the wordmark across a full color range to confirm it held up on any background before finalizing the palette.'
      ),
    ],
    results: [
      block(
        'The finished system gave TalentXchange a full identity toolkit: a logo tested across its color range, a distinct shape language, and ready-to-use templates (LinkedIn headers, company profile decks) that let the team produce new brand-consistent materials without needing design support for every asset. The result reads as an established company, not a startup finding its footing, which is exactly the credibility problem the identity needed to solve.'
      ),
    ],
    publishedAt: new Date().toISOString(),
    isProtected: false,
  };

  const created = await client.create(doc);
  console.log(`Done: created case study "${created.title}" (${created._id})`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
