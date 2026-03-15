# Design & Other Stories — Redesign Spec

**Date:** 2026-03-15
**Status:** Approved
**Approach:** Sanity-First Hybrid (Approach A)

## Overview

Redesign Design & Other Stories from a single-purpose art shop into a multi-section artist platform with five co-equal pillars: Writing, Gallery, Events, About, and Shop. All owned content lives in Sanity CMS. Substack content is pulled via RSS at request time. Shop checkout is platform-agnostic (pluggable provider).

## Architecture Decisions

- **Rendering:** Switch from `output: 'static'` to `output: 'hybrid'`. Pages needing fresh external data (Writing hub, Events hub) use SSR. Everything else pre-renders at build time.
- **Content:** All owned content (books, artwork, events, artist bio) managed in Sanity. Substack posts fetched via RSS — no Sanity storage for external content.
- **Gallery/Shop relationship:** Single `artwork` content type with a `forSale` boolean. Gallery is the primary browsing experience; Shop is a filtered view of purchasable items.
- **Shop checkout:** Pluggable — a `CheckoutButton` component reads config to render Snipcart, Etsy link, or inquiry form. Platform decision deferred.
- **Newsletter:** Replace current email form with Substack embed widget (`designandtheotherstories.substack.com/embed`).
- **Brand identity:** Existing DAOS brand system carries forward unchanged — cream/paper palette, Playfair Display + Libre Baskerville + Work Sans typography, terracotta accents, paper texture overlay, gentle animations.

## Site Map

```
/ .......................... Home (hero + curated samples from each section)
/writing ................... Writing hub (books grid + Substack feed) [SSR]
/writing/[slug] ............ Book detail (cover, blurb, status, "from this world", purchase links)
/gallery ................... Gallery hub (filterable artwork grid)
/gallery/[slug] ............ Artwork detail (images, story, medium, dimensions, purchase if forSale)
/gallery/collections/[slug]  Collection view (grouped artworks)
/events .................... Events hub (upcoming + past archive) [SSR]
/events/[slug] ............. Event detail (when, where, "what I'm bringing")
/about ..................... About the Artist (bio, portrait, social links)
/shop ...................... Shop (forSale artwork, price + purchase CTA)
```

## Sanity Schemas

### New: `book`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| title | string | yes | |
| slug | slug | yes | Auto from title |
| coverImage | figure | yes | |
| blurb | text | yes | Short description |
| description | blockContent | no | Extended rich text |
| type | string | yes | Enum: novel, novella, short-story-collection, poetry |
| status | string | no | Enum: published, coming-soon, in-progress |
| publishedDate | date | no | |
| fromThisWorld | array of references → book, writingPiece | no | Related books and writing pieces in same universe |
| purchaseLinks | array of {platform: string, url: url} | no | Amazon, Bookshop.org, etc. |
| substackTag | string | no | Filter RSS feed for related Substack posts |
| featured | boolean | no | Default false |
| order | number | no | Display ordering |
| seo | seo | no | |

### New: `writingPiece`

For short stories, essays, and standalone writing that lives on Substack but gets a card on the site. These do not have their own pages on the DAOS site — they link out to Substack.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| title | string | yes | |
| coverImage | figure | no | |
| excerpt | text | no | Preview text |
| type | string | yes | Enum: short-story, essay, poem, serial-chapter |
| book | reference → book | no | Parent book/world |
| substackUrl | url | yes | Link to read on Substack |
| publishedDate | date | no | |
| featured | boolean | no | |
| tags | array of strings | no | |

### New: `event`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| title | string | yes | |
| slug | slug | yes | |
| eventType | string | no | Enum: art-fair, market, exhibition, book-signing, workshop, other |
| startDate | datetime | yes | |
| endDate | datetime | no | |
| location | object | yes | Contains: venueName (string), address (string), city (string, required), state (string) |
| description | blockContent | no | |
| coverImage | figure | no | |
| bringingArtwork | array of references → artwork | no | "What I'm bringing" |
| bringingBooks | array of references → book | no | |
| externalUrl | url | no | Link to event website |
| featured | boolean | no | |
| seo | seo | no | |

### New: `artistProfile` (singleton)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | string | yes | |
| portrait | figure | no | |
| bio | blockContent | yes | Rich text artist statement |
| shortBio | text | no | For footer/homepage |
| socialLinks | array of {platform: string, url: url} | no | |
| substackUrl | url | no | |

### Modified: `artwork`

Changes to existing fields:

- **Remove** `writing` from the `category` enum (writing is now its own section). Any existing artwork documents with `category: "writing"` should be migrated to the `writingPiece` type or recategorized before deployment.
- **Remove** the `category` enum value `other` (not used in gallery filters). Remaining values: `painting`, `drawing`, `mixed-media`, `print`.
- The existing fields `originalAvailable`, `printsAvailable`, `price`, and `printOptions` continue to serve their current purpose for tracking availability and pricing.

New fields:

| Field | Type | Notes |
|-------|------|-------|
| forSale | boolean | New — controls appearance in /shop. Derived intent: `true` when the artist wants this piece listed for purchase. Distinct from `originalAvailable` which tracks whether the original is still available. An artwork can be `forSale: true` with `originalAvailable: false` if prints are still sold. |

The existing `originalAvailable` / `printsAvailable` booleans already distinguish originals from prints, so there is no need for a separate `shopCategory` field. Shop filter pills map to these existing fields:
- "All" = all `forSale: true` artwork
- "Originals" = `forSale: true && originalAvailable: true`
- "Prints" = `forSale: true && printsAvailable: true`

### Sanity Studio structure update

Remove the existing "By Category > Writing" filter from the DAOS section in `studio/structure.ts` since the `writing` category value is being removed from the artwork enum.

### Unchanged schemas

- `artCollection` — unchanged
- `figure`, `blockContent`, `seo`, `codeBlock` — unchanged shared objects
- `person`, `blogPost`, `portfolioProject`, `service`, `testimonial`, `digitalProject`, `buildLog` — unchanged (used by other apps)

## Pages & Components

### Home (`/`)

Curated samples from each pillar drawing visitors into the section that resonates.

**Sections:**
1. **Hero** — tagline ("Art. Words. Worlds."), subtitle
2. **Featured Writing** — 3 cards (mix of books + latest Substack post)
3. **Featured Gallery** — 4 artwork thumbnails (uniform 3:4 aspect ratio)
4. **Next Event** — nearest upcoming event with date-prominent card
5. **Newsletter** — Substack embed widget

**Components:**
- `HeroSection.astro` — tagline, subtitle
- `FeaturedWriting.astro` — 3 book/substack cards
- `FeaturedGallery.astro` — 4 artwork thumbnails
- `NextEvent.astro` — nearest upcoming event card
- `SubstackEmbed.astro` — newsletter signup widget

### Writing Hub (`/writing`) — SSR

**Sections:**
1. **Books grid** — all books from Sanity, ordered by `order` field. Cards show cover, title, type, status badge (Coming Soon/In Progress), blurb.
2. **Substack feed** — preview cards fetched from RSS. Each card: thumbnail, title, excerpt, type tag. Links to Substack. "Subscribe" link.

**Components:**
- `BookCard.astro` — cover, title, type, status badge, blurb
- `SubstackFeedCard.astro` — thumbnail, title, excerpt, type tag
- `SubstackFeed.astro` — fetches RSS + renders cards

### Book Detail (`/writing/[slug]`)

Two-column layout: cover image (left) + details (right).

**Sections:**
1. **Cover + metadata** — type badge, title, blurb, purchase link buttons
2. **Extended description** — blockContent rich text
3. **From This World** — grid of related books/writings (from `fromThisWorld` references)
4. **Related Substack posts** — filtered by `substackTag` from RSS feed

**Components:**
- `BookDetail.astro` — full book layout
- `PurchaseLinks.astro` — platform buttons (Amazon, Bookshop.org, etc.)
- `FromThisWorld.astro` — related books/writings grid
- `RelatedSubstackPosts.tsx` — React island: client-side fetch of Substack RSS filtered by `substackTag`, renders preview cards. Only mounted when `substackTag` is set.

### Gallery Hub (`/gallery`)

Filterable grid of all artwork. Category filter pills match the artwork enum: All, Paintings, Drawings, Mixed Media, Prints. Plus a "Collections" filter to browse by collection.

**Key design decision:** All artwork image cards use uniform 3:4 aspect ratio with Sanity hotspot/crop for consistent grid layout.

**Components:**
- `GalleryGrid.astro` — filterable artwork grid with category pills
- `GalleryCard.astro` — artwork thumbnail card (uniform 3:4 ratio, title, medium, optional collection link)

### Artwork Detail (`/gallery/[slug]`)

Large image area (left, with multi-image thumbnail strip) + details sidebar (right).

**Sidebar sections:**
1. Category badge + title
2. Medium, dimensions, year
3. Artist story (italic text)
4. Collection link (if applicable)
5. Purchase section (only if `forSale: true`) — price, availability, buy/inquire CTA

**Components:**
- `ArtworkDetail.astro` — full detail layout
- `ImageViewer.tsx` — React island: multi-image viewer with thumbnail strip
- `PurchaseAction.astro` — price + buy/inquire CTA (pluggable checkout)

### Collection View (`/gallery/collections/[slug]`)

Filtered view of artworks belonging to a specific `artCollection`. Uses same `GalleryGrid` with collection title and description above.

### Events Hub (`/events`) — SSR

Two sections divided by time:

1. **Upcoming** — events where `startDate >= now`, ordered chronologically. Date-prominent cards with day/month block, title, location, event type.
2. **Past Events** — events where `startDate < now`, ordered reverse chronologically. Muted styling (reduced opacity). Serves as archive.

**Components:**
- `EventCard.astro` — date block + title + location (with upcoming vs. past styling variants)

### Event Detail (`/events/[slug]`)

Two-column layout:
1. **Details** (left) — event type badge, dates, when/where, description (blockContent), external URL
2. **What I'm Bringing** (right) — thumbnail grid of referenced artwork and books, linking to their detail pages

**Components:**
- `EventDetail.astro` — full event layout
- `BringingGrid.astro` — referenced artwork/books thumbnail grid

### About (`/about`)

Two-column: portrait (left) + rich text bio (right) + social link buttons. Powered by `artistProfile` singleton — no custom components beyond layout.

### Shop (`/shop`)

Filtered view of artwork where `forSale: true`. Filter pills: All, Originals (`originalAvailable: true`), Prints (`printsAvailable: true`).

Cards show: artwork image (uniform 3:4), title, medium, price, purchase CTA. Sold items (`originalAvailable: false` but `printsAvailable: true`) shown with muted styling + "Prints available" cross-sell link. Items where both `originalAvailable` and `printsAvailable` are false should have `forSale` set to false by the content author — this is an editorial responsibility, not enforced by queries.

**Components:**
- `ShopGrid.astro` — filtered product grid (reuses GalleryGrid filter logic)
- `ShopCard.astro` — artwork + price + CTA (extends GalleryCard with commerce layer)
- `CheckoutButton.astro` — pluggable: renders Snipcart button, Etsy link, or inquiry form based on site config

### Shared / Updated Components

- `Navigation.astro` — updated nav links: Home, Writing, Gallery, Events, About, Shop + mobile menu. Retain existing Snipcart cart button; wrap in a conditional that reads from a site config constant (`SHOP_PLATFORM`). When no shop platform is configured, hide the cart icon entirely.
- `Footer.astro` — updated nav links, Substack link, dynamic shortBio from artistProfile
- `BaseLayout.astro` — conditionally load Snipcart JS only on shop-related pages
- `SubstackEmbed.astro` — new: wraps the Substack subscribe iframe
- `SectionHeader.astro` — new: reusable section title + subtitle + optional "view all" link

## Data Fetching

### Sanity Queries (add to `packages/shared-ui/src/sanity.ts`)

```groq
// Books
allBooks: *[_type == "book"] | order(order asc) {
  _id, title, slug, coverImage, blurb, type, status, publishedDate, featured, order
}

bookBySlug: *[_type == "book" && slug.current == $slug][0] {
  _id, title, slug, coverImage, blurb, description, type, status, publishedDate,
  fromThisWorld[]->{ _id, _type, title, slug, coverImage, type, status, substackUrl },
  purchaseLinks, substackTag, seo
}

featuredBooks: *[_type == "book" && featured == true] | order(order asc)[0...3] {
  _id, title, slug, coverImage, blurb, type, status
}

// Writing Pieces
allWritingPieces: *[_type == "writingPiece"] | order(publishedDate desc) {
  _id, title, coverImage, excerpt, type, book->{ _id, title, slug }, substackUrl, publishedDate, tags
}

// Note: writingByBook is called with the book's _id obtained from the bookBySlug query result
writingByBook: *[_type == "writingPiece" && book._ref == $bookId] | order(publishedDate desc) {
  _id, title, coverImage, excerpt, type, substackUrl, publishedDate
}

// Events
upcomingEvents: *[_type == "event" && startDate >= now()] | order(startDate asc) {
  _id, title, slug, eventType, startDate, endDate, location, coverImage, featured
}

pastEvents: *[_type == "event" && startDate < now()] | order(startDate desc) {
  _id, title, slug, eventType, startDate, endDate, location
}

nextEvent: *[_type == "event" && startDate >= now()] | order(startDate asc)[0] {
  _id, title, slug, eventType, startDate, endDate, location
}

eventBySlug: *[_type == "event" && slug.current == $slug][0] {
  _id, title, slug, eventType, startDate, endDate, location, description, coverImage,
  bringingArtwork[]->{ _id, title, slug, images, category, medium },
  bringingBooks[]->{ _id, title, slug, coverImage, type },
  externalUrl, seo
}

// Artist Profile
artistProfile: *[_type == "artistProfile"][0] {
  name, portrait, bio, shortBio, socialLinks, substackUrl
}

// Artwork (new queries for redesign)
featuredArtwork: *[_type == "artwork" && featured == true] | order(year desc)[0...4] {
  _id, title, slug, category, images, medium
}

artworkForSale: *[_type == "artwork" && forSale == true] | order(year desc) {
  _id, title, slug, category, images, medium, price, originalAvailable, printsAvailable, printOptions
}

artworkByCollectionSlug: *[_type == "artwork" && collection->slug.current == $slug] | order(year desc) {
  _id, title, slug, category, images, medium, price, originalAvailable, forSale
}

collectionBySlug: *[_type == "artCollection" && slug.current == $slug][0] {
  _id, title, slug, description, coverImage
}
```

### Substack RSS

Fetch `https://designandtheotherstories.substack.com/feed` at request time (SSR pages). Parse XML to extract:
- title
- link (URL to read on Substack)
- description (excerpt)
- pubDate
- enclosure (cover image URL)
- category tags

Utility: `src/lib/substack.ts` — `fetchSubstackFeed(tag?: string)` returns parsed posts, optionally filtered by tag. On RSS fetch failure (timeout, 404, malformed XML), returns an empty array and logs the error. Pages render gracefully with an empty state ("Visit us on Substack" fallback link).

## Rendering Strategy

| Page | Mode | Reason |
|------|------|--------|
| `/` | Static | Featured content changes infrequently |
| `/writing` | SSR | Fresh Substack feed |
| `/writing/[slug]` | Static | Book data is from Sanity (static). Related Substack posts loaded client-side via React island if `substackTag` is set. |
| `/gallery` | Static | Artwork changes infrequently |
| `/gallery/[slug]` | Static | |
| `/gallery/collections/[slug]` | Static | |
| `/events` | SSR | Time-based upcoming/past split |
| `/events/[slug]` | Static | Event details don't change often |
| `/about` | Static | |
| `/shop` | Static | Availability updates on rebuild |

## Astro Config Changes

```js
// astro.config.mjs
export default defineConfig({
  site: 'https://designandotherstories.com',
  output: 'hybrid', // changed from 'static'
  integrations: [tailwind(), react()],
});
```

SSR pages opt in with `export const prerender = false` in their frontmatter.

## Sanity Studio Structure

Add new sections to `studio/structure.ts` for DAOS content:

```
Design & Other Stories
├── Books
├── Writing Pieces
├── Events
├── Gallery (existing artwork)
├── Collections (existing artCollection)
└── Artist Profile (singleton)
```

## Implementation Notes

- **Redirects:** Add redirect rules (in `vercel.json`) from old routes (`/paintings`, `/drawings`, `/writing`, `/shop`) to their new equivalents (`/gallery?category=painting`, `/gallery?category=drawing`, `/writing`, `/shop`) to avoid broken bookmarks.
- **Static rebuild trigger:** Static pages (Home, Gallery, Shop) depend on Sanity content. Configure a Sanity webhook to trigger Vercel rebuilds on content changes. This is an existing pattern if already set up for other apps; if not, add during implementation.
- **Data migration:** Before deployment, audit existing artwork documents for `category: "writing"` and migrate them to `writingPiece` type or recategorize.

## Out of Scope

- Shop platform selection (Snipcart vs Etsy vs other) — deferred, designed to be pluggable
- Blog (schema exists but no pages planned for this redesign)
- Contact page (not in the new nav — inquiries go through shop CTAs or Substack)
- Social media profile creation
- Substack content migration (posts stay on Substack, pulled via RSS)
