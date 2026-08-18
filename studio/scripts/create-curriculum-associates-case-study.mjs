import { getCliClient } from 'sanity/cli';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const client = getCliClient({ apiVersion: '2024-01-01' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.resolve(__dirname, '../../content-drafts/curriculum-associates/images');

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
    'curriculum-associates-featured.png',
    'Curriculum Associates corporate website homepage featuring i-Ready'
  );

  console.log('Creating case study document...');

  const doc = {
    _type: 'caseStudy',
    title: 'Curriculum Associates',
    slug: { _type: 'slug', current: 'curriculum-associates' },
    author: [{ _type: 'reference', _ref: CONSULTANT_REF, _key: key() }],
    client: 'Curriculum Associates',
    category: 'design',
    serviceAreas: ['product-design'],
    featured: false,
    featuredImage,
    excerpt:
      'As Marketing UX Designer at Curriculum Associates, I led UX/UI modernization of the corporate website, working within the Digital Marketing team to turn stakeholder requirements into shipped, accessible, tested features.',
    challenge: [
      block(
        "The corporate website needed a UX/UI refresh. The existing site no longer matched the brand or what visitors expected from an education technology company, and any changes had to move through the Digital Marketing team's approval process, which meant translating business goals into user stories stakeholders could actually sign off on before anything shipped."
      ),
    ],
    solution: [
      block(
        'Working within the Digital Marketing team, I led UX/UI enhancements across the corporate website, turning stakeholder requirements into user stories and design decisions that moved through an agile sprint cycle rather than sitting in review indefinitely.'
      ),
      block(
        'Two threads ran alongside the visual modernization work. The first was accessibility: I identified and remediated issues to bring the site in line with WCAG standards, treating accessibility as a design requirement rather than a post-launch fix. The second was testing: I ran A/B testing experiments aimed at reducing bounce rate, using real user behavior to validate or challenge design decisions instead of relying on opinion alone. I also supported QA through each sprint release, staying close to how design decisions actually shipped rather than handing off and moving on.'
      ),
    ],
    results: [
      block(
        'The result was a corporate website that read as current rather than dated, backed by a documented, accessible foundation and a testing habit that kept design decisions grounded in real user behavior rather than assumption.'
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
