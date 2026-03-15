# Case Study Password Protection Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-study password protection to case studies so NDA-covered work can be shared privately with prospects via a password.

**Architecture:** Sanity CMS gets three new fields (isProtected, password, listingVisibility) to control access. An Astro API endpoint validates passwords and sets HMAC-signed session cookies. The case study detail page switches from static to SSR and checks the cookie before rendering content. A React island handles the password form UX.

**Tech Stack:** Astro 4 (hybrid SSR), Sanity v5, React 18, Tailwind CSS, Node.js crypto (HMAC-SHA256), Vercel serverless

**Spec:** `docs/superpowers/specs/2026-03-15-case-study-password-protection-design.md`

---

## File Structure

| File | Action | Responsibility |
| ---- | ------ | -------------- |
| `studio/schemas/documents/caseStudy.ts` | Modify | Add `isProtected`, `password`, `listingVisibility` fields with Access Control fieldset |
| `packages/shared-ui/src/sanity.ts` | Modify | Add new GROQ queries; add `createServerSanityClient` factory |
| `apps/madebylakeshore/src/lib/sanity.ts` | Modify | Add `serverSanityClient` export using token-authenticated, no-CDN client |
| `apps/madebylakeshore/src/lib/case-study-auth.ts` | Create | HMAC signing, cookie validation, rate limiting — shared between API route and page |
| `apps/madebylakeshore/src/pages/api/case-study-auth.ts` | Create | POST endpoint: validate password, set cookie |
| `apps/madebylakeshore/src/components/PasswordGate.tsx` | Create | React island: password form with fetch submission |
| `apps/madebylakeshore/src/layouts/BaseLayout.astro` | Modify | Add `noindex` prop for protected pages |
| `apps/madebylakeshore/src/pages/case-studies/[slug].astro` | Modify | Switch to SSR, add cookie check, render PasswordGate or content |
| `apps/madebylakeshore/src/pages/case-studies/index.astro` | Modify | Switch to SSR, filter by visibility, teaser card treatment |
| `apps/madebylakeshore/src/pages/index.astro` | Modify | Filter protected studies from featured query |
| `apps/madebylakeshore/.env.example` | Modify | Add `CASE_STUDY_SECRET` and `SANITY_API_TOKEN` |

---

## Chunk 1: Schema, Queries, and Server Client

### Task 1: Add Access Control fields to Sanity case study schema

**Files:**
- Modify: `studio/schemas/documents/caseStudy.ts`

- [ ] **Step 1: Add the three new fields with fieldset**

Add an `Access Control` fieldset and three fields after the existing `seo` field (line 136). The `password` and `listingVisibility` fields are conditionally hidden when `isProtected` is false.

```typescript
// Add to the fieldsets array (add fieldsets property to the defineType call):
fieldsets: [
  {
    name: 'accessControl',
    title: 'Access Control',
    options: { collapsible: true, collapsed: true },
  },
],

// Add these three fields after the `seo` field:
defineField({
  name: 'isProtected',
  title: 'Password Protected',
  type: 'boolean',
  description: 'Require a password to view this case study?',
  initialValue: false,
  fieldset: 'accessControl',
}),
defineField({
  name: 'password',
  title: 'Access Password',
  type: 'string',
  description: 'The password to share with prospects. Not encrypted — treat as a simple access code.',
  fieldset: 'accessControl',
  hidden: ({ parent }) => !parent?.isProtected,
  validation: (Rule) =>
    Rule.custom((value, context) => {
      const parent = context.parent as any;
      if (parent?.isProtected && !value) {
        return 'Password is required when protection is enabled';
      }
      return true;
    }),
}),
defineField({
  name: 'listingVisibility',
  title: 'Listing Visibility',
  type: 'string',
  description: 'How this study appears on the public case studies page.',
  fieldset: 'accessControl',
  options: {
    list: [
      { title: 'Teaser (show card with lock icon)', value: 'teaser' },
      { title: 'Hidden (not shown at all)', value: 'hidden' },
    ],
    layout: 'radio',
  },
  initialValue: 'teaser',
  hidden: ({ parent }) => !parent?.isProtected,
}),
```

- [ ] **Step 2: Verify Studio loads without errors**

Run: `npm run dev:studio`
Expected: Studio loads, can open a case study, see the "Access Control" fieldset collapsed at the bottom. Toggling "Password Protected" on reveals the password and visibility fields.

- [ ] **Step 3: Commit**

```bash
git add studio/schemas/documents/caseStudy.ts
git commit -m "feat: add Access Control fields to case study schema"
```

---

### Task 2: Add new GROQ queries and server-side client factory

**Files:**
- Modify: `packages/shared-ui/src/sanity.ts`

- [ ] **Step 1: Add `createServerSanityClient` factory function**

Add after the existing `createSanityClientWithConfig` function (after line 43):

```typescript
export interface ServerSanityConfig extends SanityConfig {
  token: string;
}

// Server-side client: token-authenticated, no CDN, for reading protected fields
export function createServerSanityClient(config: ServerSanityConfig) {
  if (!config.token) {
    throw new Error('Sanity API token is required for server client.');
  }

  const client = createClient({
    projectId: config.projectId,
    dataset: config.dataset || 'production',
    apiVersion: config.apiVersion || DEFAULT_API_VERSION,
    useCdn: false,
    token: config.token,
  });

  return {
    client,
    fetch: <T = any>(query: string, params?: Record<string, any>): Promise<T> => {
      return client.fetch<T>(query, params);
    },
  };
}
```

- [ ] **Step 2: Add new query variants to the `queries` object**

Add these queries inside the `queries` object, after the existing `caseStudyBySlug` query (after line 111):

```typescript
// Password-protected case study queries
caseStudyAuthCheck: `*[_type == "caseStudy" && slug.current == $slug][0]{
  isProtected,
  title,
  slug,
  password
}`,

allCaseStudiesWithVisibility: `*[_type == "caseStudy"] | order(coalesce(order, 100) asc, publishedAt desc) {
  _id,
  title,
  slug,
  client,
  category,
  excerpt,
  featuredImage,
  metrics,
  isProtected,
  listingVisibility,
  "author": author->{ name, slug, image }
}`,

// Navigation query: excludes hidden protected studies
caseStudiesForNavigation: `*[_type == "caseStudy" && !(isProtected == true && listingVisibility == "hidden")] | order(coalesce(order, 100) asc, publishedAt desc) {
  _id,
  title,
  slug,
  client
}`,
```

- [ ] **Step 3: Update `featuredCaseStudies` query to exclude protected studies**

Replace the existing `featuredCaseStudies` query (lines 82-92) with:

```typescript
featuredCaseStudies: `*[_type == "caseStudy" && featured == true && isProtected != true] | order(coalesce(order, 100) asc, publishedAt desc)[0...3] {
  _id,
  title,
  slug,
  client,
  category,
  excerpt,
  featuredImage,
  metrics,
  "author": author->{ name, slug, image }
}`,
```

- [ ] **Step 4: Commit**

```bash
git add packages/shared-ui/src/sanity.ts
git commit -m "feat: add server Sanity client and protected case study queries"
```

---

### Task 3: Add server-side Sanity client to madebylakeshore app

**Files:**
- Modify: `apps/madebylakeshore/src/lib/sanity.ts`

- [ ] **Step 1: Add server client export**

Add the following after the existing `urlFor` function export (after line 50):

```typescript
import { createServerSanityClient } from '@lakeshore/shared-ui/sanity';

// Server-side Sanity client: token-authenticated, no CDN
// Used exclusively by API routes and SSR pages that need to read protected fields (e.g., password)
let _serverClient: ReturnType<typeof createServerSanityClient> | null = null;

export function getServerSanityClient() {
  if (!_serverClient) {
    const projectId =
      getEnvVar('PUBLIC_SANITY_PROJECT_ID') ||
      getEnvVar('SANITY_PROJECT_ID') ||
      getEnvVar('SANITY_STUDIO_PROJECT_ID');

    const dataset =
      getEnvVar('PUBLIC_SANITY_DATASET') ||
      getEnvVar('SANITY_DATASET') ||
      getEnvVar('SANITY_STUDIO_DATASET') ||
      'production';

    const token = getEnvVar('SANITY_API_TOKEN');
    if (!token) {
      throw new Error('SANITY_API_TOKEN is required for server-side Sanity client.');
    }

    _serverClient = createServerSanityClient({ projectId, dataset, token });
  }
  return _serverClient;
}
```

- [ ] **Step 2: Update the import at the top of the file**

Change line 1 from:
```typescript
import { createSanityClientWithConfig, queries } from '@lakeshore/shared-ui/sanity';
```
to:
```typescript
import { createSanityClientWithConfig, createServerSanityClient, queries } from '@lakeshore/shared-ui/sanity';
```

- [ ] **Step 3: Commit**

```bash
git add apps/madebylakeshore/src/lib/sanity.ts
git commit -m "feat: add server-side Sanity client for protected field access"
```

---

### Task 4: Create case-study-auth utility module

**Files:**
- Create: `apps/madebylakeshore/src/lib/case-study-auth.ts`

- [ ] **Step 1: Create the auth utility module**

This module contains HMAC signing, cookie validation, and rate limiting logic shared between the API route and the detail page.

```typescript
import { createHmac, timingSafeEqual } from 'node:crypto';

// --- Environment ---

function getSecret(): string {
  const secret =
    import.meta.env.CASE_STUDY_SECRET ||
    (typeof process !== 'undefined' ? process.env.CASE_STUDY_SECRET : '');
  if (!secret) {
    throw new Error('CASE_STUDY_SECRET environment variable is not set.');
  }
  return secret;
}

// --- HMAC ---

export function computeHmac(slug: string, password: string): string {
  const secret = getSecret();
  return createHmac('sha256', secret).update(`${slug}:${password}`).digest('hex');
}

export function verifyCookie(slug: string, password: string, cookieValue: string): boolean {
  // Validate cookie is a valid 64-char hex string before comparing
  if (!/^[0-9a-f]{64}$/.test(cookieValue)) return false;
  const expected = computeHmac(slug, password);
  // Use timing-safe comparison to prevent timing attacks
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(cookieValue, 'hex');
  return timingSafeEqual(a, b);
}

// --- Cookie helpers ---

export function getCookieName(slug: string): string {
  return `cs_access_${slug}`;
}

export function buildCookieHeader(slug: string, password: string): string {
  const name = getCookieName(slug);
  const value = computeHmac(slug, password);
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

// --- Timing-safe password comparison ---

export function passwordMatches(submitted: string, stored: string): boolean {
  // Compare HMAC digests rather than raw strings for constant-time comparison
  const secret = getSecret();
  const a = createHmac('sha256', secret).update(submitted).digest();
  const b = createHmac('sha256', secret).update(stored).digest();
  return timingSafeEqual(a, b);
}

// --- Rate limiting ---

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10; // 10 attempts per IP per minute globally

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/madebylakeshore/src/lib/case-study-auth.ts
git commit -m "feat: add case study auth utility (HMAC, cookies, rate limiting)"
```

---

### Task 5: Update .env.example

**Files:**
- Modify: `apps/madebylakeshore/.env.example`

- [ ] **Step 1: Add CASE_STUDY_SECRET and SANITY_API_TOKEN entries**

Add after the existing entries:

```
# Sanity API token (required for server-side protected field access)
SANITY_API_TOKEN=your-sanity-api-token

# Case study password protection
# Generate with: openssl rand -hex 32
CASE_STUDY_SECRET=your-random-secret-here
```

- [ ] **Step 2: Commit**

```bash
git add apps/madebylakeshore/.env.example
git commit -m "chore: add CASE_STUDY_SECRET and SANITY_API_TOKEN to .env.example"
```

---

## Chunk 2: API Endpoint and PasswordGate Component

### Task 6: Create the password auth API endpoint

**Files:**
- Create: `apps/madebylakeshore/src/pages/api/case-study-auth.ts`

- [ ] **Step 1: Create the API route**

```typescript
import type { APIRoute } from 'astro';
import { getServerSanityClient, queries } from '../../lib/sanity';
import {
  isRateLimited,
  passwordMatches,
  buildCookieHeader,
} from '../../lib/case-study-auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const jsonHeaders = { 'Content-Type': 'application/json' };

  try {
    // Rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Too many attempts. Try again in a minute.' }),
        { status: 429, headers: jsonHeaders },
      );
    }

    // Parse and validate body
    let body: any;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body' }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const { slug, password } = body;
    if (typeof slug !== 'string' || !slug || typeof password !== 'string' || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Slug and password are required' }),
        { status: 400, headers: jsonHeaders },
      );
    }

    // Fetch stored password from Sanity (server-side, no CDN)
    const serverClient = getServerSanityClient();
    const study = await serverClient.fetch<{
      isProtected: boolean | null;
      password: string | null;
    }>(queries.caseStudyAuthCheck, { slug });

    // Don't reveal whether the study exists or is protected
    if (!study || !study.isProtected || !study.password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not found' }),
        { status: 404, headers: jsonHeaders },
      );
    }

    // Timing-safe password comparison
    if (!passwordMatches(password, study.password)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Incorrect password' }),
        { status: 401, headers: jsonHeaders },
      );
    }

    // Set session cookie and return success
    const cookieHeader = buildCookieHeader(slug, study.password);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        ...jsonHeaders,
        'Set-Cookie': cookieHeader,
      },
    });
  } catch (error) {
    console.error('Case study auth error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: jsonHeaders },
    );
  }
};
```

- [ ] **Step 2: Verify the endpoint loads**

Run: `npm run dev:mbl`
Test: `curl -X POST http://localhost:4321/api/case-study-auth -H 'Content-Type: application/json' -d '{"slug":"test","password":"test"}'`
Expected: 404 response (no matching study) — confirms the endpoint is wired up and Sanity client works.

- [ ] **Step 3: Commit**

```bash
git add apps/madebylakeshore/src/pages/api/case-study-auth.ts
git commit -m "feat: add case study password auth API endpoint"
```

---

### Task 7: Create the PasswordGate React component

**Files:**
- Create: `apps/madebylakeshore/src/components/PasswordGate.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState, type FormEvent } from 'react';

interface PasswordGateProps {
  slug: string;
  title: string;
}

export default function PasswordGate({ slug, title }: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/case-study-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, password }),
      });

      const data = await res.json();

      if (data.success) {
        window.location.reload();
        return; // Keep loading state while page reloads
      }

      if (res.status === 429) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else if (res.status === 401) {
        setError('Incorrect password, please try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Unable to verify password. Please check your connection and try again.');
    }

    setLoading(false);
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md mx-auto px-6">
        <div className="text-center mb-8">
          {/* Lock icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-mbl-cloud mb-6">
            <svg
              className="w-8 h-8 text-mbl-stone"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>
          <h1 className="font-display text-2xl md:text-3xl text-mbl-ink mb-3">
            {title}
          </h1>
          <p className="text-mbl-stone">
            This case study is password protected.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              autoFocus
              className="w-full px-4 py-3 border border-mbl-mist rounded-lg text-mbl-ink placeholder:text-mbl-stone/50 focus:outline-none focus:ring-2 focus:ring-mbl-accent focus:border-transparent transition-shadow"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full px-4 py-3 bg-mbl-ink text-white font-heading font-medium rounded-lg hover:bg-mbl-slate transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'View Case Study'}
          </button>
        </form>

        <p className="text-center text-sm text-mbl-stone/70 mt-6">
          Don't have a password?{' '}
          <a href="/contact" className="text-mbl-accent hover:underline">
            Get in touch
          </a>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/madebylakeshore/src/components/PasswordGate.tsx
git commit -m "feat: add PasswordGate React component"
```

---

## Chunk 3: Page Updates (Detail, Listing, Homepage)

### Task 8: Add noindex prop to BaseLayout

**Files:**
- Modify: `apps/madebylakeshore/src/layouts/BaseLayout.astro`

BaseLayout has no named `head` slot, so we add a `noindex` prop to conditionally render the robots meta tag. This is the simplest approach that avoids restructuring the layout for a single use case.

- [ ] **Step 1: Add noindex prop to BaseLayout**

In the Props interface (line 6-9), add `noindex`:

```typescript
interface Props {
  title: string;
  description?: string;
  ogImage?: string;
  noindex?: boolean;
}
```

Update the destructuring (lines 12-16) to include `noindex`:

```typescript
const {
  title,
  description = 'Strategic consulting in design, data, and AI. We help businesses transform through thoughtful design and intelligent systems.',
  ogImage = '/og-image.jpg',
  noindex = false,
} = Astro.props;
```

Add the conditional meta tag inside `<head>`, after the twitter meta tags (after line 37):

```astro
    {noindex && <meta name="robots" content="noindex" />}
```

- [ ] **Step 2: Commit**

```bash
git add apps/madebylakeshore/src/layouts/BaseLayout.astro
git commit -m "feat: add noindex prop to BaseLayout for protected pages"
```

---

### Task 9: Update case study detail page to SSR with password gate

**Files:**
- Modify: `apps/madebylakeshore/src/pages/case-studies/[slug].astro`

- [ ] **Step 1: Rewrite the page frontmatter**

Replace the entire frontmatter (lines 1-51, everything between the `---` fences) with:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { sanityClient, urlFor, queries, getServerSanityClient } from '../../lib/sanity';
import { getCookieName, verifyCookie } from '../../lib/case-study-auth';
import PasswordGate from '../../components/PasswordGate.tsx';

export const prerender = false;

const { slug } = Astro.params;

if (!slug) {
  return Astro.redirect('/case-studies');
}

// Auth check: fetch protection status and password (server-side only)
const serverClient = getServerSanityClient();
const authCheck = await serverClient.fetch<{
  isProtected: boolean | null;
  title: string;
  slug: { current: string };
  password: string | null;
}>(queries.caseStudyAuthCheck, { slug });

if (!authCheck) {
  return Astro.redirect('/case-studies');
}

// Check if access is granted
let isAuthenticated = false;
const isProtected = authCheck.isProtected === true;

if (isProtected) {
  const cookieName = getCookieName(slug);
  const cookieValue = Astro.cookies.get(cookieName)?.value;
  if (cookieValue && authCheck.password) {
    isAuthenticated = verifyCookie(slug, authCheck.password, cookieValue);
  }
}

// Only fetch full content if not protected or authenticated
let study: any = null;
let allStudies: any[] = [];
let nextStudy: any = null;

if (!isProtected || isAuthenticated) {
  study = await sanityClient.fetch(queries.caseStudyBySlug, { slug });
  allStudies = await sanityClient.fetch(queries.caseStudiesForNavigation);
  const currentIndex = allStudies.findIndex((s: any) => s.slug?.current === slug);
  nextStudy = allStudies[(currentIndex + 1) % allStudies.length];
  // Don't link to self as "next"
  if (nextStudy?.slug?.current === slug) nextStudy = null;
}

const categoryColors: Record<string, string> = {
  design: 'bg-mbl-warm/10 text-mbl-warm',
  data: 'bg-mbl-accent/10 text-mbl-accent',
  ai: 'bg-purple-100 text-purple-600',
};

function blocksToText(blocks: any[] | null | undefined): string {
  if (!blocks) return '';
  return blocks
    .filter((block: any) => block._type === 'block')
    .map((block: any) => {
      if (block.children) {
        return block.children.map((child: any) => child.text).join('');
      }
      return '';
    })
    .join('\n\n');
}

const heroImage = study?.featuredImage?.asset ? urlFor(study.featuredImage).width(1400).url() : null;
const authorName = study?.author?.name || '';
---
```

- [ ] **Step 2: Add the password gate conditional rendering**

Replace the opening `<BaseLayout>` tag (line 53 in the original) with:

```astro
<BaseLayout
  title={isProtected && !isAuthenticated ? `Protected: ${authCheck.title}` : study?.title || authCheck.title}
  description={isProtected && !isAuthenticated ? 'This case study is password protected.' : study?.excerpt}
  noindex={isProtected && !isAuthenticated}
>
```

Then, immediately after the `>`, add the conditional that wraps ALL existing template content. The structure is:

```astro
  {isProtected && !isAuthenticated ? (
    <Fragment>
      <section class="section-spacing">
        <div class="container-wide">
          <a href="/case-studies" class="inline-flex items-center gap-2 text-sm text-mbl-stone hover:text-mbl-ink mb-8 transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            All Case Studies
          </a>
        </div>
      </section>
      <PasswordGate client:load slug={slug} title={authCheck.title} />
    </Fragment>
  ) : (
    <Fragment>
```

This opens the "else" branch. Everything from the original `<!-- Hero -->` section through the `<!-- Next Case Study -->` section stays as-is inside this branch.

- [ ] **Step 3: Close the conditional at the end of the file**

After the last section before `</BaseLayout>` (the "Next Case Study" section's closing `)}` tag), close both the `<Fragment>` and the ternary:

```astro
    </Fragment>
  )}
```

The full template structure is:
```
<BaseLayout ...>
  {isProtected && !isAuthenticated ? (
    <Fragment>
      <!-- back link + PasswordGate -->
    </Fragment>
  ) : (
    <Fragment>
      <!-- Hero -->
      <!-- Hero Image -->
      <!-- Results/Metrics -->
      <!-- Content -->
      <!-- Testimonial -->
      <!-- Next Case Study -->
    </Fragment>
  )}
</BaseLayout>
```

- [ ] **Step 4: Test with dev server**

Run: `npm run dev:mbl`
Visit: `http://localhost:4321/case-studies/{any-existing-slug}`
Expected: The page renders normally (no studies are protected yet).

- [ ] **Step 5: Commit**

```bash
git add apps/madebylakeshore/src/pages/case-studies/[slug].astro
git commit -m "feat: switch case study detail to SSR with password gate"
```

---

### Task 10: Update listing page with visibility filtering and teaser cards

**Files:**
- Modify: `apps/madebylakeshore/src/pages/case-studies/index.astro`

- [ ] **Step 1: Switch to SSR and update the data fetching**

Replace the frontmatter (lines 1-24) with:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { sanityClient, urlFor, queries } from '../../lib/sanity';

export const prerender = false;

// Fetch all case studies including protection metadata
const allSanityCaseStudies = await sanityClient.fetch(queries.allCaseStudiesWithVisibility);

// Filter: exclude hidden protected studies
const sanityCaseStudies = allSanityCaseStudies.filter((study: any) => {
  if (study.isProtected && study.listingVisibility === 'hidden') return false;
  return true;
});

const caseStudies = sanityCaseStudies.map((study: any) => ({
  slug: study.slug?.current,
  title: study.title,
  client: study.client || '',
  category: study.category || 'design',
  author: study.author?.name || '',
  duration: '',
  heroImage: study.featuredImage?.asset ? urlFor(study.featuredImage).width(800).url() : null,
  excerpt: study.excerpt || '',
  isProtected: study.isProtected === true,
  // Strip metrics from protected teaser cards
  results: study.isProtected ? [] : (study.metrics?.slice(0, 3) || []),
}));

const categoryColors: Record<string, string> = {
  design: 'bg-mbl-warm/10 text-mbl-warm',
  data: 'bg-mbl-accent/10 text-mbl-accent',
  ai: 'bg-purple-100 text-purple-600',
};
---
```

- [ ] **Step 2: Add lock icon and teaser treatment to card template**

In the card template, update the title `<h2>` (around line 84 in the original) to include a lock icon for protected studies:

Find the `<h2>` with the study title and replace it with:

```astro
<h2 class="font-display text-2xl lg:text-3xl mb-4 group-hover:text-mbl-accent transition-colors duration-300 flex items-center gap-3">
  {study.title}
  {study.isProtected && (
    <svg class="w-5 h-5 text-mbl-stone/50 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-label="Password protected" role="img">
      <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  )}
</h2>
```

- [ ] **Step 3: Update the "Read full case study" link text**

Find the `<span>` with "Read full case study" and replace it with:

```astro
<span class="inline-flex items-center gap-2 font-heading font-medium text-mbl-ink group-hover:text-mbl-accent transition-colors">
  {study.isProtected ? 'Request access' : 'Read full case study'}
  <svg class="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
</span>
```

- [ ] **Step 4: Verify listing page**

Run: `npm run dev:mbl`
Visit: `http://localhost:4321/case-studies`
Expected: Page renders as before (no studies are protected yet, so no visible changes).

- [ ] **Step 5: Commit**

```bash
git add apps/madebylakeshore/src/pages/case-studies/index.astro
git commit -m "feat: add visibility filtering and teaser cards for protected studies"
```

---

### Task 11: Filter protected studies from homepage

**Files:**
- Modify: `apps/madebylakeshore/src/pages/index.astro`

This task requires no code changes because the `featuredCaseStudies` GROQ query was already updated in Task 2 to include `&& isProtected != true`. The homepage will automatically exclude protected studies.

- [ ] **Step 1: Verify homepage**

Run: `npm run dev:mbl`
Visit: `http://localhost:4321`
Expected: Featured projects section renders as before. No changes visible (no protected studies exist yet).

- [ ] **Step 2: Commit (skip if no changes needed)**

No file changes required — the query update in Task 2 handles this.

---

## Chunk 4: End-to-End Verification

### Task 12: End-to-end manual test

- [ ] **Step 1: Create a test case study in Sanity Studio**

1. Run `npm run dev:studio`
2. Create a new case study with:
   - Title: "Test Protected Study"
   - Slug: `test-protected-study`
   - Fill required fields (author, category, featured image, excerpt)
   - In Access Control: toggle "Password Protected" ON
   - Set password to: `test123`
   - Set listing visibility to: "Teaser"
   - Publish

- [ ] **Step 2: Verify listing page shows teaser**

Visit: `http://localhost:4321/case-studies`
Expected: "Test Protected Study" appears with a lock icon, no metrics shown, link says "Request access".

- [ ] **Step 3: Verify detail page shows password gate**

Visit: `http://localhost:4321/case-studies/test-protected-study`
Expected: Password gate form appears with title and "This case study is password protected" message.

- [ ] **Step 4: Test incorrect password**

Enter "wrongpassword" and submit.
Expected: Inline error "Incorrect password, please try again" — no page reload.

- [ ] **Step 5: Test correct password**

Enter "test123" and submit.
Expected: Page reloads, full case study content is displayed.

- [ ] **Step 6: Test session persistence**

Refresh the page.
Expected: Content still visible (session cookie persists).

- [ ] **Step 7: Test hidden visibility**

In Sanity Studio, change the study's listing visibility to "Hidden" and publish.
Refresh the listing page.
Expected: "Test Protected Study" no longer appears in the listing.
Direct URL still works (with password gate).

- [ ] **Step 8: Test homepage exclusion**

In Sanity Studio, toggle "Featured" on for the test study and publish.
Visit: `http://localhost:4321`
Expected: The protected study does NOT appear in the featured projects section.

- [ ] **Step 9: Clean up test data**

Delete the test case study from Sanity Studio (or unpublish it).

- [ ] **Step 10: Commit any final fixes**

If any issues were found during testing, fix and commit them with descriptive messages.

---

## Deployment Checklist

Before deploying to production, ensure:

- [ ] `CASE_STUDY_SECRET` is set in Vercel environment variables (generate with `openssl rand -hex 32`)
- [ ] `SANITY_API_TOKEN` is set in Vercel environment variables (if not already present)
- [ ] At least one case study has been configured as protected in Sanity Studio to verify the feature works in production
