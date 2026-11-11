# fattamano deployment notes

## Where it runs

fattamano.com runs on Cloudflare Workers, in Justin's Cloudflare account, since the move from Vercel (2026-11).
The domain's registration and DNS are in the same account.

- **Worker `fattamano`** (`wrangler.jsonc`) serves the site. Almost every page is built ahead of time and served by
  Cloudflare as a static file, before the Worker runs. The Worker renders the checkout pages, the 404 page and the
  `/api/*` routes on request.
- **Worker `fattamano-www-redirect`** (`workers/www-redirect/`) sends `www.fattamano.com` to the bare domain.
- Every built page answers with and without a trailing slash, as it did on Vercel (`/wewantdeadpeople`, with none,
  is what the stickers print). `integrations/slashless-pages.mjs` writes the rules for that into the built
  `_redirects` file.

## Deploying

Pushing to `main` deploys, once the Worker is connected to this repository (Cloudflare dashboard → the Worker →
Settings → Builds). The connection's settings:

- Root directory: `apps/fattamano`
- Build command:
  `test -n "$PUBLIC_STRIPE_PUBLISHABLE_KEY" && cd ../.. && npm ci && npm run test --workspace=apps/fattamano && npm run build:fattamano`
- Deploy command: `npx wrangler deploy`
- Build variables: `SKIP_DEPENDENCY_INSTALL=1`, `SHARP_IGNORE_GLOBAL_LIBVIPS=1`, `PUBLIC_SANITY_PROJECT_ID`,
  `PUBLIC_SANITY_DATASET`, `PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Build watch paths: `apps/fattamano/*`, `packages/shared-ui/*`, `package-lock.json`
- Preview builds: off

By hand, from a clean export of the last commit (never the working tree, which holds `.env.local`):

```bash
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... apps/fattamano/scripts/deploy-cloudflare.sh            # the site
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... apps/fattamano/scripts/deploy-cloudflare.sh --dry-run  # build only
apps/fattamano/scripts/deploy-cloudflare.sh www                                                  # the www redirect
```

**A content change needs a deploy.** The catalog, product pages, fake-company pages and product preview images
are built from Sanity as it is at build time. Publishing in the Studio doesn't rebuild them: push, rerun the last
build in the dashboard, or call a Deploy Hook (the Worker → Settings → Builds → Deploy Hooks). Stock, prices at
checkout and shipping rates are always read live.

## Settings

Worker secrets, set with `npx wrangler secret put <NAME>` in `apps/fattamano`, never committed:

- `STRIPE_SECRET_KEY` — Stripe server key; a restricted key (`rk_live_`) in production
- `STRIPE_WEBHOOK_SECRET` — signing secret of the webhook endpoint `https://fattamano.com/api/stripe-webhook`
  (`checkout.session.completed`). Keep the endpoint on the bare domain: Stripe doesn't follow the www redirect.
- `SANITY_WRITE_TOKEN` — project-level Sanity token with Editor access
- `AGENTMAIL_API_KEY`, `AGENTMAIL_INBOX_ID`, `FATTAMANO_ORDER_NOTIFICATION_TO` — order alerts (see `OPERATIONS.md`)
- `FATTAMANO_CHECKOUT_RETURN_ORIGIN` — optional. Leave unset and Stripe returns the customer to the address they
  checked out on; set it to `https://fattamano.com` only to force that.

In `wrangler.jsonc`: `PUBLIC_SANITY_PROJECT_ID` and `PUBLIC_SANITY_DATASET`.

Read when the site is built, so they are build variables (and the deploy script's environment), not secrets:
`PUBLIC_STRIPE_PUBLISHABLE_KEY`, `PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET`.

Local dev is unchanged: `npm run dev:fattamano` reads `apps/fattamano/.env.local`.

## Domain

Both hostnames are Worker custom domains, which own their DNS records and certificates:
`fattamano.com` → `fattamano`, `www.fattamano.com` → `fattamano-www-redirect`. A custom domain can't take over a
DNS record it didn't create, so an older record for the hostname has to be deleted before the first deploy.

In the zone's settings, keep **SSL/TLS → Edge Certificates → Always Use HTTPS** on: Cloudflare serves the static
pages itself, so the site can't redirect `http://` in code.

## The `/_image` route

Astro adds a `/_image` route to every site it renders on request. With this adapter's `imageService: 'compile'`
setting, that route fetches any address given as `?href=` and returns it as the site's own response: an open
proxy, and a way to run someone else's script on fattamano.com. So `astro.config.mjs` uses `'passthrough'` and
points `image.endpoint` at `src/lib/server/noImageEndpoint.ts`, which answers 404. The site uses none of Astro's
image tools. If it ever does, don't reach for `'compile'`.

## Smoke test checklist (after a deploy)

- [ ] `https://fattamano.com/` — home page renders, and the visitor card fills in
- [ ] `https://fattamano.com/things` — catalog page renders
- [ ] `https://fattamano.com/things/<some-slug>` — product detail page renders for any published product
- [ ] `https://fattamano.com/wewantdeadpeople` and `/wewantdeadpeople/` — both answer 200, with no redirect
- [ ] `https://fattamano.com/about` — about page renders
- [ ] `https://fattamano.com/some-nonsense` — custom 404 page renders, with status 404
- [ ] `https://fattamano.com/og/<some-slug>.png` — a 1200×630 PNG with the product's title and tagline
- [ ] `https://fattamano.com/sitemap-index.xml` — XML loads with the expected page list
- [ ] `https://fattamano.com/robots.txt` — text loads, references the sitemap URL
- [ ] `https://fattamano.com/llms.txt` — text loads
- [ ] View source of a product detail page — confirm `og:image` points at `/og/<slug>.png`
- [ ] `https://www.fattamano.com/things?x=1` — 308 to `https://fattamano.com/things?x=1`
- [ ] `https://fattamano.com/checkout` — renders; `curl -X POST https://fattamano.com/api/stripe-webhook` answers 400
- [ ] `https://fattamano.com/_worker.js/index.js` — 404 (the Worker's code isn't published)
- [ ] `https://fattamano.com/_image?href=https://example.com/` — 404, never example.com's page (see above)

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
