#!/usr/bin/env node
/**
 * One-off data patch: set the `campaign` field on the fattamano products that
 * advertise Real Fake Ads fake businesses.
 *
 * The `campaign` schema field replaced the hardcoded slug list in
 * apps/fattamano/src/pages/things/[slug].astro, so until products carry the
 * value their acquisition note disappears. This script restores the mapping
 * and wires The Cloud, Locally Hosted to Local Copy Department for the first
 * time. Values must match routes in apps/fattamano/src/lib/campaigns.ts.
 *
 * Usage:
 *   npm run set:fattamano-campaigns -- --dry-run
 *   SANITY_API_TOKEN=... npm run set:fattamano-campaigns -- --apply
 */
import { createClient } from '@sanity/client';
import process from 'node:process';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');

const MAPPING = [
  { slug: 'dead-people-wanted-sticker', campaign: 'wewantdeadpeople' },
  { slug: 'samedeck-partners-sticker', campaign: 'samedeckpartners' },
  { slug: 'the-cloud-locally-hosted', campaign: 'localcopydepartment' },
];

const projectId =
  process.env.SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset =
  process.env.SANITY_DATASET ||
  process.env.SANITY_STUDIO_DATASET ||
  process.env.PUBLIC_SANITY_DATASET ||
  'production';
const token =
  process.env.SANITY_API_TOKEN ||
  process.env.SANITY_WRITE_TOKEN ||
  process.env.SANITY_EDITOR_API_TOKEN;

if (!projectId) {
  console.error('Missing SANITY_STUDIO_PROJECT_ID (load studio/.env first).');
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  token: apply ? token : undefined,
  useCdn: false,
});

const slugs = MAPPING.map((m) => m.slug);
const products = await client.fetch(
  `*[_type == "fattamanoProduct" && slug.current in $slugs]{ _id, title, "slug": slug.current, campaign }`,
  { slugs },
);

console.log(apply ? 'APPLYING campaign mapping:' : 'DRY RUN — campaign mapping plan:');
for (const entry of MAPPING) {
  const product = products.find((p) => p.slug === entry.slug);
  if (!product) {
    console.log(`  !! no product found for slug "${entry.slug}" — skipping`);
    continue;
  }
  const current = product.campaign ?? '(unset)';
  const verb = product.campaign === entry.campaign ? 'already ok' : `${current} -> ${entry.campaign}`;
  console.log(`  ${product.title} [${product._id}]: ${verb}`);
}

if (!apply) {
  console.log('\nDry run only. Re-run with --apply to write.');
  process.exit(0);
}

if (!token) {
  console.error('Missing write token (SANITY_API_TOKEN / SANITY_EDITOR_API_TOKEN).');
  process.exit(1);
}

for (const entry of MAPPING) {
  const product = products.find((p) => p.slug === entry.slug);
  if (!product || product.campaign === entry.campaign) continue;
  await client.patch(product._id).set({ campaign: entry.campaign }).commit();
  console.log(`  patched ${product.title}`);
}
console.log('Done.');
