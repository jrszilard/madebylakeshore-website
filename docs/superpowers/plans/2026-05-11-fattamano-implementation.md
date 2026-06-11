# fattamano Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [`../specs/2026-05-11-fattamano-design.md`](../specs/2026-05-11-fattamano-design.md)

**Goal:** Ship `fattamano.com` — a new sibling Astro app in this monorepo selling handmade stickers/shirts/prints with platform-agnostic checkout, surfaced from DAOS via two subtle easter eggs.

**Architecture:** Static-mostly Astro app at `apps/fattamano/` (hybrid mode for OG image route), shared Sanity backend with new workspace + document types, deployed independently on Vercel. DAOS gets two new affordances (footer link + clickable artwork signature) but is otherwise untouched.

**Tech Stack:** Astro 4, React 18 (islands only), Tailwind CSS 3 (`ft-*` brand tokens), Sanity v5 (shared project, new workspace), Vercel hybrid deploy, satori for dynamic OG images.

**Verification convention:** This codebase has no unit test framework. Verification = `astro check` (typecheck) + `astro build` (build success) + `astro dev` visual smoke check at specified URLs + Sanity studio loading the schema. The plan calls out the exact command and expected outcome for each step.

**Commit style:** Match recent history — `feat(fattamano): ...`, `feat(daos): ...`, `feat(studio): ...` scopes.

---

## Task 1: Scaffold the fattamano app skeleton

Create a working Astro app at `apps/fattamano/` that renders a placeholder home page. No Sanity content yet — just the shell, brand tokens, and base layout. This is the foundation everything else builds on.

**Files:**
- Create: `apps/fattamano/package.json`
- Create: `apps/fattamano/astro.config.mjs`
- Create: `apps/fattamano/tailwind.config.mjs`
- Create: `apps/fattamano/tsconfig.json`
- Create: `apps/fattamano/vercel.json`
- Create: `apps/fattamano/src/env.d.ts`
- Create: `apps/fattamano/src/styles/global.css`
- Create: `apps/fattamano/src/layouts/BaseLayout.astro`
- Create: `apps/fattamano/src/components/Navigation.astro`
- Create: `apps/fattamano/src/components/Footer.astro`
- Create: `apps/fattamano/src/pages/index.astro`
- Modify: `package.json` (root — add `dev:fattamano` + `build:fattamano` scripts)

- [ ] **Step 1: Create `apps/fattamano/package.json`**

```json
{
  "name": "fattamano",
  "type": "module",
  "version": "1.0.0",
  "scripts": {
    "dev": "astro dev --port 4324",
    "start": "astro dev",
    "build": "astro check && astro build",
    "preview": "astro preview",
    "astro": "astro"
  },
  "dependencies": {
    "@astrojs/check": "^0.5.0",
    "@astrojs/react": "^3.1.0",
    "@astrojs/sitemap": "3.6.0",
    "@astrojs/tailwind": "^5.1.0",
    "@astrojs/vercel": "^7.8.2",
    "@lakeshore/shared-ui": "*",
    "@sanity/client": "^6.15.0",
    "@sanity/image-url": "^1.0.2",
    "astro": "^4.5.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "satori": "^0.26.0",
    "satori-html": "^0.3.2",
    "sharp": "^0.34.5",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0"
  },
  "devDependencies": {
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3"
  }
}
```

Note: includes `satori`/`sharp`/`vercel` since Task 11 needs them for OG image generation. Cheaper to install once than re-add later.

- [ ] **Step 2: Create `apps/fattamano/astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  site: 'https://fattamano.com',
  integrations: [
    tailwind(),
    react(),
    sitemap({
      filter: (page) => !page.includes('/api/'),
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    }),
  ],
  output: 'hybrid',
  adapter: vercel({ maxDuration: 30 }),
  build: { assets: 'assets' },
});
```

- [ ] **Step 3: Create `apps/fattamano/tailwind.config.mjs` with `ft-*` brand tokens**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // fattamano — loud, hand-feel, a little ridiculous
        'ft': {
          'paper': '#FBF9F4',   // warm off-white background
          'ink': '#1A1A1A',     // body text
          'shout': '#FF3D2E',   // punchy red — primary accent
          'splash': '#FFD93D',  // hot yellow — secondary accent
          'sea': '#2E86AB',     // a calm balancing blue
          'olive': '#5C6E3A',   // earthy contrast
          'smudge': '#8A8580',  // muted gray
        }
      },
      fontFamily: {
        'display': ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        'body': ['"Inter"', 'system-ui', 'sans-serif'],
        'hand': ['"Caveat"', 'cursive'],
      },
      fontSize: {
        'huge': ['5rem', { lineHeight: '0.95', letterSpacing: '-0.04em' }],
        'big': ['3rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
      },
      rotate: {
        '1.5': '1.5deg',
        '-1.5': '-1.5deg',
      },
    },
  },
  plugins: [],
};
```

Visual personality is intentionally loose per spec — these tokens give the executor enough to look meaningfully different from DAOS without locking in final design.

- [ ] **Step 4: Create `apps/fattamano/tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@layouts/*": ["src/layouts/*"]
    }
  }
}
```

- [ ] **Step 5: Create `apps/fattamano/vercel.json` (security headers)**

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://cdn.sanity.io data:; connect-src 'self' https://*.sanity.io; frame-ancestors 'none'" }
      ]
    }
  ]
}
```

- [ ] **Step 6: Create `apps/fattamano/src/env.d.ts`**

```ts
/// <reference path="../.astro/types.d.ts" />
```

- [ ] **Step 7: Create `apps/fattamano/src/styles/global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Inter:wght@400;500;700&family=Space+Grotesk:wght@500;700&display=swap');

@layer base {
  body {
    @apply bg-ft-paper text-ft-ink font-body;
  }
  h1, h2, h3 {
    @apply font-display;
  }
}
```

- [ ] **Step 8: Create `apps/fattamano/src/components/Navigation.astro`**

```astro
---
const navItems = [
  { href: '/', label: 'home' },
  { href: '/things', label: 'things' },
  { href: '/about', label: 'about' },
];
---
<nav class="border-b-2 border-ft-ink bg-ft-paper">
  <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
    <a href="/" class="font-display text-2xl tracking-tight">
      <span class="text-ft-shout">fatta</span><span>mano</span>
    </a>
    <ul class="flex gap-6 font-body text-sm">
      {navItems.map(item => (
        <li><a href={item.href} class="hover:text-ft-shout transition-colors">{item.label}</a></li>
      ))}
    </ul>
  </div>
</nav>
```

- [ ] **Step 9: Create `apps/fattamano/src/components/Footer.astro`**

```astro
---
const year = new Date().getFullYear();
---
<footer class="border-t-2 border-ft-ink bg-ft-paper mt-24">
  <div class="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-sm text-ft-smudge">
    <p>
      <span class="font-hand text-ft-ink text-base">fatto a mano</span> &mdash; made by hand, sometimes well
    </p>
    <p>
      &copy; {year} fattamano &middot; part of <a href="https://designandotherstories.com" class="underline hover:text-ft-shout">Design &amp; Other Stories</a>
    </p>
  </div>
</footer>
```

- [ ] **Step 10: Create `apps/fattamano/src/layouts/BaseLayout.astro`**

```astro
---
import '../styles/global.css';
import Navigation from '../components/Navigation.astro';
import Footer from '../components/Footer.astro';

interface Props {
  title: string;
  description?: string;
  ogImagePath?: string;
}

const {
  title,
  description = 'Handmade stickers, t-shirts, and other small ridiculous things.',
  ogImagePath,
} = Astro.props;

const siteTitle = title === 'Home' ? 'fattamano' : `${title} — fattamano`;
const canonical = new URL(Astro.url.pathname, Astro.site).toString();
const ogImage = ogImagePath ?? new URL('/og-default.png', Astro.site).toString();
---
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />

    <meta property="og:title" content={siteTitle} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content="website" />
    <meta property="og:image" content={ogImage} />
    <meta property="og:url" content={canonical} />
    <meta name="twitter:card" content="summary_large_image" />

    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>{siteTitle}</title>
  </head>
  <body class="min-h-screen flex flex-col">
    <Navigation />
    <main class="flex-1">
      <slot />
    </main>
    <Footer />
  </body>
</html>
```

- [ ] **Step 11: Create placeholder `apps/fattamano/src/pages/index.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="Home">
  <section class="max-w-6xl mx-auto px-6 py-24">
    <h1 class="font-display text-huge">
      hi. <span class="text-ft-shout">we make things.</span>
    </h1>
    <p class="mt-6 max-w-xl font-body text-lg text-ft-smudge">
      Stickers, shirts, prints. Mostly stupid, occasionally good. Always by hand.
    </p>
  </section>
</BaseLayout>
```

- [ ] **Step 12: Add root-level npm scripts in `package.json`**

Modify the root `package.json` `scripts` block. Locate the existing scripts and add two new entries alongside the others:

```json
"dev:fattamano": "npm run dev --workspace=apps/fattamano",
"build:fattamano": "npm run build --workspace=apps/fattamano",
```

And update the `build:all` line to include fattamano:

```json
"build:all": "npm run build:mbl && npm run build:daos && npm run build:incubator && npm run build:fattamano",
```

- [ ] **Step 13: Install dependencies**

Run from monorepo root:
```bash
npm install
```
Expected: completes without errors. New workspace `apps/fattamano` is recognized.

- [ ] **Step 14: Verify dev server boots and home page renders**

Run:
```bash
npm run dev:fattamano
```
Expected: server starts on port 4324. Open `http://localhost:4324/` in browser — should see "hi. we make things." headline with shout-red accent on a paper background, navigation bar at top, footer at bottom with "fatto a mano" handwritten phrase. Kill server (Ctrl+C).

- [ ] **Step 15: Verify build succeeds**

Run:
```bash
npm run build:fattamano
```
Expected: `astro check` passes (no type errors), `astro build` completes, output appears in `apps/fattamano/dist/`.

- [ ] **Step 16: Commit**

```bash
git add apps/fattamano/ package.json package-lock.json
git commit -m "feat(fattamano): scaffold new sibling app with ft-* brand tokens

New Astro app at apps/fattamano/ with placeholder home page, Tailwind theme,
base layout, navigation, and footer. Configured for hybrid output on Vercel
to support future OG image route. No Sanity wiring or content yet."
```

---

## Task 2: Add fattamano Sanity schemas

Define the two document types that drive the catalog: `fattamanoProduct` and `fattamanoSettings` (singleton).

**Files:**
- Create: `studio/schemas/documents/fattamanoProduct.ts`
- Create: `studio/schemas/documents/fattamanoSettings.ts`

- [ ] **Step 1: Create `studio/schemas/documents/fattamanoProduct.ts`**

```ts
import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'fattamanoProduct',
  title: 'fattamano Product',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
      description: 'Stable identifier — appears in URLs. Do not change after publishing.',
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      description: 'One-line punchline shown on cards.',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'blockContent',
    }),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [{ type: 'figure' }],
      validation: (Rule) => Rule.required().min(1),
      description: 'First image is used as the card thumbnail.',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Sticker', value: 'sticker' },
          { title: 'Shirt', value: 'shirt' },
          { title: 'Print', value: 'print' },
          { title: 'Other', value: 'other' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'priceCents',
      title: 'Price (cents)',
      type: 'number',
      description: 'Integer cents (e.g., 500 = $5.00). Display-only at v1.',
      validation: (Rule) => Rule.min(0).integer(),
    }),
    defineField({
      name: 'priceDisplayOverride',
      title: 'Price Display Override',
      type: 'string',
      description: 'If set, displayed instead of computed price. E.g., "name your price", "free with order".',
    }),
    defineField({
      name: 'buyUrl',
      title: 'Buy URL',
      type: 'url',
      description: 'Where to actually buy this item. Leave empty to show "DM to buy".',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Available', value: 'available' },
          { title: 'Sold Out', value: 'sold_out' },
          { title: 'Coming Soon', value: 'coming_soon' },
          { title: 'Concept (might make this if there is interest)', value: 'concept' },
        ],
        layout: 'radio',
      },
      initialValue: 'available',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'dateAdded',
      title: 'Date Added',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'featured',
      title: 'Featured on Home',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
    }),
  ],
  orderings: [
    {
      title: 'Date Added, New',
      name: 'dateAddedDesc',
      by: [{ field: 'dateAdded', direction: 'desc' }],
    },
    {
      title: 'Title, A→Z',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'title',
      category: 'category',
      status: 'status',
      media: 'images.0',
    },
    prepare({ title, category, status, media }) {
      const statusLabel = status === 'available' ? '' : ` • ${status}`;
      return {
        title,
        subtitle: `${category || 'uncategorized'}${statusLabel}`,
        media,
      };
    },
  },
});
```

- [ ] **Step 2: Create `studio/schemas/documents/fattamanoSettings.ts`**

```ts
import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'fattamanoSettings',
  title: 'fattamano Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'heroHeadline',
      title: 'Hero Headline',
      type: 'string',
      description: 'Big text on home page.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'heroSubcopy',
      title: 'Hero Subcopy',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'aboutBody',
      title: 'About Body',
      type: 'blockContent',
      description: 'Copy for /about page.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'footerCopy',
      title: 'Footer Copy',
      type: 'string',
      description: 'Small footer phrase. Falls back to "fatto a mano — made by hand, sometimes well" if empty.',
    }),
    defineField({
      name: 'notFoundCopy',
      title: '404 Page Copy',
      type: 'blockContent',
      description: 'Body of the custom 404 page.',
    }),
    defineField({
      name: 'contactEmail',
      title: 'Contact Email',
      type: 'string',
      description: 'For "DM to buy" / inquiries.',
      validation: (Rule) => Rule.required().email(),
    }),
  ],
  preview: {
    prepare: () => ({ title: 'fattamano Settings' }),
  },
});
```

- [ ] **Step 3: Commit schemas (not yet registered)**

```bash
git add studio/schemas/documents/fattamanoProduct.ts studio/schemas/documents/fattamanoSettings.ts
git commit -m "feat(studio): add fattamano product and settings schemas"
```

---

## Task 3: Register fattamano schemas and queries

Wire the new schemas into the studio schema list and add GROQ queries to the shared package.

**Files:**
- Modify: `studio/schemas/index.ts`
- Modify: `packages/shared-ui/src/sanity.ts`

- [ ] **Step 1: Register schemas in `studio/schemas/index.ts`**

Add these imports after the existing "Incubator documents" import block (around line 18):

```ts
// fattamano documents
import fattamanoProduct from './documents/fattamanoProduct';
import fattamanoSettings from './documents/fattamanoSettings';
```

Then add `fattamanoProduct, fattamanoSettings,` to the `schemaTypes` array, placed after `buildLog,` and before the `// Objects` comment:

```ts
  digitalProject,
  buildLog,

  // fattamano documents
  fattamanoProduct,
  fattamanoSettings,

  // Objects
  blockContent,
```

- [ ] **Step 2: Add fattamano queries in `packages/shared-ui/src/sanity.ts`**

Append the following queries to the `queries` object (locate the closing `};` of the `queries` object and add these properties before it):

```ts
  // fattamano queries
  fattamanoSettings: `*[_type == "fattamanoSettings"][0] {
    heroHeadline, heroSubcopy, aboutBody, footerCopy, notFoundCopy, contactEmail
  }`,

  allFattamanoProducts: `*[_type == "fattamanoProduct"] | order(dateAdded desc) {
    _id, title, slug, tagline, images, category, priceCents, priceDisplayOverride,
    buyUrl, status, dateAdded, featured, tags
  }`,

  featuredFattamanoProducts: `*[_type == "fattamanoProduct" && featured == true] | order(dateAdded desc)[0...6] {
    _id, title, slug, tagline, images, category, priceCents, priceDisplayOverride,
    buyUrl, status
  }`,

  fattamanoProductBySlug: `*[_type == "fattamanoProduct" && slug.current == $slug][0] {
    _id, title, slug, tagline, description, images, category, priceCents,
    priceDisplayOverride, buyUrl, status, dateAdded, tags, seo
  }`,

  fattamanoProductsByCategory: `*[_type == "fattamanoProduct" && category == $category] | order(dateAdded desc) {
    _id, title, slug, tagline, images, category, priceCents, priceDisplayOverride,
    buyUrl, status
  }`,
```

- [ ] **Step 3: Verify studio typechecks**

Run from monorepo root:
```bash
npm run build --workspace=studio
```
Expected: builds without TypeScript errors. (If the studio doesn't have a `build` script that fails on TS errors, run `npx tsc --noEmit` from `studio/` to confirm.)

- [ ] **Step 4: Commit**

```bash
git add studio/schemas/index.ts packages/shared-ui/src/sanity.ts
git commit -m "feat(studio): register fattamano schemas and queries"
```

---

## Task 4: Convert sanity.config.ts to workspaces array

Add a second workspace for fattamano so its content is segregated from the main lakeshore-studios studio view, but stays in the same project/dataset.

**Files:**
- Modify: `studio/sanity.config.ts`
- Create: `studio/fattamanoStructure.ts`
- Optionally modify: `studio/structure.ts` (only if needed to scope it)

- [ ] **Step 1: Create `studio/fattamanoStructure.ts`**

```ts
import type { StructureResolver } from 'sanity/structure';

export const fattamanoStructure: StructureResolver = (S) =>
  S.list()
    .title('fattamano')
    .items([
      S.listItem()
        .title('Settings')
        .child(
          S.document()
            .schemaType('fattamanoSettings')
            .documentId('fattamanoSettings')
            .title('Settings')
        ),
      S.divider(),
      S.listItem()
        .title('Products')
        .schemaType('fattamanoProduct')
        .child(
          S.documentTypeList('fattamanoProduct')
            .title('Products')
            .defaultOrdering([{ field: 'dateAdded', direction: 'desc' }])
        ),
    ]);
```

- [ ] **Step 2: Convert `studio/sanity.config.ts` to workspaces**

Replace the current single-config export with the following:

```ts
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemas';
import { structure } from './structure';
import { fattamanoStructure } from './fattamanoStructure';

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'YOUR_PROJECT_ID_HERE';
const dataset = process.env.SANITY_STUDIO_DATASET || 'production';

const mainSchemaTypes = schemaTypes.filter(
  (t) => !String(t.name).startsWith('fattamano')
);
const fattamanoSchemaTypes = schemaTypes.filter(
  (t) => String(t.name).startsWith('fattamano')
);

export default defineConfig([
  {
    name: 'lakeshore-studios',
    title: 'Lakeshore Studios',
    basePath: '/',
    projectId,
    dataset,
    plugins: [structureTool({ structure }), visionTool()],
    schema: { types: mainSchemaTypes },
  },
  {
    name: 'fattamano',
    title: 'fattamano',
    basePath: '/fattamano',
    projectId,
    dataset,
    plugins: [structureTool({ structure: fattamanoStructure }), visionTool()],
    schema: { types: fattamanoSchemaTypes },
    theme: undefined,
  },
]);
```

Note: filtering `schemaTypes` by name prefix means the main workspace doesn't show `fattamanoProduct`/`fattamanoSettings` in its document type lists, and vice versa. Shared object types (`seo`, `figure`, `blockContent`) appear in both because filtering uses the name prefix.

**Subtle issue:** the main workspace also needs the shared object types (`seo`, `figure`, `blockContent`, `codeBlock`). Since their names don't start with `fattamano`, they survive the filter for the main workspace. But the fattamano workspace also needs them (the product schema references `figure`, `blockContent`, and `seo`). Fix this by including non-document objects in both:

Replace the two filter lines with:

```ts
const SHARED_OBJECT_TYPES = ['blockContent', 'codeBlock', 'seo', 'figure'];

const mainSchemaTypes = schemaTypes.filter((t) => {
  const name = String(t.name);
  return !name.startsWith('fattamano') || SHARED_OBJECT_TYPES.includes(name);
});
const fattamanoSchemaTypes = schemaTypes.filter((t) => {
  const name = String(t.name);
  return name.startsWith('fattamano') || SHARED_OBJECT_TYPES.includes(name);
});
```

- [ ] **Step 3: Start studio and verify both workspaces appear**

```bash
npm run dev:studio
```
Expected: studio opens. There is now a workspace switcher (typically top-left) showing both "Lakeshore Studios" and "fattamano". Click into "fattamano" — should see Settings + Products in the nav. Click into "Lakeshore Studios" — should NOT see fattamano types in the nav. Kill server.

- [ ] **Step 4: Create a fixture Settings document via studio**

While the studio dev server is still running (re-start if needed):
1. Navigate to fattamano workspace.
2. Click "Settings" → fill in:
   - heroHeadline: `we make things by hand. sometimes they're good.`
   - heroSubcopy: `Stickers, shirts, prints. All made in small batches, occasionally serious.`
   - aboutBody: a short paragraph (any text)
   - contactEmail: `wilma@madebylakeshore.com` (or whichever email Wilma wants for inquiries)
3. Publish.

- [ ] **Step 5: Create at least 1 fixture product via studio**

In the fattamano workspace → Products → create a new product with:
- title, slug (auto-generated)
- one image (anything from local files)
- category: `sticker`
- status: `available`
- priceCents: 500
- buyUrl: any placeholder URL (or leave empty)
- dateAdded: leave default
Publish.

This fixture is needed for Task 6+ to render real content.

- [ ] **Step 6: Commit**

```bash
git add studio/sanity.config.ts studio/fattamanoStructure.ts
git commit -m "feat(studio): add fattamano workspace with isolated schema scope"
```

---

## Task 5: Wire fattamano Sanity client

Create the per-app Sanity client wrapper that pages will import. Mirrors the incubator pattern with lazy initialization.

**Files:**
- Create: `apps/fattamano/src/lib/sanity.ts`

- [ ] **Step 1: Create `apps/fattamano/src/lib/sanity.ts`**

```ts
import { createSanityClientWithConfig, queries } from '@lakeshore/shared-ui/sanity';

function getEnvVar(name: string, fallback = ''): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.[name]) {
    return import.meta.env[name];
  }
  if (typeof process !== 'undefined' && process.env?.[name]) {
    return process.env[name] as string;
  }
  return fallback;
}

let _client: ReturnType<typeof createSanityClientWithConfig> | null = null;

function getClient() {
  if (!_client) {
    const projectId =
      getEnvVar('PUBLIC_SANITY_PROJECT_ID') ||
      getEnvVar('SANITY_PROJECT_ID') ||
      getEnvVar('SANITY_STUDIO_PROJECT_ID');

    const dataset =
      getEnvVar('PUBLIC_SANITY_DATASET') ||
      getEnvVar('SANITY_DATASET') ||
      getEnvVar('SANITY_STUDIO_DATASET') ||
      'production';

    _client = createSanityClientWithConfig({ projectId, dataset });
  }
  return _client;
}

export const sanityClient = {
  fetch: <T = any>(query: string, params?: Record<string, any>): Promise<T> => {
    return getClient().client.fetch(query, params) as Promise<T>;
  },
};

export function urlFor(source: any) {
  return getClient().urlFor(source);
}

export { queries };
```

- [ ] **Step 2: Verify build still passes**

```bash
npm run build:fattamano
```
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add apps/fattamano/src/lib/sanity.ts
git commit -m "feat(fattamano): add Sanity client wrapper"
```

---

## Task 6: Build catalog components

Three reusable Astro components: `ProductCard`, `ProductGrid`, `BuyButton`. These are pure presentation — pages assemble them with data.

**Files:**
- Create: `apps/fattamano/src/components/ProductCard.astro`
- Create: `apps/fattamano/src/components/ProductGrid.astro`
- Create: `apps/fattamano/src/components/BuyButton.astro`
- Create: `apps/fattamano/src/lib/format.ts`

- [ ] **Step 1: Create `apps/fattamano/src/lib/format.ts`**

```ts
export function formatPrice(
  priceCents: number | null | undefined,
  override: string | null | undefined
): string {
  if (override) return override;
  if (priceCents == null) return '';
  return `$${(priceCents / 100).toFixed(2)}`;
}
```

- [ ] **Step 2: Create `apps/fattamano/src/components/BuyButton.astro`**

```astro
---
import { sanityClient, queries } from '../lib/sanity';

interface Props {
  status: 'available' | 'sold_out' | 'coming_soon' | 'concept';
  buyUrl?: string | null;
  title: string;
}

const { status, buyUrl, title } = Astro.props;

let contactEmail = '';
try {
  const settings = await sanityClient.fetch<{ contactEmail?: string }>(queries.fattamanoSettings);
  contactEmail = settings?.contactEmail || '';
} catch (_e) {
  // Settings doc may be missing during early dev — fall back silently.
}

const mailtoLink = contactEmail
  ? `mailto:${contactEmail}?subject=${encodeURIComponent(`interested in: ${title}`)}`
  : '';

const labelByStatus: Record<string, string> = {
  available: buyUrl ? 'buy it' : 'DM to buy',
  sold_out: 'sold out',
  coming_soon: 'coming soon',
  concept: 'tell me you want this',
};

const label = labelByStatus[status];
const disabled = status === 'sold_out' || status === 'coming_soon';
const href = disabled
  ? null
  : (buyUrl || (status === 'concept' ? mailtoLink : mailtoLink) || null);
---
{disabled ? (
  <span class="inline-block bg-ft-smudge text-ft-paper font-display px-6 py-3 text-lg cursor-not-allowed">
    {label}
  </span>
) : href ? (
  <a
    href={href}
    target={href.startsWith('mailto:') ? '_self' : '_blank'}
    rel={href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
    class="inline-block bg-ft-shout text-ft-paper font-display px-6 py-3 text-lg hover:bg-ft-ink transition-colors"
  >
    {label}
  </a>
) : (
  <span class="inline-block bg-ft-smudge text-ft-paper font-display px-6 py-3 text-lg">
    no link yet
  </span>
)}
```

- [ ] **Step 3: Create `apps/fattamano/src/components/ProductCard.astro`**

```astro
---
import { urlFor } from '../lib/sanity';
import { formatPrice } from '../lib/format';

interface Props {
  product: {
    title: string;
    slug: { current: string };
    tagline?: string;
    images: any[];
    category: string;
    priceCents?: number;
    priceDisplayOverride?: string;
    status: string;
  };
  rotate?: 'none' | 'left' | 'right';
}

const { product, rotate = 'none' } = Astro.props;
const thumb = product.images?.[0];
const thumbUrl = thumb ? urlFor(thumb).width(800).height(800).fit('crop').url() : null;
const priceLabel = formatPrice(product.priceCents, product.priceDisplayOverride);

const rotateClass =
  rotate === 'left' ? '-rotate-1.5' : rotate === 'right' ? 'rotate-1.5' : '';

const statusOverlay =
  product.status === 'sold_out'
    ? 'sold out'
    : product.status === 'coming_soon'
    ? 'soon'
    : product.status === 'concept'
    ? 'maybe?'
    : null;
---
<a
  href={`/things/${product.slug.current}`}
  class={`group block ${rotateClass} transition-transform hover:rotate-0 hover:scale-[1.02]`}
>
  <div class="relative aspect-square overflow-hidden bg-ft-paper border-2 border-ft-ink">
    {thumbUrl && (
      <img
        src={thumbUrl}
        alt={product.title}
        class="w-full h-full object-cover"
        loading="lazy"
      />
    )}
    {statusOverlay && (
      <span class="absolute top-3 right-3 bg-ft-ink text-ft-paper font-display text-xs uppercase tracking-wide px-2 py-1">
        {statusOverlay}
      </span>
    )}
  </div>
  <div class="mt-3 px-1">
    <h3 class="font-display text-xl leading-tight">{product.title}</h3>
    {product.tagline && (
      <p class="font-body text-sm text-ft-smudge mt-1">{product.tagline}</p>
    )}
    {priceLabel && (
      <p class="font-display text-ft-shout text-lg mt-1">{priceLabel}</p>
    )}
  </div>
</a>
```

- [ ] **Step 4: Create `apps/fattamano/src/components/ProductGrid.astro`**

```astro
---
import ProductCard from './ProductCard.astro';

interface Props {
  products: any[];
  jitter?: boolean;
}

const { products, jitter = false } = Astro.props;

function rotateFor(i: number): 'none' | 'left' | 'right' {
  if (!jitter) return 'none';
  const m = i % 3;
  return m === 0 ? 'left' : m === 2 ? 'right' : 'none';
}
---
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
  {products.map((p, i) => (
    <ProductCard product={p} rotate={rotateFor(i)} />
  ))}
</div>
```

- [ ] **Step 5: Verify typecheck passes**

```bash
npm run build:fattamano
```
Expected: passes. (`astro check` will catch any type mistakes in the component props.)

- [ ] **Step 6: Commit**

```bash
git add apps/fattamano/src/components/ProductCard.astro apps/fattamano/src/components/ProductGrid.astro apps/fattamano/src/components/BuyButton.astro apps/fattamano/src/lib/format.ts
git commit -m "feat(fattamano): add ProductCard, ProductGrid, BuyButton components"
```

---

## Task 7: Build the home page

Replace the Task 1 placeholder home with a real one driven by Sanity: hero from settings, featured products grid.

**Files:**
- Modify: `apps/fattamano/src/pages/index.astro`

- [ ] **Step 1: Replace home page contents**

Overwrite `apps/fattamano/src/pages/index.astro` with:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import ProductGrid from '../components/ProductGrid.astro';
import { sanityClient, queries } from '../lib/sanity';

const settings = await sanityClient.fetch<{
  heroHeadline?: string;
  heroSubcopy?: string;
}>(queries.fattamanoSettings).catch(() => null);

const featured = await sanityClient
  .fetch<any[]>(queries.featuredFattamanoProducts)
  .catch(() => []);

const headline = settings?.heroHeadline ?? 'we make things by hand.';
const subcopy = settings?.heroSubcopy ?? 'Stickers, shirts, prints. Made in small batches, occasionally serious.';
---
<BaseLayout title="Home" description={subcopy}>
  <section class="max-w-6xl mx-auto px-6 py-16 md:py-24">
    <h1 class="font-display text-big md:text-huge">
      {headline}
    </h1>
    <p class="mt-6 max-w-2xl font-body text-lg text-ft-smudge">
      {subcopy}
    </p>
  </section>

  {featured.length > 0 && (
    <section class="max-w-6xl mx-auto px-6 pb-24">
      <div class="flex items-end justify-between mb-10">
        <h2 class="font-display text-3xl">currently <span class="text-ft-shout">on the bench</span></h2>
        <a href="/things" class="font-body text-sm underline hover:text-ft-shout">see everything →</a>
      </div>
      <ProductGrid products={featured} jitter={true} />
    </section>
  )}
</BaseLayout>
```

- [ ] **Step 2: Verify the page renders with real data**

Start the dev server:
```bash
npm run dev:fattamano
```
Open `http://localhost:4324/`. Expected:
- Hero shows the headline from the Settings doc you created in Task 4.
- "currently on the bench" section appears with the fixture product card if it was marked `featured`. (If the fixture wasn't marked featured, that section won't render — go to studio and toggle `featured` on, then refresh.)

Kill server.

- [ ] **Step 3: Verify build passes**

```bash
npm run build:fattamano
```
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add apps/fattamano/src/pages/index.astro
git commit -m "feat(fattamano): home page driven by Sanity settings and featured products"
```

---

## Task 8: Build /things catalog page

A grid view of all products, with optional category filter via query param (`?cat=sticker`). v1 keeps it simple — single page, no pagination.

**Files:**
- Create: `apps/fattamano/src/pages/things/index.astro`

- [ ] **Step 1: Create `apps/fattamano/src/pages/things/index.astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import ProductGrid from '../../components/ProductGrid.astro';
import { sanityClient, queries } from '../../lib/sanity';

export const prerender = true;

const products = await sanityClient
  .fetch<any[]>(queries.allFattamanoProducts)
  .catch(() => []);

const categories = ['all', ...new Set(products.map((p) => p.category))];
---
<BaseLayout
  title="things"
  description="The full catalog of fattamano stickers, shirts, prints, and other small handmade items."
>
  <section class="max-w-6xl mx-auto px-6 py-16">
    <header class="mb-12">
      <h1 class="font-display text-big">
        <span class="font-hand text-ft-shout text-5xl">things</span> we made
      </h1>
      <p class="mt-4 font-body text-ft-smudge">
        Every item here is handmade in small batches. Some are jokes. Some are sincere. Most are both.
      </p>
    </header>

    {products.length === 0 ? (
      <p class="font-body text-ft-smudge">Nothing here yet. Check back soon.</p>
    ) : (
      <ProductGrid products={products} jitter={true} />
    )}
  </section>
</BaseLayout>
```

Note: category filtering deferred per spec's "Open Questions". v1 just lists all products. The `categories` variable is computed but unused — it's left in place as a forward-compatibility hook. *(Actually — remove it to keep the file clean; the spec says defer filtering. Remove the `const categories = ...` line.)*

**Correction:** delete the `const categories` line. Final file should not declare unused variables.

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import ProductGrid from '../../components/ProductGrid.astro';
import { sanityClient, queries } from '../../lib/sanity';

export const prerender = true;

const products = await sanityClient
  .fetch<any[]>(queries.allFattamanoProducts)
  .catch(() => []);
---
<BaseLayout
  title="things"
  description="The full catalog of fattamano stickers, shirts, prints, and other small handmade items."
>
  <section class="max-w-6xl mx-auto px-6 py-16">
    <header class="mb-12">
      <h1 class="font-display text-big">
        <span class="font-hand text-ft-shout text-5xl">things</span> we made
      </h1>
      <p class="mt-4 font-body text-ft-smudge">
        Every item here is handmade in small batches. Some are jokes. Some are sincere. Most are both.
      </p>
    </header>

    {products.length === 0 ? (
      <p class="font-body text-ft-smudge">Nothing here yet. Check back soon.</p>
    ) : (
      <ProductGrid products={products} jitter={true} />
    )}
  </section>
</BaseLayout>
```

- [ ] **Step 2: Verify page renders**

```bash
npm run dev:fattamano
```
Open `http://localhost:4324/things`. Expected: page header + fixture product card visible. Kill server.

- [ ] **Step 3: Verify build passes**

```bash
npm run build:fattamano
```
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add apps/fattamano/src/pages/things/index.astro
git commit -m "feat(fattamano): /things catalog page"
```

---

## Task 9: Build /things/[slug] product detail page

Dynamic route generated at build time for every product. Shows full image gallery, description, price, and buy action.

**Files:**
- Create: `apps/fattamano/src/pages/things/[slug].astro`

- [ ] **Step 1: Create `apps/fattamano/src/pages/things/[slug].astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import BuyButton from '../../components/BuyButton.astro';
import { sanityClient, queries, urlFor } from '../../lib/sanity';
import { formatPrice } from '../../lib/format';

export const prerender = true;

export async function getStaticPaths() {
  const products = await sanityClient
    .fetch<any[]>(queries.allFattamanoProducts)
    .catch(() => []);
  return products.map((p) => ({
    params: { slug: p.slug.current },
    props: { product: p },
  }));
}

const { product } = Astro.props as { product: any };

// Re-fetch with full details (description blocks, seo)
const full = await sanityClient.fetch<any>(queries.fattamanoProductBySlug, {
  slug: product.slug.current,
});

const images = full?.images ?? [];
const heroUrl = images[0] ? urlFor(images[0]).width(1400).url() : null;
const priceLabel = formatPrice(full?.priceCents, full?.priceDisplayOverride);

const metaTitle = full?.seo?.metaTitle || full?.title;
const metaDescription =
  full?.seo?.metaDescription || full?.tagline || `${full?.title} — handmade by fattamano.`;

const ogImagePath = `/api/og?title=${encodeURIComponent(full?.title || '')}&subtitle=${encodeURIComponent(full?.tagline || full?.category || '')}`;
---
<BaseLayout title={metaTitle} description={metaDescription} ogImagePath={ogImagePath}>
  <article class="max-w-6xl mx-auto px-6 py-12">
    <a href="/things" class="inline-block mb-8 font-body text-sm text-ft-smudge hover:text-ft-shout">← back to things</a>

    <div class="grid md:grid-cols-2 gap-10">
      <div>
        {heroUrl && (
          <img
            src={heroUrl}
            alt={full.title}
            class="w-full border-2 border-ft-ink"
          />
        )}
        {images.length > 1 && (
          <div class="grid grid-cols-4 gap-3 mt-3">
            {images.slice(1).map((img: any) => (
              <img
                src={urlFor(img).width(400).height(400).fit('crop').url()}
                alt=""
                class="w-full aspect-square object-cover border-2 border-ft-ink"
                loading="lazy"
              />
            ))}
          </div>
        )}
      </div>

      <div class="flex flex-col">
        <p class="font-body uppercase tracking-wide text-sm text-ft-smudge">{full.category}</p>
        <h1 class="font-display text-big mt-2">{full.title}</h1>
        {full.tagline && (
          <p class="font-hand text-2xl text-ft-ink mt-3">{full.tagline}</p>
        )}
        {priceLabel && (
          <p class="font-display text-3xl text-ft-shout mt-6">{priceLabel}</p>
        )}

        <div class="mt-8">
          <BuyButton status={full.status} buyUrl={full.buyUrl} title={full.title} />
        </div>

        {full.description && (
          <div class="prose mt-10 font-body text-ft-ink max-w-none">
            {/* blockContent rendering — for v1, just dump the raw blocks as paragraphs */}
            {full.description.map((block: any) => (
              block._type === 'block' && (
                <p>{block.children?.map((c: any) => c.text).join('')}</p>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  </article>
</BaseLayout>
```

Note on description rendering: v1 uses a naive flatten of block content (paragraphs only). Rich Portable Text rendering can be added later if marketing copy gets more elaborate.

- [ ] **Step 2: Verify dynamic route works**

```bash
npm run dev:fattamano
```
Open `http://localhost:4324/things/<slug-of-your-fixture-product>`. Expected: product detail page renders with image, title, category, buy button. Kill server.

- [ ] **Step 3: Verify build pre-renders all product paths**

```bash
npm run build:fattamano
```
Expected: build log includes the slug of your fixture product (e.g., `▶ src/pages/things/[slug].astro ✓ /things/your-product-slug`).

- [ ] **Step 4: Commit**

```bash
git add apps/fattamano/src/pages/things/\[slug\].astro
git commit -m "feat(fattamano): /things/[slug] product detail page"
```

---

## Task 10: Build /about and /404 pages

`/about` reads from the Settings doc. `/404` is the custom not-found page (uses the optional `notFoundCopy` field, falls back to a default joke).

**Files:**
- Create: `apps/fattamano/src/pages/about.astro`
- Create: `apps/fattamano/src/pages/404.astro`

- [ ] **Step 1: Create `apps/fattamano/src/pages/about.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { sanityClient, queries } from '../lib/sanity';

const settings = await sanityClient
  .fetch<{ aboutBody?: any[]; contactEmail?: string }>(queries.fattamanoSettings)
  .catch(() => null);

const aboutBlocks = settings?.aboutBody ?? [];
const contactEmail = settings?.contactEmail;
---
<BaseLayout
  title="about"
  description="What fattamano is, who makes it, and why it exists."
>
  <section class="max-w-3xl mx-auto px-6 py-16">
    <h1 class="font-display text-big mb-2">
      <span class="font-hand text-ft-shout text-5xl">fatto a mano</span>
    </h1>
    <p class="font-body text-ft-smudge mb-10 italic">
      Italian for "made by hand, with care."
    </p>

    <div class="prose font-body text-ft-ink max-w-none space-y-4">
      {aboutBlocks.map((block: any) => (
        block._type === 'block' && (
          <p>{block.children?.map((c: any) => c.text).join('')}</p>
        )
      ))}
    </div>

    {contactEmail && (
      <p class="mt-10 font-body">
        <a href={`mailto:${contactEmail}`} class="text-ft-shout underline hover:text-ft-ink">
          say hi → {contactEmail}
        </a>
      </p>
    )}
  </section>
</BaseLayout>
```

- [ ] **Step 2: Create `apps/fattamano/src/pages/404.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { sanityClient, queries } from '../lib/sanity';

const settings = await sanityClient
  .fetch<{ notFoundCopy?: any[] }>(queries.fattamanoSettings)
  .catch(() => null);

const blocks = settings?.notFoundCopy ?? [];
---
<BaseLayout title="lost" description="page not found">
  <section class="max-w-3xl mx-auto px-6 py-32 text-center">
    <h1 class="font-display text-huge">
      <span class="text-ft-shout">404</span>
    </h1>
    <p class="font-hand text-3xl mt-4">you came here on purpose?</p>

    <div class="mt-10 font-body text-ft-smudge space-y-3">
      {blocks.length > 0
        ? blocks.map((block: any) =>
            block._type === 'block' ? (
              <p>{block.children?.map((c: any) => c.text).join('')}</p>
            ) : null
          )
        : (
          <>
            <p>This page doesn't exist. Probably never did.</p>
            <p>
              You could go to <a href="/things" class="underline text-ft-ink hover:text-ft-shout">the things</a> instead.
            </p>
          </>
        )
      }
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 3: Verify pages render**

```bash
npm run dev:fattamano
```
- Open `http://localhost:4324/about` → about content shows.
- Open `http://localhost:4324/some-nonexistent-path` → 404 page renders.

Kill server.

- [ ] **Step 4: Verify build passes**

```bash
npm run build:fattamano
```
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add apps/fattamano/src/pages/about.astro apps/fattamano/src/pages/404.astro
git commit -m "feat(fattamano): /about and /404 pages"
```

---

## Task 11: SEO infrastructure (sitemap, robots.txt, llms.txt, OG image route)

The sitemap integration is already configured in Task 1's astro config. This task adds the other three pieces and verifies the sitemap actually generates.

**Files:**
- Create: `apps/fattamano/public/robots.txt`
- Create: `apps/fattamano/public/llms.txt`
- Create: `apps/fattamano/src/pages/api/og.ts`
- Create: `apps/fattamano/public/favicon.svg` (minimal SVG)
- Create: `apps/fattamano/public/og-default.png` (1200x630 fallback image)

- [ ] **Step 1: Create `apps/fattamano/public/robots.txt`**

```
User-agent: *
Allow: /

Sitemap: https://fattamano.com/sitemap-index.xml
```

- [ ] **Step 2: Create `apps/fattamano/public/llms.txt`**

```
# fattamano

> Handmade stickers, t-shirts, and prints with funny phrases and designs. Made by Wilma of Lakeshore Studios. Small-batch, often irreverent, always made by hand.

## Pages

- [home](https://fattamano.com/): Featured items + brand intro
- [things](https://fattamano.com/things): Full catalog of available items
- [about](https://fattamano.com/about): About the maker and the brand
```

- [ ] **Step 3: Create `apps/fattamano/src/pages/api/og.ts`**

This is a serverless OG image generator. Copy the satori-based approach from `apps/designandotherstories/src/pages/api/og.ts` and adapt the colors to fattamano's palette.

```ts
export const prerender = false;

import type { APIRoute } from 'astro';
import satori from 'satori';
import { html } from 'satori-html';
import sharp from 'sharp';

const COLORS = {
  paper: '#FBF9F4',
  ink: '#1A1A1A',
  shout: '#FF3D2E',
  smudge: '#8A8580',
};

export const GET: APIRoute = async ({ url }) => {
  const title = url.searchParams.get('title') || 'fattamano';
  const subtitle = url.searchParams.get('subtitle') || '';

  const markup = html`
    <div
      style="
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        width: 1200px;
        height: 630px;
        background-color: ${COLORS.paper};
        padding: 80px;
        font-family: serif;
        position: relative;
      "
    >
      <div
        style="
          position: absolute;
          top: 0;
          left: 0;
          height: 12px;
          width: 100%;
          background-color: ${COLORS.shout};
        "
      ></div>

      <div
        style="
          position: absolute;
          top: 60px;
          right: 80px;
          font-size: 22px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: ${COLORS.smudge};
        "
      >
        fattamano
      </div>

      <div
        style="
          font-size: 96px;
          line-height: 1.0;
          color: ${COLORS.ink};
          font-weight: 700;
          margin-bottom: 20px;
        "
      >
        ${title}
      </div>

      ${
        subtitle
          ? `<div style="font-size: 32px; color: ${COLORS.smudge};">${subtitle}</div>`
          : ''
      }
    </div>
  `;

  // Note: real satori usage requires a font buffer. Match the existing
  // DAOS implementation pattern in apps/designandotherstories/src/pages/api/og.ts
  // for how fonts are loaded (it may fetch a Google font or use a bundled .ttf).
  // See that file for the production-tested approach.

  const svg = await satori(markup as any, {
    width: 1200,
    height: 630,
    fonts: [], // FILL IN from the DAOS pattern — copy the fonts array from apps/designandotherstories/src/pages/api/og.ts
  });

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
```

**Important:** the `fonts: []` array MUST be filled in by reading the working `fonts` array from `apps/designandotherstories/src/pages/api/og.ts` (it loads a `.ttf` from disk or fetches a Google font). Without fonts, satori will throw. The DAOS file is the source of truth for the exact font-loading pattern.

- [ ] **Step 4: Read the DAOS OG file and copy its font-loading block**

```bash
grep -A 40 "fonts:" apps/designandotherstories/src/pages/api/og.ts | head -50
```

Adapt that block into the fattamano `og.ts` `fonts:` array. Then re-test.

- [ ] **Step 5: Create a placeholder `apps/fattamano/public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#FBF9F4"/>
  <text x="50%" y="58%" text-anchor="middle" font-family="serif" font-weight="700" font-size="44" fill="#FF3D2E">f</text>
</svg>
```

- [ ] **Step 6: Generate a default OG image fallback**

For the initial commit, generate a static `og-default.png` once via the OG API at build time, then save it to `public/`:

```bash
npm run dev:fattamano  # in one shell
# In another shell:
curl -o apps/fattamano/public/og-default.png "http://localhost:4324/api/og?title=fattamano&subtitle=made+by+hand%2C+sometimes+well"
# Kill the dev server.
```

Confirm the file is a valid PNG (size > 5KB).

- [ ] **Step 7: Build and verify sitemap + OG image generation**

```bash
npm run build:fattamano
```

Expected: build succeeds. Sitemap files appear in `apps/fattamano/dist/sitemap-index.xml` and `dist/sitemap-0.xml`.

Run preview to verify OG endpoint works in production mode:
```bash
npm run preview --workspace=apps/fattamano
# In another shell:
curl -I "http://localhost:4321/api/og?title=Test&subtitle=Hello"
```
Expected: `200 OK` with `content-type: image/png`. Kill preview server.

- [ ] **Step 8: Commit**

```bash
git add apps/fattamano/public/ apps/fattamano/src/pages/api/og.ts
git commit -m "feat(fattamano): SEO infrastructure — sitemap, robots, llms.txt, OG image route"
```

---

## Task 12: Add `secretLinkRegion` field to artwork schema

Optional Sanity field on the existing `artwork` document type that lets Wilma place a clickable overlay region on any artwork. Used by Task 14 to surface the fattamano easter egg on the DAOS gallery.

**Files:**
- Modify: `studio/schemas/documents/artwork.ts`

- [ ] **Step 1: Add the new field to the artwork schema**

In `studio/schemas/documents/artwork.ts`, locate the `fields:` array (after the existing fields like `featured`, `collection`). Add this field at the end of the array, just before the closing `]`:

```ts
defineField({
  name: 'secretLinkRegion',
  title: 'Secret Link Region (easter egg)',
  type: 'object',
  description: 'Optional clickable overlay on the artwork detail page image. Useful for hiding a link to a sister site or a related piece.',
  fields: [
    defineField({
      name: 'enabled',
      title: 'Enabled',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'url',
      validation: (Rule) =>
        Rule.uri({ scheme: ['http', 'https'] }).custom((value, ctx) => {
          const enabled = (ctx.parent as any)?.enabled;
          if (enabled && !value) return 'URL required when enabled';
          return true;
        }),
    }),
    defineField({
      name: 'xPct',
      title: 'X position (% from left)',
      type: 'number',
      description: '0 = left edge, 100 = right edge',
      validation: (Rule) => Rule.min(0).max(100),
    }),
    defineField({
      name: 'yPct',
      title: 'Y position (% from top)',
      type: 'number',
      validation: (Rule) => Rule.min(0).max(100),
    }),
    defineField({
      name: 'widthPct',
      title: 'Width (% of image width)',
      type: 'number',
      initialValue: 15,
      validation: (Rule) => Rule.min(1).max(100),
    }),
    defineField({
      name: 'heightPct',
      title: 'Height (% of image height)',
      type: 'number',
      initialValue: 10,
      validation: (Rule) => Rule.min(1).max(100),
    }),
  ],
  options: { collapsible: true, collapsed: true },
}),
```

- [ ] **Step 2: Verify studio loads with the new field**

```bash
npm run dev:studio
```
Navigate to the main workspace → an existing artwork → confirm "Secret Link Region (easter egg)" appears as a collapsible field at the bottom. Kill server.

- [ ] **Step 3: Commit**

```bash
git add studio/schemas/documents/artwork.ts
git commit -m "feat(studio): add secretLinkRegion field to artwork for hidden cross-site links"
```

---

## Task 13: DAOS footer easter egg

Add a subtle italic phrase to the DAOS footer that links to fattamano.com. This is the "primary" discovery mechanic per the spec.

**Files:**
- Modify: `apps/designandotherstories/src/components/Footer.astro`

- [ ] **Step 1: Add the easter-egg link to the footer's bottom row**

Open `apps/designandotherstories/src/components/Footer.astro`. Locate the "Bottom" section (around line 87-94). Modify it so the bottom row now has three slots: left (copyright), center (NEW easter-egg phrase), right (Lakeshore Studios link).

Replace the current bottom div (the block starting `<!-- Bottom -->`) with:

```astro
    <!-- Bottom -->
    <div class="mt-12 pt-8 border-t border-daos-warm flex flex-col md:flex-row justify-between items-center gap-4">
      <p class="text-daos-charcoal text-sm">
        &copy; {currentYear} Design & Other Stories. All rights reserved.
      </p>
      <p class="text-daos-clay text-xs italic">
        <a
          href="https://fattamano.com"
          rel="noopener"
          class="hover:text-daos-terracotta transition-colors"
          style="text-decoration: none;"
        >
          fatto a mano
        </a>
      </p>
      <p class="text-daos-charcoal text-sm">
        Part of <a href="https://madebylakeshore.com" class="text-daos-terracotta hover:underline">Lakeshore Studios</a>
      </p>
    </div>
```

Notes on the design:
- No underline by default — looks like decorative text.
- Smaller font size (`text-xs`) and a muted color (`text-daos-clay`) so it visually recedes.
- Hover affords interactivity via color change.
- Crawler-friendly: no `nofollow`, no JS, plain `<a>` — Google indexes the destination.

- [ ] **Step 2: Verify DAOS still builds and the link renders**

```bash
npm run build:daos
```
Expected: passes.

```bash
npm run dev:daos
```
Open `http://localhost:4322/`, scroll to footer. Confirm:
- The italic phrase "fatto a mano" appears centered on the bottom row.
- Hovering changes its color to terracotta.
- Clicking goes to fattamano.com.

Kill server.

- [ ] **Step 3: Commit**

```bash
git add apps/designandotherstories/src/components/Footer.astro
git commit -m "feat(daos): footer easter egg linking to fattamano.com"
```

---

## Task 14: DAOS signature easter egg overlay

When an artwork has `secretLinkRegion.enabled === true`, overlay a transparent clickable anchor positioned per the percent coordinates on the artwork detail page image. Wilma picks which artwork gets the easter egg by editing its `secretLinkRegion` in the studio.

**Files:**
- Identify: the DAOS artwork detail page (find via grep below)
- Modify: the artwork detail page (path determined in Step 1)
- Possibly create: a small Astro component if the image render is reused

- [ ] **Step 1: Find the artwork detail page**

```bash
grep -rln "artworkBySlug\|artwork && slug" apps/designandotherstories/src/pages/ 2>/dev/null
```
Expected: returns one file, likely `apps/designandotherstories/src/pages/gallery/[slug].astro`. Open and confirm it renders the artwork's first image.

- [ ] **Step 2: Update the artwork detail query to include `secretLinkRegion`**

In `packages/shared-ui/src/sanity.ts`, find the `artworkBySlug` query. Add `secretLinkRegion` to the projection:

```ts
  artworkBySlug: `*[_type == "artwork" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    artworkType,
    images,
    description,
    featured,
    secretLinkRegion,
    "collection": collection->{ title, slug }
  }`,
```

(Add the line `secretLinkRegion,` to the projection — preserve existing fields.)

- [ ] **Step 3: Add the overlay to the artwork detail page**

In the artwork detail page (path from Step 1), locate where the primary image is rendered. Wrap or follow it with the overlay:

```astro
---
// at the top, alongside other props destructuring:
const region = artwork?.secretLinkRegion;
const showOverlay = region?.enabled && region?.url;
---

<!-- Wherever the primary image is rendered, wrap it in a relative container: -->
<div class="relative inline-block">
  <img
    src={/* existing image src */}
    alt={artwork.title}
    class="..."
  />
  {showOverlay && (
    <a
      href={region.url}
      rel="noopener"
      aria-label="hidden link"
      class="absolute block hover:bg-daos-terracotta/5 transition-colors"
      style={`left: ${region.xPct}%; top: ${region.yPct}%; width: ${region.widthPct}%; height: ${region.heightPct}%;`}
    ></a>
  )}
</div>
```

The exact integration depends on the existing markup. The principle: the parent of the `<img>` becomes `position: relative`, and the `<a>` is `position: absolute` with the region's percent coordinates so it scales with the image.

- [ ] **Step 4: Configure an artwork with the easter egg via studio**

```bash
npm run dev:studio
```
In the main workspace → pick one artwork → expand "Secret Link Region (easter egg)" → set:
- enabled: true
- url: `https://fattamano.com`
- xPct/yPct: approximate position where Wilma's signature is on that artwork (eyeball it — can be tuned later)
- widthPct: 15
- heightPct: 8

Publish.

- [ ] **Step 5: Verify on DAOS**

```bash
npm run dev:daos
```
Navigate to `/gallery/<that-artwork-slug>`. Hover near the signature region — cursor should change to pointer and a subtle color tint should appear. Click → should navigate to fattamano.com.

- [ ] **Step 6: Commit**

```bash
git add packages/shared-ui/src/sanity.ts apps/designandotherstories/src/pages/gallery/\[slug\].astro
git commit -m "feat(daos): clickable signature region on artwork detail page

Wraps the primary artwork image in a relative container and overlays a
transparent anchor positioned by the new secretLinkRegion field on the
artwork document. Used to host the fattamano easter egg."
```

(Adjust the staged file path if the grep in Step 1 returned a different artwork page filename.)

---

## Task 15: Vercel deploy config + smoke test

Final task — connect fattamano to Vercel, attach the domain, smoke-test the live site.

**Files:** None in repo (Vercel + DNS configuration).

- [ ] **Step 1: Create a new Vercel project**

Via Vercel dashboard (or `vercel` CLI):
1. New Project → Import from `jrszilard/madebylakeshore-website` Git repo.
2. **Root Directory:** `apps/fattamano`
3. Framework Preset: Astro (auto-detected).
4. Build command: `npm run build` (default).
5. Output directory: `.vercel/output` (default for vercel adapter).
6. Install command: `npm install` (run from repo root via monorepo settings).
7. Set environment variables:
   - `PUBLIC_SANITY_PROJECT_ID` = (same as other apps — copy from existing Vercel project)
   - `PUBLIC_SANITY_DATASET` = `production`

- [ ] **Step 2: Trigger an initial deploy**

Vercel will deploy the current `main` branch automatically (once you merge the feature branch). For testing, you can trigger a preview deploy from the current branch via the Vercel CLI:
```bash
cd apps/fattamano
npx vercel --prebuilt=false
```
(or just let the auto-deploy run after merge.)

- [ ] **Step 3: Attach the `fattamano.com` domain**

In Vercel project → Settings → Domains:
1. Add `fattamano.com` and `www.fattamano.com`.
2. Configure as redirect: `www.fattamano.com` → `fattamano.com`.
3. Update the domain registrar's DNS records per Vercel's instructions (typically an A record + a CNAME for www).

- [ ] **Step 4: Smoke test live site**

After DNS propagates (usually < 1 hour):
- Visit `https://fattamano.com/` — home page renders with fixture content.
- Visit `https://fattamano.com/things` — catalog renders.
- Visit `https://fattamano.com/things/<slug>` — product detail renders.
- Visit `https://fattamano.com/about` — about renders.
- Visit `https://fattamano.com/nonsense` — custom 404 renders.
- Visit `https://fattamano.com/api/og?title=Test&subtitle=Hello` — returns a PNG.
- Visit `https://fattamano.com/sitemap-index.xml` — XML loads.
- Visit `https://fattamano.com/robots.txt` — text loads.
- Visit `https://fattamano.com/llms.txt` — text loads.
- View source of any product detail page — confirm `og:image` meta tag points at the OG api endpoint.

- [ ] **Step 5: Smoke test DAOS easter eggs against production**

Once DAOS is redeployed with the Task 13 + 14 changes:
- Visit `https://designandotherstories.com/` → scroll to footer → "fatto a mano" link → confirm it navigates to fattamano.com.
- Visit the artwork detail page configured in Task 14 → hover near the signature → confirm overlay is clickable and links to fattamano.com.

- [ ] **Step 6: No code commit for this task** — this is configuration. If any Vercel-related notes need to live in the repo (e.g., a `DEPLOYMENT.md` in `apps/fattamano/`), add it as a separate optional commit.

---

## Self-Review

- **Spec coverage:**
  - Sibling app scaffolded → Task 1 ✓
  - `ft-*` brand tokens → Task 1 ✓
  - Shared Sanity, prefixed types → Task 2, 3 ✓
  - Workspace separation → Task 4 ✓
  - Catalog pages → Tasks 7, 8, 9 ✓
  - About + 404 → Task 10 ✓
  - SEO (sitemap, robots, llms, OG) → Task 11 ✓
  - `secretLinkRegion` field → Task 12 ✓
  - DAOS footer easter egg → Task 13 ✓
  - DAOS signature easter egg → Task 14 ✓
  - Vercel deploy + domain → Task 15 ✓
  - Migration triggers documented → spec only (no code) ✓
  - Visual design loose by design → Task 1 sets defaults, deferred otherwise ✓

- **Placeholder scan:** One genuine placeholder remains: the `fonts: []` array in the OG image route at Task 11 Step 3. The plan explicitly calls this out and directs the executor to copy the working pattern from the DAOS file at Step 4. This is acceptable because (a) the exact font-loading code lives in the DAOS file and copying it verbatim is the right move, (b) the plan marks it clearly with a "MUST be filled in" callout.

- **Type consistency:** Schema names are consistent (`fattamanoProduct`, `fattamanoSettings`) across schema files, query names, structure resolver, and workspace filter. The `secretLinkRegion` field name matches between Task 12 (schema) and Task 14 (query + page consumption). `priceCents` / `priceDisplayOverride` / `buyUrl` / `status` field names are consistent across schema, queries, and `ProductCard`/`BuyButton` components.

- **Ambiguity check:** The Task 8 `/things` page initially showed a `categories` constant that was later marked for deletion — fixed inline so the executor doesn't ship dead code. The "wrap the image in a relative container" instruction in Task 14 Step 3 is intentionally pseudo-code because the exact markup depends on the existing artwork page, which the executor reads in Step 1. That's acceptable structural ambiguity — the principle is concrete, the integration is local.

No further fixes needed.
