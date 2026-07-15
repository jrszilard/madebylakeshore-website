import { getCliClient } from 'sanity/cli';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const client = getCliClient({ apiVersion: '2024-01-01' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.resolve(__dirname, '../../content-drafts/fusion-cell/images');

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
    'fusion-cell-featured.png',
    'Fusion Cell logo tested across six brand color backgrounds'
  );

  const gallery = [
    await uploadImage('01-trifold-brochure.png', 'Fusion Cell trifold brochure: For Clients and For Candidates'),
    await uploadImage('02-merch.png', 'Fusion Cell branded merch: hoodie and cap'),
    await uploadImage('03-one-pager.jpg', 'Fusion Cell one-page leave-behind: Driving Business Growth with Military Talent'),
    await uploadImage('04-digital-ad.png', 'Fusion Cell digital ad: Transitioning Military Veterans into Civilian Careers'),
  ];

  console.log('Creating case study document...');

  const doc = {
    _type: 'caseStudy',
    title: 'Fusion Cell',
    slug: { _type: 'slug', current: 'fusion-cell' },
    author: [{ _type: 'reference', _ref: CONSULTANT_REF, _key: key() }],
    client: 'Fusion Cell',
    category: 'design',
    serviceAreas: ['brand-identity'],
    featured: false,
    featuredImage,
    gallery,
    excerpt:
      'A brand identity for a staffing organization that transitions U.S. military veterans into civilian careers, built to honor that military connection without leaning on cliché.',
    challenge: [
      block(
        'Military-adjacent brands have an obvious visual shortcut: eagles, flags, camouflage. Fusion Cell needed the opposite. The identity had to make the veteran connection immediately clear while speaking credibly to two very different audiences at once: companies deciding whether to trust their hiring to this firm, and transitioning service members deciding whether to trust their next career to it. A generic patriotic look would have undercut both conversations before they started.'
      ),
    ],
    solution: [
      block(
        "The mark is a Corinthian war helmet, a symbol of discipline, readiness, and unit cohesion rather than borrowed Americana. Paired with a bold, condensed all-caps wordmark, it reads as confident and disciplined without defaulting to the visual clichés the category is full of. I built the palette and mark to hold up across a wide range of applications, from a charcoal or black background to warm tan and cream, so the same logo stays legible whether it's on a construction-site one-pager or a hoodie."
      ),
      block(
        'From there, the identity extended into a full set of working materials: a trifold brochure splitting the pitch between "For Clients" and "For Candidates," a matching one-page leave-behind, and branded merch (hoodie, cap) that let the Fusion Cell team wear the brand at the job fairs and base visits where a lot of their candidate outreach actually happens.'
      ),
    ],
    results: [
      block(
        'The finished system gave Fusion Cell a cohesive identity across every format the business actually uses day to day: pitch materials for companies, recruiting materials for candidates, and wearable merch for in-person outreach, all recognizably the same brand rather than a logo bolted onto whatever format came up that week.'
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
