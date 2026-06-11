# fattamano — Site Design Spec

**Date:** 2026-05-11
**Status:** Draft (awaiting approval)
**Domain:** fattamano.com
**Tagline:** *fatto a mano* — "made by hand, with care" (but funnier than it sounds)

## Overview

fattamano is a new sibling Astro app in this monorepo (`apps/fattamano/`), deployed to its own domain (`fattamano.com`). It is Wilma's playful alter-ego brand selling handmade stickers, t-shirts, and similar small-batch items featuring intentionally stupid/funny phrases and designs. Brand voice is relaxed, hip, and irreverent — a deliberate contrast to the more professional `designandotherstories.com` art platform.

The site is **discoverable from DAOS** via two intentionally-subtle easter eggs (a footer phrase and a clickable artwork signature), but **publicly indexable** by search engines. Hiding is for discovery delight, not site privacy.

Sales platform is intentionally **undecided at v1**. Each product carries a `buyUrl` field that points to wherever the actual checkout happens (Etsy listing, Stripe Payment Link, Shopify embed, mailto inquiry, etc.). The site is the catalog and brand expression; the seller platform is swappable.

## Architecture Decisions

- **App layout:** New Astro app at `apps/fattamano/`, scaffolded by copying `apps/incubator/` (smallest/simplest existing app) and rebranding. Static output (`output: 'static'`) — no SSR needed for v1.
- **Brand tokens:** Tailwind config uses `ft-*` prefix for fattamano-specific tokens, matching the existing per-app convention (`mbl-*`, `daos-*`, `inc-*`).
- **Shared infrastructure:** Imports Sanity client and image URL builder from `@lakeshore/shared-ui`. No fattamano-specific Sanity client.
- **CMS:** Shared Sanity project, new document types prefixed `fattamano*`. Studio gets a **second workspace** named `fattamano` so the cheeky content doesn't clutter the DAOS/MBL nav.
- **Commerce:** Platform-agnostic. Sanity is source of truth for catalog. Each product has a `buyUrl` (string/url) field. No commerce SDK in the codebase at v1.
- **Deployment:** New Vercel project linked to `apps/fattamano/`, custom domain `fattamano.com`, per-app `vercel.json` for security headers (same pattern as other apps).
- **SEO:** Site is publicly indexable. The "hidden" mechanic exists only at the DAOS-side discovery layer. fattamano gets its own sitemap, robots.txt, llms.txt, OG images — same SEO posture as the other apps.
- **Future-proofing for catalog migration:** Slugs are the stable identifier (URLs survive). Sanity `_id` never appears in URLs. Price stored as a number (cents) for clean future migration even though display-only at v1. Schema designed to map cleanly onto a relational product table later.

## Site Map

```
/ ................... Home — hero, brand voice, featured products, "see all"
/things ............. Catalog grid — all products, filterable by category
/things/[slug] ...... Product detail — gallery, description, "buy" CTA
/about .............. About — the fatto-a-mano wordplay, the philosophy, contact
/404 ................ Custom 404 with brand voice + secret nod back to DAOS
```

URL naming note: `/things` instead of `/shop` is a small voice choice — it matches the irreverent tone better and avoids implying a polished e-commerce experience the site doesn't have.

## Sanity Schemas

### New: `fattamanoProduct`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| title | string | yes | The product name |
| slug | slug | yes | Auto from title, stable identifier |
| tagline | string | no | One-line punchline shown on cards |
| description | blockContent | no | Extended copy for product page |
| images | array of figure | yes | First image is the card thumbnail |
| category | string | yes | Enum: `sticker`, `shirt`, `print`, `other` |
| priceCents | number | no | Integer cents (e.g., 500 = $5.00). Display-only at v1; clean for future migration. |
| priceDisplayOverride | string | no | If set, displayed instead of computed price (e.g., "name your price", "free with order") |
| buyUrl | url | no | Where to actually buy. Empty = "DM to buy" displayed instead. |
| status | string | yes | Enum: `available`, `sold_out`, `coming_soon`, `concept` (concept = "might make this if there's interest") |
| dateAdded | datetime | yes | For sorting by recency |
| featured | boolean | no | Default false. Featured products appear on home. |
| tags | array of strings | no | Free-form tags for future filtering |
| seo | seo | no | Reuses existing `seo` object type |

### New: `fattamanoSettings` (singleton)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| heroHeadline | string | yes | Big text on home |
| heroSubcopy | text | no | Smaller copy under headline |
| aboutBody | blockContent | yes | Copy for /about page |
| footerCopy | string | no | Small footer phrase |
| notFoundCopy | blockContent | no | Custom 404 page body |
| contactEmail | string | yes | For "DM to buy" / inquiries |

### Deferred (v2+)

- `fattamanoDrop` — collection/release grouping (e.g., "Spring 2026 stickers"). Defer until there's reason to group products.
- Inventory tracking — not in Sanity. When that's needed, it's the trigger to migrate to a real database.

## Sanity Studio Changes

Convert `studio/sanity.config.ts` from single-config to **workspaces array**:

```ts
export default defineConfig([
  {
    name: 'lakeshore-studios',
    title: 'Lakeshore Studios',
    basePath: '/',
    projectId, dataset,
    plugins: [structureTool({ structure }), visionTool()],
    schema: { types: schemaTypes.filter(t => !t.name.startsWith('fattamano')) },
  },
  {
    name: 'fattamano',
    title: 'fattamano',
    basePath: '/fattamano',
    projectId, dataset,
    plugins: [structureTool({ structure: fattamanoStructure }), visionTool()],
    schema: { types: schemaTypes.filter(t => t.name.startsWith('fattamano')) },
    theme: { /* optional: distinct color so it's obvious which workspace you're in */ },
  },
]);
```

Workspaces share the project and dataset (so cross-references work if ever needed), but separate the studio UI cleanly.

## DAOS Discovery Mechanics

Two intentionally-subtle entry points. Both are real links to `fattamano.com` — no JavaScript trickery, just low-emphasis affordances.

### A. Footer phrase (primary)

Add a small italic phrase to the DAOS site footer reading *"made with care"* (or similar — see open questions). It is an `<a href="https://fattamano.com">` but visually has no underline, no hover color shift on first glance — only a subtle cursor change and a small color shift on focus/hover to confirm interactivity. People who read footers find it; most casual visitors don't notice.

Implementation: edit DAOS's `Footer` component (or wherever the footer markup lives) to add one anchor. Trivial.

### B. Clickable artwork signature

Pick one specific artwork in the DAOS gallery whose signature visually fits — Wilma's choice, made later in implementation. Wrap the signature region in an anchor to fattamano.com. Hover shows a subtle "→" or color shift.

Implementation options:
1. If the signature is a separate SVG/element, just wrap it in an anchor.
2. If the signature is baked into the image, overlay a transparent clickable region positioned over the signature using CSS absolute positioning. The artwork detail page would need a small mechanism for this — likely a new optional Sanity field on `artwork` called `secretLinkRegion` (`{ x, y, w, h, url }`).

Recommend option 2 for flexibility — Wilma can move the easter egg to a different artwork in the future without code changes.

### Crawler note

Both easter egg links should be **regular `<a>` tags without `rel="nofollow"`** — we want Google to discover fattamano.com naturally. The "hiding" is from human visitors who don't look carefully, not from search engines.

## fattamano App Structure

```
apps/fattamano/
├── astro.config.mjs           # static output, sitemap integration
├── tailwind.config.mjs        # ft-* brand tokens
├── tsconfig.json
├── vercel.json                # security headers
├── package.json
└── src/
    ├── env.d.ts
    ├── layouts/
    │   └── BaseLayout.astro
    ├── components/
    │   ├── ProductCard.astro
    │   ├── ProductGrid.astro
    │   ├── BuyButton.astro    # renders correct CTA based on status + buyUrl
    │   └── Nav.astro
    ├── lib/
    │   └── sanity.ts          # imports from @lakeshore/shared-ui, GROQ queries
    ├── pages/
    │   ├── index.astro
    │   ├── things/
    │   │   ├── index.astro
    │   │   └── [slug].astro
    │   ├── about.astro
    │   └── 404.astro
    └── styles/
        └── global.css
```

## Visual Brand Direction (v1, loose)

Per user direction, this is **deliberately not over-specified at v1** — the visual identity will be iterated on in a later session focused on design. v1 needs to *function* and *feel different from DAOS* without being polished.

Minimum to get the personality across:
- **Type system:** Bold display font for headlines (something with character — could be a chunky display sans or a hand-feel serif), clean readable sans for body. Default to system fonts initially if needed.
- **Color palette:** A few bright/punchy accents on a clean ground. Avoid DAOS's cream-and-terracotta gentleness — fattamano should feel louder.
- **Layout personality:** Slightly off-grid card placement, generous whitespace, occasional visual jokes (a product card that's intentionally rotated, etc.).
- **Tone of copy:** This carries most of the personality at v1. The catalog page header could be something like *"things i made with my hands when i should have been doing something else"*.

Defer to a future Claude-design session for: final type choices, color tokens, illustration system, animation language.

## Discovery & SEO

- Standard sitemap, robots.txt, llms.txt generation matching the other apps' SEO pipeline.
- Each product page gets its own OG image (reuse the OG image script from the recent `feat(daos): automated SEO tooling` work — generalize it for fattamano).
- Site title pattern: `<product name> — fattamano`.
- No paywall, no auth, no `noindex`.

## Deployment

- New Vercel project pointed at `apps/fattamano/`.
- Custom domain: `fattamano.com` (apex) + `www.fattamano.com` redirect to apex.
- Build command from monorepo root: `npm run build -w apps/fattamano` (or equivalent).
- Environment variables: only the existing Sanity public envs (`SANITY_PROJECT_ID`, `SANITY_DATASET`). No tokens — site is fully read-only.

## Migration Triggers (when to leave Sanity for a real database)

Documented so this decision happens at the right time, not too early and not too late:

- Product count exceeds ~100 active items
- Product variants emerge (size × color matrices for shirts)
- Inventory tracking becomes necessary (selling out single editions, signed/numbered prints)
- Direct in-site checkout is desired (not just outbound `buyUrl`)
- Cross-platform inventory sync is desired (Etsy + own site + market sales)

When any one of these hits, revisit with a separate spec. Likely migration target: Supabase (Postgres + RLS) given existing Lakeshore stack familiarity.

## Implementation Phases

Phase ordering reflects "ship the smallest thing first, prove the loop, then build out":

1. **Scaffold app** — copy `apps/incubator/` to `apps/fattamano/`, rename package, configure Tailwind with `ft-*` tokens, set up base layout.
2. **Sanity schemas + workspace** — add `fattamanoProduct` and `fattamanoSettings` types, convert `sanity.config.ts` to workspaces array, verify studio shows both workspaces cleanly.
3. **Catalog pages** — home, `/things`, `/things/[slug]`, `/about`, custom `/404`. Real Sanity content for at least 3-5 seed products.
4. **DAOS discovery** — footer phrase link + clickable signature region (with the optional `secretLinkRegion` Sanity field on `artwork`).
5. **SEO + OG images** — sitemap, robots, llms.txt, per-product OG images.
6. **Deploy** — new Vercel project, domain config, smoke test.

## Open Questions (resolve during implementation, not blocking)

- Exact footer-phrase wording on DAOS (*"made with care"* vs *"fatto a mano"* vs something else — Wilma's call)
- Which DAOS artwork hosts the signature easter egg (Wilma's call, post-build)
- Whether to add a `category` filter on `/things` at v1 or defer until catalog grows
- Whether to expose `tags` as a filter at v1 (probably defer)

## Out of Scope (explicit non-goals for v1)

- Real e-commerce / in-site checkout
- User accounts, wishlists, carts
- Inventory tracking
- Email signup / newsletter
- Blog / journal
- Product variants
- Polished visual design (deliberately deferred)
- Analytics beyond whatever Vercel provides by default
