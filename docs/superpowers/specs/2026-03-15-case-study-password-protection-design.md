# Case Study Password Protection

**Date:** 2026-03-15
**Status:** Approved
**App:** madebylakeshore

## Problem

Some case studies are covered by NDAs and should only be viewable by prospective clients who have been given a password. Currently all case studies are public and statically rendered.

## Design Decisions

- Per-study passwords managed in Sanity Studio
- Configurable listing visibility per study: hidden entirely or shown as a teaser with a lock icon
- Session-only cookie (no persistence beyond browser session)
- Inline password form on the case study page itself (no separate unlock page)
- Hybrid approach: server-side validation via API route, client-side form submission via fetch for smooth UX

## 1. Sanity Schema Changes

Add three fields to the `caseStudy` document type, grouped under an "Access Control" fieldset:

| Field               | Type    | Default   | Description                                                        |
| ------------------- | ------- | --------- | ------------------------------------------------------------------ |
| `isProtected`       | boolean | `false`   | Marks the study as password-gated                                  |
| `password`          | string  | —         | Access code shared with prospects. Only visible in Studio.         |
| `listingVisibility` | string  | `"teaser"`| `"hidden"` or `"teaser"`. Only relevant when `isProtected` is true |

- `password` and `listingVisibility` fields are conditionally hidden in Studio when `isProtected` is false.
- `password` field uses `readOnly: false` — no special encryption. These are simple access codes, not user account credentials.

## 2. GROQ Queries & Data Flow

### Listing page (`/case-studies/index.astro`)

- Fetch all case studies.
- Filter out protected studies where `listingVisibility == "hidden"`.
- For protected studies where `listingVisibility == "teaser"`, return only: `title`, `slug`, `category`, `excerpt`, `featuredImage`, `isProtected`, `author`, `order`. Exclude `challenge`, `solution`, `results`, and `metrics`.
- Public studies return all listing fields as they do today.

### Detail page (`/case-studies/[slug].astro`)

- **First fetch (lightweight):** `*[_type == "caseStudy" && slug.current == $slug][0]{isProtected, title, slug}` — just enough to decide whether to show the password gate.
- **Full fetch (after cookie validation or if not protected):** Returns all fields for rendering.
- The `password` field is **never** included in any frontend GROQ query.

### API route password query

- `*[_type == "caseStudy" && slug.current == $slug][0]{password, isProtected}` — used exclusively server-side in the auth endpoint.

## 3. API Endpoint

**Route:** `POST /api/case-study-auth.ts`

### Request

```json
{
  "slug": "some-case-study",
  "password": "user-entered-password"
}
```

### Flow

1. Validate `slug` and `password` are present strings (400 if not).
2. Fetch stored password and `isProtected` from Sanity.
3. If the study doesn't exist or isn't protected, return 404 (don't reveal which case).
4. Compare submitted password to stored password.
5. **Success:** Set session cookie, return `{ success: true }` with 200.
6. **Failure:** Return `{ success: false, error: "Incorrect password" }` with 401.

### Cookie

| Property   | Value                                             |
| ---------- | ------------------------------------------------- |
| Name       | `cs_access_{slug}`                                |
| Value      | HMAC-SHA256 of the slug using `CASE_STUDY_SECRET` |
| HttpOnly   | `true`                                            |
| Secure     | `true`                                            |
| SameSite   | `Strict`                                          |
| Max-Age    | Not set (session cookie — dies on browser close)  |

One cookie per study. Unlocking one study does not unlock others.

The HMAC value prevents cookie forgery — a user cannot simply set `cs_access_slug=true` manually.

### Rate Limiting

Reuse the in-memory rate limiting pattern from `api/chat.ts`. Limit: 5 attempts per IP per minute per slug.

### New Environment Variable

- `CASE_STUDY_SECRET`: Random secret string for HMAC signing. Add to Vercel environment variables.

## 4. Detail Page (`[slug].astro`)

### Changes from current implementation

- Remove `export const prerender = true` and `getStaticPaths()`. Page becomes fully SSR.
- Add authentication check logic in the frontmatter.

### Page flow

1. Read `slug` from `Astro.params`.
2. Lightweight Sanity fetch: get `isProtected` and `title` for this slug.
3. If study not found, redirect to `/case-studies`.
4. If `isProtected`:
   a. Read `cs_access_{slug}` cookie from `Astro.cookies`.
   b. Validate cookie value matches expected HMAC-SHA256 of the slug.
   c. If invalid/missing: render `PasswordGate` component within `BaseLayout`. Do **not** fetch or render case study content.
   d. If valid: proceed to full content fetch and render.
5. If not protected: fetch full content and render as normal.

## 5. PasswordGate Component

**File:** `src/components/PasswordGate.tsx` (React island with `client:load`)

### Props

```typescript
interface PasswordGateProps {
  slug: string;
  title: string;
}
```

### Behavior

- Renders a centered, branded form within the page layout.
- Heading: the case study title.
- Message: "This case study is password protected."
- Password input + submit button.
- On submit: `fetch('/api/case-study-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, password }) })`.
- On success: `window.location.reload()` — forces a fresh SSR where the server finds the valid cookie and renders full content.
- On failure: inline error message "Incorrect password, please try again" — no page reload.
- Styled with existing `mbl-*` design tokens to match the site aesthetic.

### Why reload instead of client-side state swap

The case study content is never sent to the browser until the cookie is validated server-side. There is nothing to "reveal" client-side. The reload triggers a new SSR request where the server sees the cookie and returns the real content.

## 6. Listing Page Changes (`/case-studies/index.astro`)

### Filtering

After fetching all case studies:

- **Public studies:** Render exactly as today.
- **Protected, `listingVisibility == "teaser"`:** Render with modifications (see below).
- **Protected, `listingVisibility == "hidden"`:** Excluded from the page entirely.

### Teaser card modifications

- Same card layout as public studies (title, category badge, excerpt, featured image).
- Lock icon displayed next to the title.
- "Read full case study" link text changes to "Request access".
- Card links to `/case-studies/{slug}` where the password gate is displayed.
- Metrics/results are **not shown** on teaser cards.

### Ordering

Protected teaser cards are mixed in with public cards using the existing `order` field from Sanity. No separate section.

## 7. Files Changed

| File | Change |
| ---- | ------ |
| `studio/schemas/documents/caseStudy.ts` | Add `isProtected`, `password`, `listingVisibility` fields with Access Control fieldset |
| `packages/shared-ui/src/sanity.ts` | Add/update GROQ queries for protected study handling |
| `apps/madebylakeshore/src/pages/api/case-study-auth.ts` | New API endpoint |
| `apps/madebylakeshore/src/pages/case-studies/[slug].astro` | Switch to SSR, add cookie validation, render PasswordGate |
| `apps/madebylakeshore/src/pages/case-studies/index.astro` | Filter by visibility, teaser card treatment |
| `apps/madebylakeshore/src/components/PasswordGate.tsx` | New React component |

## 8. Security Properties

- Password is never sent to the frontend (not in GROQ queries, not in HTML, not in JS bundles).
- Case study content is never sent to the browser without valid cookie.
- HMAC-signed cookies prevent forgery.
- Rate limiting prevents brute-force attempts.
- Session cookies expire on browser close.
- Per-slug cookies prevent one unlock from granting access to other studies.
