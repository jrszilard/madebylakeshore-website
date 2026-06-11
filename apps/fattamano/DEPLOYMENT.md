# fattamano deployment notes

## Initial Vercel project setup

1. **Create a new Vercel project**
   - Vercel dashboard → New Project → Import `jrszilard/madebylakeshore-website`
   - **Root Directory:** `apps/fattamano` (critical — must point at the app subdirectory, not the repo root)
   - Framework Preset: Astro (auto-detected)
   - Build command: `npm run build` (default)
   - Output directory: `.vercel/output` (auto-detected from the Vercel adapter — leave as default)
   - Install command: Vercel will run `npm install` from the repo root to handle the monorepo workspaces

2. **Environment variables**

   Set these in Vercel project Settings → Environment Variables (Production + Preview):

   - `PUBLIC_SANITY_PROJECT_ID` — same value as the other apps (copy from `apps/designandotherstories` Vercel project)
   - `PUBLIC_SANITY_DATASET` — `production`

3. **Domain configuration**

   Vercel project → Settings → Domains:
   - Add `fattamano.com` (apex)
   - Add `www.fattamano.com` and configure as a redirect to the apex
   - Update DNS at the registrar per Vercel's instructions:
     - Apex: A record → `76.76.21.21` (or Vercel's current IP — follow their UI)
     - www: CNAME → `cname.vercel-dns.com`

4. **First deploy**

   Once the branch is merged to `main`, Vercel will auto-deploy. For a preview deploy before merge:
   ```bash
   cd apps/fattamano
   npx vercel
   ```

## Smoke test checklist (after live)

- [ ] `https://fattamano.com/` — home page renders with fixture content
- [ ] `https://fattamano.com/things` — catalog page renders
- [ ] `https://fattamano.com/things/<some-slug>` — product detail page renders for any published product
- [ ] `https://fattamano.com/about` — about page renders
- [ ] `https://fattamano.com/some-nonsense` — custom 404 page renders
- [ ] `https://fattamano.com/api/og?title=Test&subtitle=Hello` — returns a 1200×630 PNG (Content-Type: image/png)
- [ ] `https://fattamano.com/sitemap-index.xml` — XML loads with the expected page list
- [ ] `https://fattamano.com/robots.txt` — text loads, references the sitemap URL
- [ ] `https://fattamano.com/llms.txt` — text loads
- [ ] View source of a product detail page — confirm `og:image` meta tag points at `/api/og?title=...`

## DAOS easter egg verification

After the DAOS app is redeployed with the Task 13 + 14 changes (footer link + signature overlay):

- [ ] Visit `https://designandotherstories.com/` → scroll to footer → confirm the small italic "fatto a mano" link is present, hover changes color, click navigates to fattamano.com
- [ ] In Sanity Studio (Lakeshore Studios workspace), pick one artwork → enable the "Secret Link Region (easter egg)" → set `url: https://fattamano.com`, tune `xPct/yPct/widthPct/heightPct` to land approximately on the signature → publish
- [ ] Visit `https://designandotherstories.com/gallery/<that-artwork-slug>` → hover near the signature → confirm cursor changes to pointer and a subtle terracotta tint appears → click navigates to fattamano.com

## Initial fixture content (Sanity)

Before the site is publicly useful, create these in the Sanity Studio (fattamano workspace, `https://<studio-url>/fattamano`):

**Settings (singleton):**
- `heroHeadline`: e.g., `"we make things by hand. sometimes they're good."`
- `heroSubcopy`: short brand intro
- `aboutBody`: the longer about-page copy
- `contactEmail`: where DM-to-buy emails should go
- (Optional: `footerCopy`, `notFoundCopy`)

**At least 3-5 Products** to populate the home and catalog pages.

## Polish status

Completed in the 2026-06-11 polish pass:

- `<main id="main-content">` skip-link target on `BaseLayout.astro` (a11y)
- Mobile nav using native `<details>/<summary>`
- Active-link styling on Navigation with `aria-current="page"`
- Replaced `SHARED_OBJECT_TYPES` hardcoded list in `studio/sanity.config.ts` with `t.type === 'object'` filter
- Wrapped `urlFor()` in `apps/fattamano/src/lib/sanity.ts` with try/catch and guarded call sites
- Moved `secretLinkRegion` overlay rendering inside `ImageViewer.tsx` so coordinates resolve against the actual painted-image box
- Tightened product/image typing in `ProductCard.astro`, `ProductGrid.astro`, and fattamano page fetches
- Added `@tailwindcss/typography` for `prose` content blocks

Remaining polish / follow-up:

- Human/browser visual pass for fattamano mobile nav, active states, skip link, and `prose` content
- Human/browser visual pass for DAOS `secretLinkRegion` alignment against real artwork content
- The DAOS `apps/designandotherstories/src/pages/api/og.ts` has `fonts: []` empty on the SEO branch where that route exists — a pre-existing bug that means DAOS OG images are likely broken in production. Should be fixed using the same pattern fattamano now uses (module-level Google Fonts cache).
