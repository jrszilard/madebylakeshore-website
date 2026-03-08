# Lakeshore Studio - Running To-Do List

## Content Tasks (requires stakeholder input)
- [ ] Collect 2-3 real client testimonials and add to Sanity CMS
- [ ] Add testimonials section to homepage (between Featured Work and CTA)
- [ ] Replace About page placeholder image with real photo of Justin & Wilma (apps/madebylakeshore/src/pages/about.astro lines 84-88)
- [x] Finalize homepage hero copy rewrite (Option 1 implemented)
- [ ] Add real screenshots/images to case studies in Sanity
- [ ] Set up social media profiles, then add links back to Footer.astro

## Sanity CMS Fixes (manual - must be done in Studio)
- [ ] Fortune Brands case study: fix title "Deliever" → "Deliver"
- [ ] Fortune Brands case study: fix slug `linking-multiple-datasources-to-deliever-in-depth-financial-reporting` → update to match corrected title
- [ ] Fortune Brands case study: fix challenge text "referce" → "reference" and "compines" → "combines"

## Medium-Term
- [ ] Launch blog (Sanity schema exists as `blogPost`, no Astro pages yet)
- [ ] Build email capture / lead magnet mechanism
- [ ] Complete Incubator build logs or remove nav link to `/builds`
- [ ] Consider folding AI into "Data & AI" service line (no AI case studies yet)
- [ ] Add ARIA labels and semantic improvements across both sites
- [ ] Optimize font loading (move Google Fonts from CSS @import to <link rel="preload"> in BaseLayout)
- [ ] Upgrade rate limiting from in-memory to Upstash Redis for production reliability
- [ ] Check if Sanity case study slugs match updated slugs in caseStudies.ts (especially ETL-organization-reporting)

## E-Commerce (Design & Other Stories)
- [ ] Wire up newsletter signup form to email service (Mailchimp, ConvertKit, etc.)
- [ ] Build "inquiry to purchase" flow for artwork before full checkout
- [ ] Set up Snipcart product validation when going live
- [ ] Add shipping/fulfillment schema to Sanity
- [ ] Create /shop, /paintings, /drawings, /writing category pages
