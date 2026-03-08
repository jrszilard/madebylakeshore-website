# Lakeshore Studios Monorepo

## Project Overview

This is the monorepo for **Lakeshore Studio**, a husband-and-wife consulting enterprise (Justin: data/AI, Wilma: design). It contains three Astro websites and a shared Sanity CMS.

## Tech Stack

- **Framework**: Astro 4 (hybrid SSR on madebylakeshore, static on others)
- **UI**: React 18, Tailwind CSS 3
- **CMS**: Sanity v5 (headless, GROQ queries)
- **Deployment**: Vercel (serverless)
- **Package manager**: npm workspaces
- **Language**: TypeScript

## Monorepo Structure

```
apps/
  madebylakeshore/     # Main consulting site (madebylakeshore.com) - hybrid SSR
  designandotherstories/ # Wilma's design/art portfolio site - static
  incubator/           # Experimental projects showcase - static
packages/
  shared-ui/           # Shared Sanity client config and image URL builder
studio/                # Sanity Studio (content management)
```

## Key Conventions

- All apps share the same Sanity project via `@lakeshore/shared-ui`
- Astro components use `.astro` extension; interactive islands use `.tsx`
- Styles are in `src/styles/global.css` plus Tailwind utility classes
- Sanity queries live in `src/lib/sanity.ts` per app
- Environment variables: `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SANITY_API_TOKEN`, `ANTHROPIC_API_KEY`
- The madebylakeshore app has a chatbot API endpoint at `src/pages/api/chat.ts` that proxies to the Anthropic API

## Development

```bash
npm run dev:mbl       # madebylakeshore on default port
npm run dev:daos      # designandotherstories on port 4322
npm run dev:incubator # incubator on port 4323
npm run dev:studio    # Sanity Studio
```

## Agent Guidance

- **security-veteran-reviewer**: Use for auditing API endpoints, environment variable handling, Sanity client config, and the chat API proxy. Focus areas: API key exposure, input validation on the chat endpoint, Sanity token scoping, Vercel serverless security.
- **ux-ui-evaluator**: Use after building or modifying pages/components. Reviews Astro components, Tailwind usage, accessibility, and responsive design.
- **consultant-website-strategist**: Use for strategic decisions about site structure, service presentation, content strategy, and lead generation optimization.
