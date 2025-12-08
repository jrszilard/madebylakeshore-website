# Lakeshore Studios Monorepo

A unified codebase for the MadeByLakeshore family of brands:

- **MadeByLakeshore** (`madebylakeshore.com`) - Consulting services hub
- **Design & Other Stories** (`designandotherstories.com`) - Art & handmade goods e-commerce
- **Incubator** (`incubator.madebylakeshore.com`) - Digital products lab

## Architecture

```
lakeshore-studios/
├── apps/
│   ├── madebylakeshore/      # Main consulting site (Astro)
│   ├── designandotherstories/ # Art e-commerce site (Astro + Snipcart)
│   └── incubator/            # Digital products lab (Astro)
├── packages/
│   └── shared-ui/            # Shared components & Sanity client
├── studio/                   # Sanity CMS (single instance for all sites)
└── package.json              # Root workspace config
```

## Tech Stack

- **Framework**: [Astro](https://astro.build/) - Fast, content-focused sites
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- **CMS**: [Sanity](https://sanity.io/) - Headless CMS with real-time editing
- **E-commerce**: [Snipcart](https://snipcart.com/) - Drop-in shopping cart
- **Hosting**: [Vercel](https://vercel.com/) or [Netlify](https://netlify.com/)

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/lakeshore-studios.git
cd lakeshore-studios

# Install dependencies
npm install
```

### Environment Variables

Create `.env` files in each app directory:

**All apps** need:
```env
PUBLIC_SANITY_PROJECT_ID=your-project-id
PUBLIC_SANITY_DATASET=production
```

**DesignAndOtherStories** also needs:
```env
PUBLIC_SNIPCART_API_KEY=your-snipcart-key
```

### Development

```bash
# Run MadeByLakeshore (port 4321)
npm run dev:mbl

# Run Design & Other Stories (port 4322)
npm run dev:daos

# Run Incubator (port 4323)
npm run dev:incubator

# Run Sanity Studio (port 3333)
npm run dev:studio
```

### Build

```bash
# Build all sites
npm run build:all

# Build individual sites
npm run build:mbl
npm run build:daos
npm run build:incubator
```

## Sanity CMS

The Sanity Studio is shared across all three sites but organizes content by brand.

### Content Types

**MadeByLakeshore:**
- Person (team members)
- Service (consulting offerings)
- Case Study (detailed project write-ups)
- Portfolio Project (lighter project showcases)
- Testimonial
- Blog Post

**Design & Other Stories:**
- Artwork (paintings, drawings, writing)
- Art Collection (grouped artwork)

**Incubator:**
- Digital Project (apps, tools, experiments)
- Build Log (development updates)

### Setting Up Sanity

1. Create a project at [sanity.io](https://sanity.io)
2. Copy your project ID
3. Add it to your environment variables
4. Deploy the studio:

```bash
cd studio
npx sanity deploy
```

## Deployment

### Vercel (Recommended)

Each app can be deployed as a separate Vercel project:

1. Connect your GitHub repo
2. Set the root directory to the specific app (e.g., `apps/madebylakeshore`)
3. Add environment variables
4. Deploy

### Domain Configuration

- `madebylakeshore.com` → MadeByLakeshore app
- `designandotherstories.com` → Design & Other Stories app
- `incubator.madebylakeshore.com` → Incubator app (subdomain)

## Customization

### Updating Branding

Each app has its own Tailwind config with brand-specific colors:

- `apps/madebylakeshore/tailwind.config.mjs` - Professional blues & neutrals
- `apps/designandotherstories/tailwind.config.mjs` - Warm, earthy tones
- `apps/incubator/tailwind.config.mjs` - Dark theme with neon accents

### Adding New Content Types

1. Create schema in `studio/schemas/documents/`
2. Register in `studio/schemas/index.ts`
3. Add to structure in `studio/structure.ts`
4. Create GROQ queries in `packages/shared-ui/src/sanity.ts`

## Project Structure Details

### MadeByLakeshore

```
apps/madebylakeshore/
├── src/
│   ├── pages/
│   │   ├── index.astro          # Homepage
│   │   ├── services/
│   │   │   ├── index.astro      # Services listing
│   │   │   ├── design.astro     # Design consulting
│   │   │   └── data.astro       # Data consulting
│   │   ├── work/                # Portfolio
│   │   ├── case-studies/        # Detailed case studies
│   │   ├── about.astro
│   │   └── contact.astro
│   ├── layouts/
│   ├── components/
│   └── styles/
```

### Design & Other Stories

```
apps/designandotherstories/
├── src/
│   ├── pages/
│   │   ├── index.astro          # Homepage
│   │   ├── shop/
│   │   │   ├── index.astro      # All artwork
│   │   │   └── [slug].astro     # Product detail
│   │   ├── paintings/
│   │   ├── drawings/
│   │   ├── writing/
│   │   ├── about.astro
│   │   └── contact.astro
│   ├── layouts/
│   ├── components/
│   └── styles/
```

### Incubator

```
apps/incubator/
├── src/
│   ├── pages/
│   │   ├── index.astro          # Homepage
│   │   ├── projects/
│   │   │   ├── index.astro      # All projects
│   │   │   └── [slug].astro     # Project detail
│   │   ├── builds/              # Build logs
│   │   └── about.astro
│   ├── layouts/
│   ├── components/
│   └── styles/
```

## Next Steps

- [ ] Set up Sanity project and add project ID
- [ ] Configure Snipcart for e-commerce
- [ ] Add real content to Sanity
- [ ] Set up Calendly integrations
- [ ] Configure analytics
- [ ] Set up contact forms (Formspree, Netlify Forms, etc.)
- [ ] Add image optimization
- [ ] Set up preview mode for Sanity drafts

## License

Private - All rights reserved.
