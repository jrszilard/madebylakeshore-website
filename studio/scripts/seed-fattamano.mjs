#!/usr/bin/env node
import { createClient } from '@sanity/client';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const replaceProducts = args.has('--replace-products');
const updateProducts = args.has('--update-products') || replaceProducts;
const seedPathArg = process.argv.find((arg) => arg.startsWith('--file='));
const seedPath = seedPathArg
  ? path.resolve(seedPathArg.slice('--file='.length))
  : path.resolve('content/fattamano-seed.json');
const seedDir = path.dirname(seedPath);

const projectId =
  process.env.SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  process.env.PUBLIC_SANITY_PROJECT_ID ||
  'pp3625pq';
const dataset =
  process.env.SANITY_DATASET ||
  process.env.SANITY_STUDIO_DATASET ||
  process.env.PUBLIC_SANITY_DATASET ||
  'production';
const token = process.env.SANITY_API_TOKEN || process.env.SANITY_WRITE_TOKEN;

function usage() {
  console.log(`
Seed fattamano settings and starter product documents in Sanity.

Usage:
  npm run seed:fattamano -- --dry-run
  SANITY_API_TOKEN=... npm run seed:fattamano -- --apply
  SANITY_API_TOKEN=... npm run seed:fattamano -- --apply --update-products
  SANITY_API_TOKEN=... npm run seed:fattamano -- --apply --replace-products

Options:
  --apply             Write to Sanity. Without this flag the script only prints the plan.
  --update-products   Create or replace seed product docs. Without this, products are create-if-missing.
  --replace-products  Delete existing fattamanoProduct docs before creating seed products.
  --file=PATH         Use a custom seed JSON file. Defaults to content/fattamano-seed.json.

Environment:
  SANITY_API_TOKEN    Token with write access. Required for --apply.
  SANITY_PROJECT_ID   Defaults to pp3625pq.
  SANITY_DATASET      Defaults to production.
`);
}

function slugify(input) {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

function keyify(input, index) {
  return `${slugify(input || 'image')}-${index}`.replace(/-/g, '').slice(0, 24) || `image${index}`;
}

function block(text) {
  return {
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [
      {
        _type: 'span',
        marks: [],
        text,
      },
    ],
  };
}

function blocks(lines = []) {
  return lines.filter(Boolean).map(block);
}

function resolveImagePath(imagePath) {
  if (!imagePath) return null;
  return path.isAbsolute(imagePath) ? imagePath : path.resolve(seedDir, imagePath);
}

async function fileExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

function makeSettings(settings) {
  return {
    _id: 'fattamanoSettings',
    _type: 'fattamanoSettings',
    heroHeadline: settings.heroHeadline,
    heroSubcopy: settings.heroSubcopy,
    aboutBody: blocks(settings.aboutBody),
    footerCopy: settings.footerCopy,
    notFoundCopy: blocks(settings.notFoundCopy),
    contactEmail: settings.contactEmail,
  };
}

function baseProduct(product, index) {
  const slug = product.slug || slugify(product.title);
  return {
    _id: `fattamano-product-${slug}`,
    _type: 'fattamanoProduct',
    title: product.title,
    slug: { _type: 'slug', current: slug },
    tagline: product.tagline,
    description: blocks(product.description),
    category: product.category || 'other',
    priceCents: product.priceCents,
    priceDisplayOverride: product.priceDisplayOverride,
    buyUrl: product.buyUrl,
    status: product.status || 'concept',
    dateAdded: product.dateAdded || new Date(Date.now() - index * 60_000).toISOString(),
    featured: Boolean(product.featured),
    tags: product.tags || [],
    seo: product.seo,
  };
}

function normalizedImages(product) {
  return (product.imagePaths || []).map((entry, index) => {
    const image = typeof entry === 'string' ? { path: entry } : entry;
    const resolvedPath = resolveImagePath(image.path);
    return {
      ...image,
      resolvedPath,
      index,
    };
  });
}

async function uploadImages(client, product) {
  const images = normalizedImages(product);
  const uploaded = [];

  for (const image of images) {
    if (!(await fileExists(image.resolvedPath))) {
      throw new Error(`Image not found for ${product.title}: ${image.resolvedPath}`);
    }

    const filename = path.basename(image.resolvedPath);
    console.log(`  uploading image: ${filename}`);
    const asset = await client.assets.upload('image', createReadStream(image.resolvedPath), {
      filename,
      title: image.caption || `${product.title} image ${image.index + 1}`,
    });

    uploaded.push({
      _type: 'figure',
      _key: keyify(`${product.title}-${filename}`, image.index),
      asset: {
        _type: 'reference',
        _ref: asset._id,
      },
      alt: image.alt || product.title,
      caption: image.caption,
    });
  }

  return uploaded;
}

const seed = JSON.parse(await fs.readFile(seedPath, 'utf8'));
const settingsDoc = makeSettings(seed.settings || {});
const products = seed.products || [];
const productDocs = products.map(baseProduct);

console.log(`fattamano seed plan`);
console.log(`- project: ${projectId}`);
console.log(`- dataset: ${dataset}`);
console.log(`- file: ${seedPath}`);
console.log(`- mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
console.log(`- replace products: ${replaceProducts ? 'yes' : 'no'}`);
console.log(`- update products: ${updateProducts ? 'yes' : 'no'}`);
console.log(`- settings doc: ${settingsDoc._id}`);
console.log(`- product docs: ${productDocs.length}`);

for (let i = 0; i < products.length; i += 1) {
  const doc = productDocs[i];
  const imagePlan = normalizedImages(products[i]);
  console.log(`  • ${doc._id} (${doc.status}, ${doc.category}) — ${imagePlan.length} image(s)`);
  for (const image of imagePlan) {
    const exists = await fileExists(image.resolvedPath);
    console.log(`      ${exists ? '✓' : '✗'} ${image.resolvedPath}`);
  }
}

if (args.has('--help') || args.has('-h')) {
  usage();
  process.exit(0);
}

if (!apply) {
  console.log('\nDry run only. Re-run with --apply and SANITY_API_TOKEN to write documents and upload images.');
  process.exit(0);
}

if (!token) {
  console.error('\nERROR: SANITY_API_TOKEN or SANITY_WRITE_TOKEN is required when using --apply.');
  usage();
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
});

console.log('\nUploading images and preparing documents...');
const docsWithImages = [];
for (let i = 0; i < products.length; i += 1) {
  const product = products[i];
  const doc = productDocs[i];
  const images = await uploadImages(client, product);
  docsWithImages.push({ ...doc, images });
}

let transaction = client.transaction().createOrReplace(settingsDoc);

if (replaceProducts) {
  const existingProductIds = await client.fetch('*[_type == "fattamanoProduct"]._id');
  for (const id of existingProductIds) {
    transaction = transaction.delete(id);
  }
}

for (const doc of docsWithImages) {
  transaction = updateProducts
    ? transaction.createOrReplace(doc)
    : transaction.createIfNotExists(doc);
}

const result = await transaction.commit();
console.log(`\nSeed complete. Transaction id: ${result.transactionId || 'unknown'}`);
console.log('Next: open Studio → fattamano workspace → review images, copy, status, prices, and buy URLs.');
