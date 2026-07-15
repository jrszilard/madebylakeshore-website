import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2024-01-01' });

const ADMIN_ID = '5s2JqVukoz2gxEpJ7G4Kl7';
const LEARNER_ID = 'f1289f17-6593-441a-89a9-81ac2629134d';
const CONSULTANT_REF = '4007f512-5725-4910-8cc6-90775cc34b06'; // Wilma
const LEARNER_IMAGE_REF = 'image-d6f1eeb1c8ac3f9026c6645bf2c708c896d02352-1848x1381-png';

function key() {
  return Math.random().toString(36).slice(2, 14);
}

function p(text) {
  return { _key: key(), _type: 'block', style: 'normal', markDefs: [], children: [{ _key: key(), _type: 'span', marks: [], text }] };
}

function h3(text) {
  return { _key: key(), _type: 'block', style: 'h3', markDefs: [], children: [{ _key: key(), _type: 'span', marks: [], text }] };
}

function h2(text) {
  return { _key: key(), _type: 'block', style: 'h2', markDefs: [], children: [{ _key: key(), _type: 'span', marks: [], text }] };
}

function bullet(text) {
  return { _key: key(), _type: 'block', style: 'normal', level: 1, listItem: 'bullet', markDefs: [], children: [{ _key: key(), _type: 'span', marks: [], text }] };
}

async function run() {
  // 1. Fetch Admin doc's existing relatedBlogPosts so we can append, not overwrite
  const admin = await client.fetch(`*[_id == $id][0]{ relatedBlogPosts }`, { id: ADMIN_ID });
  const existingRelatedBlogPosts = admin.relatedBlogPosts || [];

  // 2. Create the 3 new Learner-side blog posts
  console.log('Creating new blog posts...');

  const post1 = await client.create({
    _type: 'blogPost',
    title: 'Turning a Leadership Framework into a Navigation Model',
    slug: { _type: 'slug', current: 'leadership-framework-navigation-model' },
    author: { _type: 'reference', _ref: CONSULTANT_REF },
    excerpt: "HBR's Leadership Framework existed as a content philosophy long before it was a product. Making it navigable meant turning it into structure, not decoration.",
    publishedAt: new Date().toISOString(),
    relatedCaseStudies: [{ _type: 'reference', _ref: ADMIN_ID, _key: key() }],
    body: [
      p("HBR's Leadership Framework existed as a content model long before it became a product. It described the competency areas leaders develop over a career. The challenge was turning that into something a learner could actually navigate on a platform with more than 30,000 resources."),
      p('A framework as a philosophy is not usable on its own. It needed to work as information architecture.'),
      h2('From Framework to Taxonomy'),
      p("I mapped the Framework's leadership competency areas onto a skills taxonomy, so every resource in the catalog could be tagged and surfaced by skill rather than by format or publication date alone. That single decision is what made the rest of the personalization system possible."),
      bullet('Goal-directed navigation: learners browse by what they want to develop, not by content type'),
      bullet('Consistent tagging: every article, video, podcast, and pathway maps to the same skill vocabulary'),
      bullet('A shared language across the product: the taxonomy that structures navigation is the same one that drives onboarding and pathway suggestions'),
      h2('Closing the Gap Between Idea and Implementation'),
      p('Turning a framework into a taxonomy is a design decision, but keeping it consistent as the product grows is an operational one. I worked closely with content, engineering, and stakeholders to build an enterprise-level design system that kept the taxonomy, navigation, and UI patterns in sync as new features shipped. That system is what let the team experiment faster without every new pathway or feature drifting from the model.'),
      p("A framework only works as a product feature if it's structural. Reference it on a landing page and it's decoration. Bake it into navigation and tagging, and it becomes the thing that makes personalization possible."),
    ],
  });
  console.log(`  created: ${post1.title}`);

  const post2 = await client.create({
    _type: 'blogPost',
    title: 'Onboarding Instead of a 30,000-Resource Catalog',
    slug: { _type: 'slug', current: 'onboarding-instead-of-a-catalog' },
    author: { _type: 'reference', _ref: CONSULTANT_REF },
    excerpt: "Dropping a new learner into a catalog of 30,000 resources cold isn't personalization, it's decision paralysis. HBR Spark's onboarding asks two questions first.",
    publishedAt: new Date().toISOString(),
    relatedCaseStudies: [{ _type: 'reference', _ref: ADMIN_ID, _key: key() }],
    body: [
      p("Dropping a new learner into a catalog of over 30,000 resources and asking them to figure out where to start is not personalization, it's decision paralysis with extra steps. If the first thing HBR Spark asked a new user to do was search, the platform had already failed at the one job it was supposed to do."),
      h2('Asking Two Questions First'),
      p("I designed a guided onboarding flow that asks new learners about their role and their development priorities before showing them anything else. Those two inputs are enough to narrow a 30,000-resource catalog down to a starting point that actually matches where someone is and what they're trying to get better at."),
      bullet('Role: what kind of leadership context the learner is operating in'),
      bullet('Development priorities: which skill areas, mapped to the Leadership Framework taxonomy, the learner wants to focus on'),
      h2('Relevance From the First Session'),
      p('Those answers feed directly into what the learner sees the moment onboarding ends. Rather than landing on a generic homepage or an open-ended catalog, they land on content and pathway suggestions already filtered to their stated priorities. The catalog is still there to browse, but it is no longer the first thing standing between a new user and something useful.'),
      p("Onboarding isn't a tutorial. It's the first personalization decision a product makes, and getting it right means the rest of the platform doesn't have to work as hard to earn a second visit."),
    ],
  });
  console.log(`  created: ${post2.title}`);

  const post3 = await client.create({
    _type: 'blogPost',
    title: 'The Leader Profile: Progress Against a Framework, Visualized',
    slug: { _type: 'slug', current: 'leader-profile-progress-visualized' },
    author: { _type: 'reference', _ref: CONSULTANT_REF },
    excerpt: 'Personalization on HBR Spark does not stop after onboarding. The Leader Profile shows learners where they stand against the Leadership Framework and what to focus on next.',
    publishedAt: new Date().toISOString(),
    relatedCaseStudies: [{ _type: 'reference', _ref: ADMIN_ID, _key: key() }],
    body: [
      p('Personalization does not stop once onboarding ends. After a learner answers the initial role and priority questions, HBR Spark keeps assessing where they stand in their leadership journey and keeps adjusting what it suggests.'),
      h2('Assessing Where a Learner Stands'),
      p('The platform evaluates a learner\'s current stage against the Leadership Framework and surfaces the skills most worth focusing on next, rather than presenting every competency area as equally relevant at every point in a career.'),
      h2('Structured Pathways, Visualized Progress'),
      p('From that assessment, the platform guides the learner through structured learning pathways built from the same skills taxonomy that drives the rest of the product. The Leader Profile gives that progress a visible home: a single view where a learner can see how far they have come against the Framework, not just what they have completed.'),
      p('A skills taxonomy is only motivating if a learner can see themselves moving through it. The Leader Profile is what turns "I completed some content" into "I can see myself getting better at this."'),
    ],
  });
  console.log(`  created: ${post3.title}`);

  const newRelatedBlogPosts = [
    ...existingRelatedBlogPosts,
    { _type: 'reference', _ref: post1._id, _key: key() },
    { _type: 'reference', _ref: post2._id, _key: key() },
    { _type: 'reference', _ref: post3._id, _key: key() },
  ];

  // 3. Repurpose the Admin doc in place -> combined "HBR Spark" case study
  console.log('Merging into combined HBR Spark case study...');

  const tx = client.transaction();

  tx.patch(ADMIN_ID, (patch) =>
    patch.set({
      title: 'HBR Spark',
      slug: { _type: 'slug', current: 'hbr-spark' },
      excerpt:
        'As lead Product Designer at Harvard Business Publishing, I designed HBR Spark end to end: the personalized leadership development platform learners use, and the admin tools that power it.',
      challenge: [
        p('Organizations needed a scalable, personalized leadership development platform that fit into the daily workflows of busy emerging and established leaders. Traditional learning formats failed to engage because they didn\'t map to individual goals or integrate smoothly into work, leaving a gap between ambitious L&D programs and actual learner adoption.'),
        p('That platform also needed an administrative layer organizations could actually run. Harvard Business Impact serves organizations across industries, and the admins managing it needed complete, coherent tools for user groups, content assignment, and pathway creation, not a set of screens that worked independently but felt disconnected from each other.'),
      ],
      solution: [
        p('HBR Spark needed to work as one coherent system from two different vantage points: the learner navigating it, and the admin configuring it underneath.'),
        h3('Learner Experience'),
        p("I designed the information architecture around HBR's Leadership Framework, transforming it into both a navigation model and a skills taxonomy that made content discovery intuitive and goal-directed. I collaborated closely with content, engineering, and stakeholders to build an enterprise-level design system that closed the gap between ideation and implementation, enabling faster and more consistent experimentation across the platform."),
        p('The personalization journey starts at onboarding: a guided flow that asks learners about their role and development priorities, surfacing relevant content from the first session rather than asking them to navigate a catalog of over 30,000 resources on their own. From there, the platform assesses where a learner is in their leadership journey, suggests skills to focus on, and guides them through structured pathways, with a Leader Profile visualization showing progress against the Framework at any point.'),
        h3('Admin Experience'),
        p('Underneath sits a complete admin system across four areas: Catalog, Groups, Assignments, and Pathway Editor. Groups covers the full journey from an empty organization state through creation, member search, bulk CSV import, and inline editing. Assignments covers list and detail views, multi-assignee management, and cancellation, built on a notification decision tree mapped before any screen was designed, so the logic for who gets notified and when was settled before the UI had to accommodate it. The Pathway Editor is the admin-side authoring tool for the same pathways learners move through, with a full draft-to-publish lifecycle.'),
      ],
      results: [
        p('HBR Spark delivers a highly personalized learning experience that puts learners in control of their development journey, combining articles, videos, podcasts, and curated pathways with skill-based personalization, on top of an admin system where every screen state is accounted for and every interaction pattern stays consistent across feature areas. The result is one platform that holds together end to end, for the people using it and the people running it.'),
      ],
      gallery: [
        {
          _type: 'figure',
          _key: key(),
          asset: { _type: 'reference', _ref: LEARNER_IMAGE_REF },
          alt: 'HBR Spark learner experience: personalized homepage and Leader Profile',
        },
      ],
      relatedBlogPosts: newRelatedBlogPosts,
    })
  );

  await tx.commit();
  console.log('Merged Admin Experience -> HBR Spark.');

  // 4. Unpublish the Learner Experience doc (convert to draft, do not hard-delete)
  console.log('Unpublishing standalone Learner Experience doc...');
  const learnerDoc = await client.getDocument(LEARNER_ID);
  await client.createIfNotExists({ ...learnerDoc, _id: `drafts.${LEARNER_ID}` });
  await client.delete(LEARNER_ID);

  console.log('Done.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
