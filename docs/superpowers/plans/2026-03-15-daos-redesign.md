# DAOS Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Design & Other Stories from a single-purpose art shop into a multi-section artist platform with Writing, Gallery, Events, About, and Shop sections.

**Architecture:** Sanity-First Hybrid — all owned content (books, artwork, events, artist bio) in Sanity CMS, Substack posts pulled via RSS, pluggable shop checkout. Switch DAOS from static to hybrid output mode for SSR on pages needing fresh data.

**Tech Stack:** Astro 4 (hybrid SSR), React 18 (islands), Sanity v5 (GROQ), Tailwind CSS 3, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-15-daos-redesign-design.md`

---

## File Structure

### New Files

**Sanity Schemas** (`studio/schemas/documents/`):
- `book.ts` — Book document type (novels, novellas, collections, poetry)
- `writingPiece.ts` — Short stories/essays linking to Substack
- `event.ts` — Art fairs, markets, exhibitions with location and "what I'm bringing"
- `artistProfile.ts` — Singleton for About page (name, bio, portrait, social links)

**DAOS Pages** (`apps/designandotherstories/src/pages/`):
- `index.astro` — Rewritten homepage with sectioned layout
- `writing/index.astro` — Writing hub (SSR: books grid + Substack feed)
- `writing/[slug].astro` — Book detail page
- `gallery/index.astro` — Gallery hub with category filters
- `gallery/[slug].astro` — Artwork detail page
- `gallery/collections/[slug].astro` — Collection view
- `events/index.astro` — Events hub (SSR: upcoming + past archive)
- `events/[slug].astro` — Event detail page
- `about.astro` — About the Artist page
- `shop.astro` — Shop page (forSale artwork)

**DAOS Components** (`apps/designandotherstories/src/components/`):
- `HeroSection.astro` — Homepage hero with tagline
- `SectionHeader.astro` — Reusable section title + subtitle + "view all" link
- `SubstackEmbed.astro` — Substack newsletter iframe wrapper
- `BookCard.astro` — Book preview card (cover, title, type, status badge, blurb)
- `SubstackFeedCard.astro` — Substack post preview card
- `SubstackFeed.astro` — Fetches RSS + renders SubstackFeedCard list
- `PurchaseLinks.astro` — Platform purchase buttons for books
- `FromThisWorld.astro` — Related books/writings grid
- `RelatedSubstackPosts.tsx` — React island: client-side Substack RSS filtered by tag
- `GalleryCard.astro` — Artwork thumbnail card (uniform 3:4 ratio)
- `GalleryGrid.astro` — Filterable artwork grid with category pills
- `ImageViewer.tsx` — React island: multi-image viewer with thumbnails
- `PurchaseAction.astro` — Price + buy/inquire CTA (pluggable checkout)
- `CheckoutButton.astro` — Pluggable checkout: Snipcart/Etsy/inquiry per config
- `EventCard.astro` — Event card with date block + title + location
- `BringingGrid.astro` — Artwork/books thumbnail grid for event detail
- `ShopCard.astro` — Artwork card with price + purchase CTA

**DAOS Utilities** (`apps/designandotherstories/src/lib/`):
- `substack.ts` — `fetchSubstackFeed(tag?)` RSS fetcher + parser
- `config.ts` — Site config constants (SHOP_PLATFORM, etc.)

### Modified Files

- `studio/schemas/documents/artwork.ts` — Add `forSale` field, remove `writing`/`other` from category enum
- `studio/schemas/index.ts` — Register new schema types
- `studio/structure.ts` — Add Books, Writing Pieces, Events, Artist Profile; remove Writing category filter
- `packages/shared-ui/src/sanity.ts` — Add new GROQ queries, update `artworkBySlug` to include `forSale`
- `apps/designandotherstories/astro.config.mjs` — Change output to `hybrid`
- `apps/designandotherstories/src/components/Navigation.astro` — New nav links, conditional cart icon
- `apps/designandotherstories/src/components/Footer.astro` — New nav links, Substack link, dynamic bio
- `apps/designandotherstories/src/layouts/BaseLayout.astro` — Conditional Snipcart loading
- `apps/designandotherstories/vercel.json` — Add redirects, update CSP for Substack embed

---

## Chunk 1: Foundation — Schemas, Queries, and Config

### Task 1: Create `book` Sanity schema

**Files:**
- Create: `studio/schemas/documents/book.ts`

- [ ] **Step 1: Create the book schema**

Create `studio/schemas/documents/book.ts` using `defineType` and `defineField` from `sanity` (matching the pattern in `artwork.ts`).

Fields (see spec for full details):
- `title` (string, required)
- `slug` (slug, source: title, required)
- `coverImage` (figure, required)
- `blurb` (text, 3 rows, required)
- `description` (blockContent)
- `type` (string enum: novel, novella, short-story-collection, poetry — required)
- `status` (string enum: published, coming-soon, in-progress — initialValue: 'in-progress')
- `publishedDate` (date)
- `fromThisWorld` (array of references to book and writingPiece)
- `purchaseLinks` (array of objects: {platform: string, url: url})
- `substackTag` (string)
- `featured` (boolean, initialValue: false)
- `order` (number)
- `seo` (seo)

Orderings: by order asc, by publishedDate desc.

Preview: show title, type label, status label, and coverImage as media.

- [ ] **Step 2: Verify no syntax errors**

Run: `cd studio && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `book.ts`

- [ ] **Step 3: Commit**

```bash
git add studio/schemas/documents/book.ts
git commit -m "feat(studio): add book schema for DAOS writing section"
```

---

### Task 2: Create `writingPiece` Sanity schema

**Files:**
- Create: `studio/schemas/documents/writingPiece.ts`

- [ ] **Step 1: Create the writingPiece schema**

Create `studio/schemas/documents/writingPiece.ts` using the same pattern.

Fields:
- `title` (string, required)
- `coverImage` (figure)
- `excerpt` (text, 3 rows)
- `type` (string enum: short-story, essay, poem, serial-chapter — required)
- `book` (reference to book)
- `substackUrl` (url, required)
- `publishedDate` (date)
- `featured` (boolean, initialValue: false)
- `tags` (array of strings, layout: 'tags')

No slug field — these pieces link to Substack, they don't have on-site pages.

Orderings: by publishedDate desc.

Preview: show title, type label, parent book title, and coverImage as media.

- [ ] **Step 2: Commit**

```bash
git add studio/schemas/documents/writingPiece.ts
git commit -m "feat(studio): add writingPiece schema for DAOS"
```

---

### Task 3: Create `event` Sanity schema

**Files:**
- Create: `studio/schemas/documents/event.ts`

- [ ] **Step 1: Create the event schema**

Create `studio/schemas/documents/event.ts`.

Fields:
- `title` (string, required)
- `slug` (slug, source: title, required)
- `eventType` (string enum: art-fair, market, exhibition, book-signing, workshop, other)
- `startDate` (datetime, required)
- `endDate` (datetime)
- `location` (object, required) with sub-fields: venueName (string), address (string), city (string, required), state (string)
- `description` (blockContent)
- `coverImage` (figure)
- `bringingArtwork` (array of references to artwork)
- `bringingBooks` (array of references to book)
- `externalUrl` (url)
- `featured` (boolean, initialValue: false)
- `seo` (seo)

Orderings: by startDate asc and desc.

Preview: show title, formatted date, city/state location, and coverImage as media.

- [ ] **Step 2: Commit**

```bash
git add studio/schemas/documents/event.ts
git commit -m "feat(studio): add event schema for DAOS"
```

---

### Task 4: Create `artistProfile` Sanity schema (singleton)

**Files:**
- Create: `studio/schemas/documents/artistProfile.ts`

- [ ] **Step 1: Create the artistProfile schema**

Create `studio/schemas/documents/artistProfile.ts`.

Fields:
- `name` (string, required)
- `portrait` (figure)
- `bio` (blockContent, required)
- `shortBio` (text, 3 rows)
- `socialLinks` (array of objects: {platform: string required, url: url required})
- `substackUrl` (url)

Preview: show name and portrait.

- [ ] **Step 2: Commit**

```bash
git add studio/schemas/documents/artistProfile.ts
git commit -m "feat(studio): add artistProfile singleton schema for DAOS"
```

---

### Task 5: Modify `artwork` schema — add `forSale`, update category enum

**Files:**
- Modify: `studio/schemas/documents/artwork.ts`

- [ ] **Step 1: Read current artwork.ts**

Read `studio/schemas/documents/artwork.ts` to see the current field definitions.

- [ ] **Step 2: Update the category enum**

Remove `{ title: 'Writing', value: 'writing' }` and `{ title: 'Other', value: 'other' }` from the category options list. Remaining values: painting, drawing, mixed-media, print.

- [ ] **Step 3: Add the forSale field**

Add after the `printOptions` field (after line 131) to keep print-related fields grouped together:
```typescript
defineField({
  name: 'forSale',
  title: 'Listed for Sale',
  type: 'boolean',
  description: 'When true, this piece appears in the Shop. Can be true even if original is sold (if prints are available).',
  initialValue: false,
}),
```

- [ ] **Step 4: Verify no syntax errors**

Run: `cd studio && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors in artwork.ts

- [ ] **Step 5: Commit**

```bash
git add studio/schemas/documents/artwork.ts
git commit -m "feat(studio): add forSale field and update category enum on artwork schema"
```

---

### Task 6: Register new schemas and update Studio structure

**Files:**
- Modify: `studio/schemas/index.ts`
- Modify: `studio/structure.ts`

- [ ] **Step 1: Read current files**

Read `studio/schemas/index.ts` and `studio/structure.ts`.

- [ ] **Step 2: Register new schema types in `studio/schemas/index.ts`**

Add imports after the existing DAOS document imports (after line 11 `import artCollection`):
```typescript
import book from './documents/book';
import writingPiece from './documents/writingPiece';
import event from './documents/event';
import artistProfile from './documents/artistProfile';
```

Add to `schemaTypes` array after `artCollection`:
```typescript
  book,
  writingPiece,
  event,
  artistProfile,
```

- [ ] **Step 3: Update Studio structure in `studio/structure.ts`**

Replace the "Design & Other Stories Section" (lines 43-99) with the updated structure that includes:
- Books (documentTypeList, ordered by order asc)
- Writing Pieces (documentTypeList, ordered by publishedDate desc)
- Events (documentTypeList, ordered by startDate desc)
- Divider
- Artwork (existing, unchanged)
- By Category (remove Writing, remove Other, keep: Paintings, Drawings, Mixed Media, Prints)
- Collections (existing, unchanged)
- Divider
- Artist Profile (singleton using `S.document().schemaType('artistProfile').documentId('artistProfile')`)

- [ ] **Step 4: Verify Studio compiles**

Run: `cd studio && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add studio/schemas/index.ts studio/structure.ts
git commit -m "feat(studio): register new DAOS schemas and update Studio structure"
```

---

### Task 7: Add new GROQ queries to shared-ui

**Files:**
- Modify: `packages/shared-ui/src/sanity.ts`

- [ ] **Step 1: Read current sanity.ts**

Read `packages/shared-ui/src/sanity.ts` to understand the existing query structure and placement.

- [ ] **Step 2: Update `artworkBySlug` to include `forSale`**

Add `forSale,` after `printsAvailable,` in the `artworkBySlug` query projection (around line 219).

- [ ] **Step 3: Add new DAOS queries**

Add the following queries to the `queries` object, after the existing `allCollections` query and before the `// Incubator queries` comment. See the spec's "Data Fetching > Sanity Queries" section for the full query definitions with projections:

- `allBooks` — ordered by order asc
- `bookBySlug` — single book with fromThisWorld expansion
- `featuredBooks` — top 3 featured books
- `allWritingPieces` — ordered by publishedDate desc, with book reference expansion
- `writingByBook` — filtered by book._ref
- `upcomingEvents` — startDate >= now(), ordered asc
- `pastEvents` — startDate < now(), ordered desc
- `nextEvent` — first upcoming event
- `eventBySlug` — single event with bringingArtwork/bringingBooks expansion
- `artistProfile` — singleton fetch
- `featuredArtwork` — top 4 featured artwork
- `artworkForSale` — forSale == true with pricing fields
- `artworkByCollectionSlug` — artwork by collection slug join
- `collectionBySlug` — single collection

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd packages/shared-ui && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add packages/shared-ui/src/sanity.ts
git commit -m "feat(shared-ui): add GROQ queries for DAOS books, events, writing, and artist profile"
```

---

### Task 8: Switch DAOS to hybrid mode + create config and substack utilities

**Files:**
- Modify: `apps/designandotherstories/astro.config.mjs`
- Create: `apps/designandotherstories/src/lib/config.ts`
- Create: `apps/designandotherstories/src/lib/substack.ts`

- [ ] **Step 1: Read current astro.config.mjs**

Read `apps/designandotherstories/astro.config.mjs`.

- [ ] **Step 2: Install Vercel adapter if needed and update Astro config**

First check if `@astrojs/vercel` is installed: run `npm ls @astrojs/vercel`. If not found, install it: `npm install @astrojs/vercel -w apps/designandotherstories`. Then change `output: 'static'` to `output: 'hybrid'` (or add the field if missing). Add `import vercel from '@astrojs/vercel/serverless'` and add `adapter: vercel()` to the config. Check how `apps/madebylakeshore/astro.config.mjs` is configured since it already uses hybrid mode — follow the same pattern.

- [ ] **Step 3: Create site config constants**

Create `apps/designandotherstories/src/lib/config.ts` with:
- `SHOP_PLATFORM` constant (type: `'snipcart' | 'etsy' | 'inquiry' | null`, default: `'snipcart'`)
- `SUBSTACK_URL` = `'https://designandtheotherstories.substack.com'`
- `SUBSTACK_FEED_URL` = `${SUBSTACK_URL}/feed`
- `SUBSTACK_EMBED_URL` = `${SUBSTACK_URL}/embed`

- [ ] **Step 4: Create Substack RSS utility**

Create `apps/designandotherstories/src/lib/substack.ts` with:
- `SubstackPost` interface: title, link, excerpt, pubDate, coverImage (string|null), categories (string[])
- `fetchSubstackFeed(tag?: string): Promise<SubstackPost[]>` — fetches RSS with 5s timeout, parses XML using regex (no external XML parser dependency), filters by tag if provided, returns empty array on any failure with console.error logging
- `parseRssFeed(xml: string, tag?: string)` helper — extracts `<item>` blocks, pulls title/link/description/pubDate/enclosure/category fields, strips HTML from description for excerpt (max 200 chars)
- `SUBSTACK_FALLBACK_URL` export for empty state links

- [ ] **Step 5: Commit**

```bash
git add apps/designandotherstories/astro.config.mjs apps/designandotherstories/src/lib/config.ts apps/designandotherstories/src/lib/substack.ts
git commit -m "feat(daos): switch to hybrid mode, add site config and Substack RSS utility"
```

---

### Task 9: Update vercel.json — redirects and CSP

**Files:**
- Modify: `apps/designandotherstories/vercel.json`

- [ ] **Step 1: Read current vercel.json**

Read `apps/designandotherstories/vercel.json` to see the current headers and structure.

- [ ] **Step 2: Add redirects**

Add a `redirects` array at the top level:
```json
"redirects": [
  { "source": "/paintings", "destination": "/gallery?category=painting", "permanent": true },
  { "source": "/drawings", "destination": "/gallery?category=drawing", "permanent": true }
]
```

- [ ] **Step 3: Update CSP for Substack embed**

In the Content-Security-Policy header value, add `frame-src https://designandtheotherstories.substack.com` to allow the Substack embed iframe.

- [ ] **Step 4: Commit**

```bash
git add apps/designandotherstories/vercel.json
git commit -m "feat(daos): add redirects for old routes and CSP for Substack embed"
```

---

## Chunk 2: Shared Components and Layout Updates

### Task 10: Create shared utility components

**Files:**
- Create: `apps/designandotherstories/src/components/SectionHeader.astro`
- Create: `apps/designandotherstories/src/components/SubstackEmbed.astro`

- [ ] **Step 1: Create SectionHeader component**

Create a reusable section header with:
- Props: `title` (string), `subtitle` (string?), `viewAllHref` (string?), `viewAllText` (string, default 'View all')
- Layout: flex row, title left (xs uppercase tracking text in daos-clay), optional "View all ->" link right in daos-terracotta
- Optional subtitle below title in daos-charcoal

- [ ] **Step 2: Create SubstackEmbed component**

Create a wrapper for the Substack subscribe iframe:
- Import `SUBSTACK_EMBED_URL` from config
- Render iframe with width 100%, height 150, styled to match DAOS brand (daos-warm border, daos-cream background, rounded corners)
- Include `title` attribute for accessibility

- [ ] **Step 3: Commit**

```bash
git add apps/designandotherstories/src/components/SectionHeader.astro apps/designandotherstories/src/components/SubstackEmbed.astro
git commit -m "feat(daos): add SectionHeader and SubstackEmbed shared components"
```

---

### Task 11: Update Navigation component

**Files:**
- Modify: `apps/designandotherstories/src/components/Navigation.astro`

- [ ] **Step 1: Read current Navigation.astro**

Read `apps/designandotherstories/src/components/Navigation.astro` to understand the current nav links and cart button structure.

- [ ] **Step 2: Update navigation links and conditional cart**

Update desktop and mobile nav links to: Writing (`/writing`), Gallery (`/gallery`), Events (`/events`), About (`/about`), Shop (`/shop`). "Home" is handled by the logo/brand link (clicking "Design & Other Stories" in the header navigates to `/`), so it does not need a separate nav link.

Import `SHOP_PLATFORM` from `../lib/config`. Wrap the Snipcart cart button in a conditional: only render when `SHOP_PLATFORM === 'snipcart'`.

Keep the existing brand logo, mobile menu toggle, and styling. Maintain active link highlighting using `Astro.url.pathname`.

- [ ] **Step 3: Verify the component renders without errors**

Run: `cd apps/designandotherstories && npx astro check 2>&1 | tail -10`
Expected: No errors in Navigation.astro

- [ ] **Step 4: Commit**

```bash
git add apps/designandotherstories/src/components/Navigation.astro
git commit -m "feat(daos): update Navigation with new section links and conditional cart"
```

---

### Task 12: Update Footer component

**Files:**
- Modify: `apps/designandotherstories/src/components/Footer.astro`

- [ ] **Step 1: Read current Footer.astro**

Read `apps/designandotherstories/src/components/Footer.astro`.

- [ ] **Step 2: Update Footer with new links**

Update the footer navigation links to match the new site map: Writing, Gallery, Events, About, Shop. Add a Substack link in the social/info section. Fetch `artistProfile` query to get `shortBio` and display it in the brand description section (replacing any hardcoded text). Keep the MadeByLakeshore reference and copyright. Maintain the three-column layout and existing brand styling.

- [ ] **Step 3: Commit**

```bash
git add apps/designandotherstories/src/components/Footer.astro
git commit -m "feat(daos): update Footer with new nav links and Substack reference"
```

---

### Task 13: Update BaseLayout — conditional Snipcart

**Files:**
- Modify: `apps/designandotherstories/src/layouts/BaseLayout.astro`

- [ ] **Step 1: Read current BaseLayout.astro**

Read `apps/designandotherstories/src/layouts/BaseLayout.astro` to see the Snipcart script/link integration.

- [ ] **Step 2: Make Snipcart loading conditional**

Add a `showSnipcart` prop (default `false`). Only include the Snipcart `<link>` and `<script>` tags when `showSnipcart` is true. This prevents loading Snipcart JS on non-shop pages, improving performance.

- [ ] **Step 3: Commit**

```bash
git add apps/designandotherstories/src/layouts/BaseLayout.astro
git commit -m "feat(daos): make Snipcart loading conditional in BaseLayout"
```

---

## Chunk 3: Writing Section

### Task 14: Create BookCard component

**Files:**
- Create: `apps/designandotherstories/src/components/BookCard.astro`

- [ ] **Step 1: Create BookCard component**

Props: `title`, `slug` ({current: string}), `coverImage` (any), `blurb` (string), `type` (string), `status` (string?)

Layout:
- Link wrapping the card, href to `/writing/${slug.current}`
- Cover image in 2:3 aspect ratio, using `urlFor(coverImage).width(400).height(600).fit('crop').crop('focalpoint')`
- Status badge (Coming Soon / In Progress) positioned absolute top-right in daos-terracotta
- Title in font-display, type label below in font-sans, blurb in font-body with line-clamp-3
- Paper background (`bg-daos-paper`), rounded corners, hover shadow

- [ ] **Step 2: Commit**

```bash
git add apps/designandotherstories/src/components/BookCard.astro
git commit -m "feat(daos): add BookCard component for writing section"
```

---

### Task 15: Create SubstackFeedCard and SubstackFeed components

**Files:**
- Create: `apps/designandotherstories/src/components/SubstackFeedCard.astro`
- Create: `apps/designandotherstories/src/components/SubstackFeed.astro`

- [ ] **Step 1: Create SubstackFeedCard component**

Props: `title`, `link`, `excerpt`, `coverImage` (string|null), `type` (string?)

Layout: horizontal card (flex row) — thumbnail (80x60 rounded), title + excerpt (flex-1), type tag badge (daos-sage border). Links to Substack (target="_blank"). Paper background, hover shadow.

- [ ] **Step 2: Create SubstackFeed component**

Props: `tag` (string?), `limit` (number, default 5)

Behavior:
- Calls `fetchSubstackFeed(tag)` from `../lib/substack`
- Renders SectionHeader with "Latest from Substack" title and "Subscribe" link to SUBSTACK_FALLBACK_URL
- Maps posts to SubstackFeedCard components
- Empty state: "Visit us on Substack" fallback link when no posts returned

- [ ] **Step 3: Commit**

```bash
git add apps/designandotherstories/src/components/SubstackFeedCard.astro apps/designandotherstories/src/components/SubstackFeed.astro
git commit -m "feat(daos): add SubstackFeed and SubstackFeedCard components"
```

---

### Task 16: Create PurchaseLinks and FromThisWorld components

**Files:**
- Create: `apps/designandotherstories/src/components/PurchaseLinks.astro`
- Create: `apps/designandotherstories/src/components/FromThisWorld.astro`

- [ ] **Step 1: Create PurchaseLinks component**

Props: `links` (array of {platform: string, url: string})

Layout: flex-wrap row of buttons. First link gets primary style (bg-daos-terracotta), subsequent links get outline style (border-daos-warm). All open in new tab.

- [ ] **Step 2: Create FromThisWorld component**

Props: `items` (array of {_id, _type, title, slug?, coverImage?, type?, status?, substackUrl?})

Layout:
- SectionHeader "From This World"
- 2-column grid of cards
- Each card: small cover thumbnail (50x65), title, type label
- Books link to `/writing/${slug.current}`, writingPieces link to their `substackUrl` (target="_blank")
- Paper background, hover shadow
- Only renders if items array is non-empty

- [ ] **Step 3: Commit**

```bash
git add apps/designandotherstories/src/components/PurchaseLinks.astro apps/designandotherstories/src/components/FromThisWorld.astro
git commit -m "feat(daos): add PurchaseLinks and FromThisWorld components for book detail"
```

---

### Task 17: Create RelatedSubstackPosts React island

**Files:**
- Create: `apps/designandotherstories/src/components/RelatedSubstackPosts.tsx`

- [ ] **Step 1: Create the React island component**

Props: `substackTag` (string), `feedUrl` (string), `fallbackUrl` (string)

Behavior:
- Client-side fetch of RSS feed URL using `DOMParser` to parse XML in the browser
- Filter posts by `substackTag` (case-insensitive match on categories)
- Show up to 3 related posts
- Loading state: "Loading related posts..." text
- Error/empty state: render nothing (return null) — graceful degradation
- Each post renders as a horizontal card: thumbnail, title, category tag, "Read ->" link
- Use inline styles for font-family since Tailwind classes may not be available in React islands without configuration

Note: this component is mounted with `client:idle` directive in Astro, so it only hydrates when the page is idle.

- [ ] **Step 2: Commit**

```bash
git add apps/designandotherstories/src/components/RelatedSubstackPosts.tsx
git commit -m "feat(daos): add RelatedSubstackPosts React island for book detail pages"
```

---

### Task 18: Create Writing hub page and Book detail page

**Files:**
- Create: `apps/designandotherstories/src/pages/writing/index.astro`
- Create: `apps/designandotherstories/src/pages/writing/[slug].astro`

- [ ] **Step 1: Create Writing hub page (SSR)**

Add `export const prerender = false` for SSR.

Layout:
- Page header: "Writing" (display font, italic), subtitle
- Books section: SectionHeader "Books", 3-column grid of BookCards from `allBooks` query
- Substack section: SubstackFeed component (limit 5)

- [ ] **Step 2: Create Book detail page (static)**

Uses `getStaticPaths()` fetching all book slugs from `allBooks`.

Layout:
- Two-column grid: cover image (left, using urlFor with 600x900), details (right)
- Details: type badge, status badge, title (display font), blurb, PurchaseLinks
- Extended description: blockContent rendering. First check if `@portabletext/astro` is already in the workspace dependencies. If so, use it. If not, install it (`npm install @portabletext/astro -w apps/designandotherstories`) and use `<PortableText value={book.description} />`. Also check `apps/madebylakeshore/` for any existing blockContent rendering pattern to stay consistent.
- FromThisWorld section (from `fromThisWorld` references)
- RelatedSubstackPosts React island (client:idle, only if `substackTag` is set)

- [ ] **Step 3: Verify writing pages build**

Run: `cd apps/designandotherstories && npx astro check 2>&1 | tail -20`

- [ ] **Step 4: Commit**

```bash
git add apps/designandotherstories/src/pages/writing/
git commit -m "feat(daos): add Writing hub and Book detail pages"
```

---

## Chunk 4: Gallery and Shop Sections

### Task 19: Create GalleryCard component

**Files:**
- Create: `apps/designandotherstories/src/components/GalleryCard.astro`

- [ ] **Step 1: Create GalleryCard component**

Props: `title`, `slug` ({current: string}), `images` (any[]), `medium` (string?), `category` (string?), `collectionTitle` (string?), `collectionSlug` (string?)

Layout:
- Link to `/gallery/${slug.current}`
- **Uniform 3:4 aspect ratio** image container using `urlFor(images[0]).width(400).height(533).fit('crop').crop('focalpoint')`
- Hover overlay: semi-transparent daos-ink with "View Details" text (fade in on hover)
- Below image: title (font-display), medium (font-sans), optional collection link (daos-sage, underlined)
- Paper background, rounded corners, hover shadow

- [ ] **Step 2: Commit**

```bash
git add apps/designandotherstories/src/components/GalleryCard.astro
git commit -m "feat(daos): add GalleryCard component with uniform 3:4 aspect ratio"
```

---

### Task 20: Create GalleryGrid component

**Files:**
- Create: `apps/designandotherstories/src/components/GalleryGrid.astro`

- [ ] **Step 1: Create GalleryGrid component with filter pills**

Props: `artwork` (array), `showFilters` (boolean, default true)

Filter pills: All, Paintings (painting), Drawings (drawing), Mixed Media (mixed-media), Prints (print), Collections. Read active filter from URL query param `?category=`. Active pill: bg-daos-ink text-daos-cream. Inactive: border-daos-clay, hover border/text daos-terracotta.

Grid: 2-col mobile, 3-col md, 4-col lg. Gap-4. Renders GalleryCard for each filtered artwork.

**Static page filtering note:** Since the Gallery page is statically rendered, URL query params (`?category=`) are not available at build time via `Astro.url.searchParams`. Implement client-side filtering: render all artwork in the HTML, then use a small inline `<script>` to read the query param and toggle `hidden` attributes on cards that don't match the filter. Filter pills are regular `<a>` links that trigger page navigation with the query param; the script runs on page load to apply the filter.

"Collections" pill links to a separate collections listing. Create a simple `/gallery/collections/index.astro` page that lists all collections as cards linking to `/gallery/collections/[slug]`. The Collections pill in GalleryGrid links to `/gallery/collections`.

- [ ] **Step 2: Commit**

```bash
git add apps/designandotherstories/src/components/GalleryGrid.astro
git commit -m "feat(daos): add GalleryGrid component with category filter pills"
```

---

### Task 21: Create ImageViewer React island

**Files:**
- Create: `apps/designandotherstories/src/components/ImageViewer.tsx`

- [ ] **Step 1: Create the ImageViewer component**

Props: `images` (array of {url: string, alt: string, thumbUrl: string})

Behavior:
- State: `activeIndex` (default 0)
- Main image area: aspect-[3/4], object-contain, rounded, paper background
- Thumbnail strip below (only if more than 1 image): row of 64x64 buttons, active has daos-terracotta border, others transparent/hover daos-clay border
- Click thumbnail to switch active image

- [ ] **Step 2: Commit**

```bash
git add apps/designandotherstories/src/components/ImageViewer.tsx
git commit -m "feat(daos): add ImageViewer React island for multi-image artwork viewing"
```

---

### Task 22: Create PurchaseAction and CheckoutButton components

**Files:**
- Create: `apps/designandotherstories/src/components/PurchaseAction.astro`
- Create: `apps/designandotherstories/src/components/CheckoutButton.astro`

- [ ] **Step 1: Create CheckoutButton component**

Props: `title`, `price` (number), `slug` (string), `image` (string?), `label` (string, default 'Add to Cart')

Import `SHOP_PLATFORM` from config. Render conditionally:
- `snipcart`: Snipcart add-to-cart button with data attributes
- `etsy`: Link styled as button saying "View on Etsy"
- default/null: mailto inquiry link

- [ ] **Step 2: Create PurchaseAction component**

Props: `title`, `slug`, `price` (number?), `originalAvailable` (boolean?), `printsAvailable` (boolean?), `image` (string?)

Layout:
- Top border separator
- Price display (line-through if sold) + availability label
- CheckoutButton (only if originalAvailable or printsAvailable, and price exists)
- "Original sold — prints still available" text when applicable

- [ ] **Step 3: Commit**

```bash
git add apps/designandotherstories/src/components/PurchaseAction.astro apps/designandotherstories/src/components/CheckoutButton.astro
git commit -m "feat(daos): add PurchaseAction and CheckoutButton with pluggable checkout"
```

---

### Task 23: Create ShopCard component

**Files:**
- Create: `apps/designandotherstories/src/components/ShopCard.astro`

- [ ] **Step 1: Create ShopCard component**

Props: `title`, `slug` ({current: string}), `images` (any[]), `medium` (string?), `price` (number?), `originalAvailable` (boolean?), `printsAvailable` (boolean?)

Layout:
- Uniform 3:4 aspect ratio image (same as GalleryCard)
- "Sold" badge (top-left, daos-charcoal bg) when !originalAvailable
- Dimmed opacity when sold with no prints
- Below image: title, "Original/Print · medium" label, price + CTA row
- Sold items: line-through price + "Prints available ->" link to gallery detail
- Available items: price + CheckoutButton

- [ ] **Step 2: Commit**

```bash
git add apps/designandotherstories/src/components/ShopCard.astro
git commit -m "feat(daos): add ShopCard component with price and purchase CTA"
```

---

### Task 24: Create Gallery pages

**Files:**
- Create: `apps/designandotherstories/src/pages/gallery/index.astro`
- Create: `apps/designandotherstories/src/pages/gallery/[slug].astro`
- Create: `apps/designandotherstories/src/pages/gallery/collections/[slug].astro`

- [ ] **Step 1: Create Gallery hub page**

Static page. Fetch `allArtwork` query. Render page header ("Gallery", subtitle) + GalleryGrid with filters enabled.

- [ ] **Step 2: Create Artwork detail page**

Static page with `getStaticPaths()` from all artwork slugs.

Two-column layout:
- Left: ImageViewer React island (`client:visible`) — build image array from artwork.images using urlFor for both main (800px wide) and thumb (160px) URLs
- Right sidebar: category badge, title (display font italic), medium/dimensions/year, artist story (italic blockquote), collection link, PurchaseAction (only if forSale)
- Below: description blockContent rendering

- [ ] **Step 3: Create Collection view page**

Static page with `getStaticPaths()` from `allCollections` slugs.

Fetch `collectionBySlug` and `artworkByCollectionSlug`. Render collection header (title, description, coverImage) above GalleryGrid (filters hidden).

- [ ] **Step 4: Commit**

```bash
git add apps/designandotherstories/src/pages/gallery/
git commit -m "feat(daos): add Gallery hub, Artwork detail, and Collection view pages"
```

---

### Task 25: Create Shop page

**Files:**
- Create: `apps/designandotherstories/src/pages/shop.astro`

- [ ] **Step 1: Create Shop page**

Static page. Fetch `artworkForSale` query. Pass `showSnipcart={true}` to BaseLayout.

Filter pills: All, Originals, Prints. Same client-side filtering approach as Gallery: render all items, use inline `<script>` to read `?filter=` query param and toggle visibility. Filter logic:
- all: show everything
- originals: filter where `originalAvailable === true`
- prints: filter where `printsAvailable === true`

Render 3-column grid of ShopCards.

- [ ] **Step 2: Commit**

```bash
git add apps/designandotherstories/src/pages/shop.astro
git commit -m "feat(daos): add Shop page with filter pills and ShopCard grid"
```

---

## Chunk 5: Events, About, and Homepage

### Task 26: Create EventCard and BringingGrid components

**Files:**
- Create: `apps/designandotherstories/src/components/EventCard.astro`
- Create: `apps/designandotherstories/src/components/BringingGrid.astro`

- [ ] **Step 1: Create EventCard component**

Props: `title`, `slug` ({current: string}), `startDate` (string), `endDate` (string?), `location` ({venueName?, city, state?}), `eventType` (string?), `isPast` (boolean, default false)

Layout: horizontal card with date block (day/month), title + location, "Details ->" link.
- Date: large day number in terracotta (or sage if past), month abbreviation below
- Vertical border separator
- Title: font-display, past events smaller + muted
- Past events: reduced opacity, muted styling, but still link to detail page (archive). Hide the "Details ->" text but keep the whole card clickable.
- Paper background, hover shadow (upcoming only)

- [ ] **Step 2: Create BringingGrid component**

Props: `artwork` (array of referenced artwork), `books` (array of referenced books)

Layout:
- SectionHeader "What I'm Bringing"
- 2-column grid of small thumbnail cards
- Artwork cards: image (urlFor 200x150), title, category label, link to `/gallery/[slug]`
- Book cards: coverImage (urlFor 200x150), title, "Book" label, link to `/writing/[slug]`
- Only renders if at least one item exists

- [ ] **Step 3: Commit**

```bash
git add apps/designandotherstories/src/components/EventCard.astro apps/designandotherstories/src/components/BringingGrid.astro
git commit -m "feat(daos): add EventCard and BringingGrid components for events section"
```

---

### Task 27: Create Events pages

**Files:**
- Create: `apps/designandotherstories/src/pages/events/index.astro`
- Create: `apps/designandotherstories/src/pages/events/[slug].astro`

- [ ] **Step 1: Create Events hub page (SSR)**

Add `export const prerender = false` for SSR.

Fetch both `upcomingEvents` and `pastEvents`. Render:
- Page header: "Events" (display font), subtitle
- Upcoming section: SectionHeader "Upcoming", list of EventCards. Empty state if none.
- Past Events section: SectionHeader "Past Events", list of EventCards with `isPast={true}`. Only render section if past events exist.

- [ ] **Step 2: Create Event detail page (static)**

Uses `getStaticPaths()` — fetch all events with a custom GROQ query: `*[_type == "event"]{ slug }` to get all slugs regardless of date. This avoids the race condition of `upcomingEvents` + `pastEvents` potentially missing events exactly at the boundary.

Two-column layout:
- Left: event type badge, formatted dates, location details, description (blockContent), external URL link
- Right: BringingGrid with referenced artwork and books

- [ ] **Step 3: Commit**

```bash
git add apps/designandotherstories/src/pages/events/
git commit -m "feat(daos): add Events hub and Event detail pages"
```

---

### Task 28: Create About page

**Files:**
- Create: `apps/designandotherstories/src/pages/about.astro`

- [ ] **Step 1: Create About page**

Static page. Fetch `artistProfile` query.

Two-column layout:
- Left: portrait image (urlFor 600x750, rounded, shadow)
- Right: "About the Artist" title (display font), bio (blockContent), social link buttons (outline style, daos-clay border)

Handle null profile gracefully — show placeholder text if the artistProfile singleton hasn't been created yet.

- [ ] **Step 2: Commit**

```bash
git add apps/designandotherstories/src/pages/about.astro
git commit -m "feat(daos): add About the Artist page"
```

---

### Task 29: Create Homepage components and rewrite index.astro

**Files:**
- Create: `apps/designandotherstories/src/components/HeroSection.astro`
- Modify: `apps/designandotherstories/src/pages/index.astro`

- [ ] **Step 1: Create HeroSection component**

Full-width centered section:
- "Design & Other Stories" label (xs uppercase, tracking, daos-terracotta)
- "Art. Words. Worlds." headline (display-lg/display-xl font, italic, daos-ink)
- Subtitle (daos-charcoal, font-body)
- Generous vertical padding (py-20 md:py-28)

- [ ] **Step 2: Rewrite the homepage**

Replace the existing `index.astro` content. The homepage is static (default in hybrid mode).

Fetch: `featuredBooks` (up to 2), `featuredArtwork` (up to 4), `nextEvent`. Also call `fetchSubstackFeed()` to get the latest Substack post for the writing section (the homepage is static, so this is fetched at build time).

Sections:
1. HeroSection
2. Featured Writing: SectionHeader "Writing" with viewAllHref="/writing", 3-col grid showing up to 2 BookCards + 1 SubstackFeedCard (latest post). This matches the spec's "3 cards (mix of books + latest Substack post)."
3. Featured Gallery: SectionHeader "Gallery" with viewAllHref="/gallery", 4-col grid of GalleryCards
4. Next Event: SectionHeader "Next Event" with viewAllHref="/events", single EventCard (skip section if no upcoming event)
5. Newsletter: centered "Stay Connected" text + SubstackEmbed

Each section separated by section-spacing padding and subtle borders or whitespace.

- [ ] **Step 3: Verify the site builds**

Run: `cd apps/designandotherstories && npx astro check 2>&1 | tail -20`
Expected: No blocking errors

- [ ] **Step 4: Commit**

```bash
git add apps/designandotherstories/src/components/HeroSection.astro apps/designandotherstories/src/pages/index.astro
git commit -m "feat(daos): rewrite homepage with sectioned layout for all pillars"
```

---

## Chunk 6: Final Integration

### Task 30: Verify full build and fix any issues

**Files:** All modified/created files

- [ ] **Step 1: Run full TypeScript check**

Run: `cd apps/designandotherstories && npx astro check 2>&1`
Fix any type errors found.

- [ ] **Step 2: Run full build**

Run: `cd apps/designandotherstories && npm run build 2>&1 | tail -30`
Fix any build errors found.

- [ ] **Step 3: Start dev server and verify pages return 200**

Run: `npm run dev:daos &` (background), then use `curl -s -o /dev/null -w "%{http_code}" http://localhost:4322/` to check each route returns 200:
- `/` — homepage
- `/writing` — writing hub
- `/gallery` — gallery hub
- `/events` — events hub
- `/about` — about page
- `/shop` — shop page

If any route returns non-200, investigate and fix.

- [ ] **Step 4: Verify SSR pages have prerender = false**

Run: `grep -l "prerender = false" apps/designandotherstories/src/pages/**/*.astro`
Expected: `writing/index.astro` and `events/index.astro` should appear.

- [ ] **Step 5: Commit any fixes**

```bash
git status  # Review what changed
git add <specific files that were fixed>
git commit -m "fix(daos): resolve build issues from redesign integration"
```

---

### Task 31: Verify redirects and Substack embed

- [ ] **Step 1: Verify vercel.json redirects are configured correctly**

Read `apps/designandotherstories/vercel.json` and confirm the redirects array is properly formatted. (Redirects only activate on Vercel deployment, not local dev.)

- [ ] **Step 2: Verify Substack embed is in homepage HTML**

Run: `curl -s http://localhost:4322/ | grep -c "designandtheotherstories.substack.com/embed"`
Expected: at least 1 match, confirming the iframe src is present in the rendered HTML.

- [ ] **Step 3: Final commit if needed**

```bash
git status  # Review what changed
git add <specific files if any fixes were needed>
git commit -m "chore(daos): final integration verification"
```
