/**
 * Scaffold blog post drafts for past events that don't have recaps yet.
 *
 * Queries Sanity for events where endDate (or startDate) has passed,
 * then checks if a blogPost with a matching `eventRecapFor` reference exists.
 * If not, creates a draft blog post with pre-filled title, date, location,
 * and a prompt template for Wilma to fill in.
 *
 * Usage:
 *   export $(grep -v '^#' studio/.env | xargs) && \
 *   SANITY_EDITOR_API_TOKEN=<token> node studio/scripts/scaffold-event-recaps.mjs
 *
 * Designed to run weekly via cron or manually after events.
 */
import { createClient } from '@sanity/client';

const token = process.env.SANITY_CRON_JOBS_TOKEN || process.env.SANITY_EDITOR_API_TOKEN;
if (!token) {
  console.error('Missing SANITY_CRON_JOBS_TOKEN or SANITY_EDITOR_API_TOKEN.');
  process.exit(1);
}

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || process.env.SANITY_PROJECT_ID;
if (!projectId) {
  console.error('Missing Sanity project ID.');
  process.exit(1);
}

const dataset = process.env.SANITY_STUDIO_DATASET || process.env.SANITY_DATASET || 'production';

const client = createClient({ projectId, dataset, apiVersion: '2024-01-01', token, useCdn: false });

async function main() {
  const now = new Date().toISOString();

  // Find past events (endDate or startDate has passed)
  const pastEvents = await client.fetch(
    `*[_type == "event" && (
      (defined(endDate) && endDate < $now) ||
      (!defined(endDate) && startDate < $now)
    )] {
      _id, title, slug, startDate, endDate, eventType,
      location { venueName, city, state }
    }`,
    { now },
  );

  if (pastEvents.length === 0) {
    console.log('No past events found.');
    return;
  }

  // Find existing recaps (blogPosts that reference an event)
  const existingRecaps = await client.fetch(
    `*[_type == "blogPost" && defined(eventRecapFor)] { "eventId": eventRecapFor._ref }`,
  );
  const recappedIds = new Set(existingRecaps.map((r) => r.eventId));

  const needsRecap = pastEvents.filter((e) => !recappedIds.has(e._id));

  if (needsRecap.length === 0) {
    console.log('All past events have recaps. Nothing to scaffold.');
    return;
  }

  console.log(`Found ${needsRecap.length} event(s) needing recaps:\n`);

  for (const event of needsRecap) {
    const location = [event.location?.venueName, event.location?.city, event.location?.state]
      .filter(Boolean)
      .join(', ');
    const dateStr = new Date(event.startDate).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const slug = `recap-${event.slug?.current || event._id}`;

    const promptBlocks = [
      {
        _type: 'block',
        _key: 'intro',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'intro-span',
            marks: ['em'],
            text: `[Event recap draft — auto-scaffolded. Fill in your experience from ${event.title} on ${dateStr}.]`,
          },
        ],
      },
      {
        _type: 'block',
        _key: 'prompt1',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'p1',
            marks: [],
            text: `What was the vibe like? What pieces got the most attention? Any conversations that stood out? What sold? What would you do differently next time?`,
          },
        ],
      },
    ];

    const draft = {
      _id: `drafts.recap-${event._id}`,
      _type: 'blogPost',
      title: `Recap: ${event.title}`,
      slug: { _type: 'slug', current: slug },
      eventRecapFor: { _type: 'reference', _ref: event._id },
      publishedAt: new Date().toISOString(),
      body: promptBlocks,
      seo: {
        metaTitle: `${event.title} Recap — Design & Other Stories at ${location}`,
        metaDescription: `What it was like showing handmade art at ${event.title} in ${location} on ${dateStr}. Behind the scenes from Design & Other Stories.`,
      },
    };

    try {
      await client.createOrReplace(draft);
      console.log(`  ✓ Scaffolded draft: "${draft.title}" (${slug})`);
    } catch (err) {
      console.error(`  ✗ Failed for "${event.title}":`, err.message);
    }
  }

  console.log('\nDone. Drafts are in Sanity Studio for Wilma to fill in.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
