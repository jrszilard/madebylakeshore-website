import { getCliClient } from 'sanity/cli';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const client = getCliClient({ apiVersion: '2024-01-01' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.resolve(__dirname, '../../content-drafts/hbp-collections/images');

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
    'hbp-collections-featured.png',
    'HBP Collections pathway UI showing progress tracking, table of contents, and a task completion modal'
  );

  const gallery = [
    await uploadImage(
      '01-collections-single-view.png',
      'HBP Collections pathway page: "Stop Bias from Damaging Your Customer Service"'
    ),
  ];

  console.log('Creating case study document...');

  const doc = {
    _type: 'caseStudy',
    title: 'HBP Collections',
    slug: { _type: 'slug', current: 'hbp-collections' },
    author: [{ _type: 'reference', _ref: CONSULTANT_REF, _key: key() }],
    client: 'Harvard Business Publishing',
    category: 'design',
    serviceAreas: ['product-design'],
    featured: false,
    featuredImage,
    gallery,
    excerpt:
      'I owned the design system for HBP Collections: a shared component library and set of interaction patterns that let teams ship new learning pathways without rebuilding the same UI from scratch every time.',
    challenge: [
      block(
        'Without a shared system, every new Collection, a curated pathway of learning content like articles, tasks, and progress tracking, meant designing and building its own version of the same patterns: progress bars, table-of-contents navigation, task cards, completion states. Teams were solving the same interface problems repeatedly instead of building on shared work, which slowed down how quickly new Collections could ship.'
      ),
    ],
    solution: [
      block(
        'I owned the design system end to end: the component library and the interaction patterns that held it together. That meant defining, once, how progress gets tracked and displayed, how a pathway\'s table of contents behaves as items are completed, how task cards present an article, video, or exercise alongside its time estimate and status, and how a completion state (a "Mark Complete" action, a checkmark, a modal reflection prompt) behaves consistently everywhere it appears.'
      ),
      block(
        'A Collection like "Stop Bias from Damaging Your Customer Service" shows the system in practice: a progress bar tracking completion, a persistent table of contents, sequential pathway steps built from the same task-card pattern, and a modal task overlay for reflection prompts, all built from the shared library rather than assembled one-off.'
      ),
    ],
    results: [
      block(
        'With the component library and interaction patterns established, teams could assemble new Collections from existing, tested pieces instead of designing and building each pattern again. That\'s the direct payoff of a design system: the first Collection is slow because you\'re building the patterns; every one after it is fast because you\'re reusing them.'
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
