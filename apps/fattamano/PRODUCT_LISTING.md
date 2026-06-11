# fattamano product listing guide

This is the working guide for getting real objects into the fattamano catalog.

## Where products live

Products live in the shared Sanity project, inside the **fattamano** Studio workspace.

- Studio project: existing Lakeshore Sanity project
- Workspace path: `/fattamano`
- Product document type: `fattamanoProduct`
- Settings singleton: `fattamanoSettings`

## Fast path: seed starter content

The repo includes a starter seed file with settings and the first two sticker products:

```txt
studio/content/fattamano-seed.json
```

The current starter products are:

- `Japanese America Flag`
- `Permanent Underclass`

Each product includes `imagePaths` pointing to local product photos under:

```txt
/home/justin/Documents/madebylakeshore-docs/Products-Photos/stickers
```

Preview what would be created:

```bash
npm run seed:fattamano -- --dry-run
```

Apply to Sanity with a write token. This uploads images and creates missing product docs:

```bash
SANITY_API_TOKEN=... npm run seed:fattamano -- --apply
```

Update/replace the seed product docs in place, useful while dialing in copy/images:

```bash
SANITY_API_TOKEN=... npm run seed:fattamano -- --apply --update-products
```

Replace all existing fattamano products with the seed set:

```bash
SANITY_API_TOKEN=... npm run seed:fattamano -- --apply --replace-products
```

After seeding, open Studio and review images, copy, product status, prices, and buy URLs manually.

## Seed file product format

A seeded product can include local images like this:

```json
{
  "title": "Permanent Underclass",
  "slug": "permanent-underclass",
  "category": "sticker",
  "priceCents": 500,
  "status": "available",
  "featured": true,
  "imagePaths": [
    {
      "path": "/absolute/path/to/image.jpg",
      "alt": "Accessible description of the product image",
      "caption": "Optional catalog caption"
    }
  ]
}
```

The seed script uploads each image to Sanity assets and stores it in the product's `images` array as a `figure`.

## Product fields

### Required for a useful listing

- `title` — product/object name
- `slug` — generated from title; avoid changing after launch
- `category` — `sticker`, `shirt`, `print`, or `other`
- `status` — `available`, `sold_out`, `coming_soon`, or `concept`
- `dateAdded` — controls catalog ordering
- `images` — first image becomes the card thumbnail

### Strongly recommended

- `tagline` — short joke or object description on cards
- `description` — product detail copy
- `priceCents` — integer cents, e.g. `500` for `$5.00`
- `priceDisplayOverride` — use for weird cases like `inquire spiritually`
- `featured` — show on homepage recent acquisitions
- `tags` — internal/freeform future filtering

### Checkout field

- `buyUrl` — where actual purchase happens
  - Etsy listing
  - Stripe Payment Link
  - Shopify product
  - payment/inquiry form
  - leave empty to show DM/contact behavior

## Status language on the site

The frontend translates product statuses into fattamano-flavored labels:

| Sanity status | Site label |
| --- | --- |
| `available` | available-ish |
| `sold_out` | already acquired |
| `coming_soon` | materializing |
| `concept` | conceptual object |

## Recommended product copy pattern

Use the absurd luxury boutique voice:

```txt
Title: PLEASE ADVISE
Tagline: A compact work exploring the fragile boundary between competence and forwarding the email.
Description:
- Vinyl sticker, 2026. Adhesive, ink, administrative dread.
- For laptops, notebooks, water bottles, and other surfaces currently lacking institutional panic.
```

Another pattern:

```txt
Title: Algorithmically Inadvisable
Tagline: A small declaration against becoming a content pillar.
Description:
- Sticker or shirt concept. Human-made phrase, machine-catalogued with visible discomfort.
- Not scalable. Thank god.
```

## Image checklist

For each product:

- Use a clean square-ish hero image if possible.
- Add `alt` text on every image in the image object.
- First image should work as a thumbnail.
- Add secondary detail/process images when helpful.

The current frontend has a graceful placeholder if an image is missing, but real listings should get images before launch.

## Launch checklist for products

Before pointing real traffic at fattamano:

- [ ] Create/update `fattamanoSettings`
- [ ] Add at least 3-5 products
- [ ] Add images to each product
- [ ] Mark 3 products as `featured`
- [ ] Set real prices or overrides
- [ ] Add `buyUrl` for anything actually sellable
- [ ] Check `/`, `/things`, and at least one `/things/<slug>` page
- [ ] Check OG image route: `/api/og?title=Test&subtitle=Hello`

## Notes

Sanity is the catalog source of truth for v1. Commerce stays platform-agnostic through `buyUrl` until there is enough product volume or inventory complexity to justify a real commerce backend.
