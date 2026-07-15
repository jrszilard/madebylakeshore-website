import { getCliClient } from 'sanity/cli';
import fs from 'node:fs';

const client = getCliClient({ apiVersion: '2024-01-01' });

const CONSULTANT_REF = '4007f512-5725-4910-8cc6-90775cc34b06'; // Wilma
const CA_ID = 'Fs4l6c60Ym2C9v3e5m6KCg'; // Curriculum Associates
const RLS_ID = 'c13acdda-f112-447c-86f8-bec1ab6797c7'; // Reliant Life Sciences

const OLD_SITE = '/Users/wilmariehuertas/Downloads/wilmariehuertas old website/wp-content/uploads';

function key() {
  return Math.random().toString(36).slice(2, 14);
}

function p(text) {
  return { _key: key(), _type: 'block', style: 'normal', markDefs: [], children: [{ _key: key(), _type: 'span', marks: [], text }] };
}

function h2(text) {
  return { _key: key(), _type: 'block', style: 'h2', markDefs: [], children: [{ _key: key(), _type: 'span', marks: [], text }] };
}

async function uploadImage(filePath, alt) {
  const asset = await client.assets.upload('image', fs.createReadStream(filePath), {
    filename: filePath.split('/').pop(),
  });
  return {
    _type: 'figure',
    _key: key(),
    asset: { _type: 'reference', _ref: asset._id },
    alt,
  };
}

async function createPost({ title, slug, excerpt, body, caseStudyId, featuredPath, featuredAlt, galleryPaths }) {
  console.log(`Uploading images for "${title}"...`);
  const featuredImage = await uploadImage(featuredPath, featuredAlt);

  const doc = {
    _type: 'blogPost',
    title,
    slug: { _type: 'slug', current: slug },
    author: { _type: 'reference', _ref: CONSULTANT_REF },
    featuredImage,
    excerpt,
    body,
    relatedCaseStudies: [{ _type: 'reference', _ref: caseStudyId, _key: key() }],
    publishedAt: new Date().toISOString(),
  };

  const created = await client.create(doc);
  console.log(`  created: ${created.title} (${created._id})`);
  return created;
}

async function run() {
  // 1. Accessibility audit
  await createPost({
    title: 'Auditing a Corporate Site for Accessibility',
    slug: 'auditing-a-corporate-site-for-accessibility',
    excerpt:
      'WCAG compliance sounds like a checklist. In practice, it starts with a tool flagging real problems on a real page, then figuring out which of those problems actually affect a real person.',
    caseStudyId: CA_ID,
    featuredPath: `${OLD_SITE}/2021/09/accessibility-audit.jpg`,
    featuredAlt: 'Reviewing a WAVE accessibility scan on a laptop',
    galleryPaths: [],
    body: [
      p('"WCAG compliance" sounds like a checklist. In practice, it starts with a tool flagging real problems on a real page, then figuring out which of those problems actually matter to a real person.'),
      h2('Where I Started: WAVE'),
      p("I ran the corporate site through WAVE, WebAIM's accessibility evaluation tool, which flags errors, contrast issues, alerts, and structural problems directly on the live page. The summary view is a useful triage tool on its own: errors and contrast errors need fixing outright, alerts need a judgment call, and the structural element count tells you how much markup you're actually working with."),
      p("Contrast got its own pass. WAVE's contrast checker compares foreground and background color against WCAG's AA and AAA thresholds for both normal and large text, so a color pairing that looked fine on screen could still fail the actual standard. I fixed what failed, not what merely looked close."),
      h2("Beyond Pass/Fail: Who's Actually Affected"),
      p("A checklist tells you what's broken. It doesn't tell you who that breaks it for. I used vision-type simulations, covering everything from full color blindness to low vision to cataracts, to see the site the way a meaningful share of visitors actually would, not just the way an automated scanner reports it."),
      p("I also looked at situational vision events: direct sunlight on a phone screen, night mode. Accessibility isn't only about permanent conditions. A color pairing that passes contrast checks can still be unreadable outdoors at noon, and that's a real user experience, not an edge case."),
      h2('The Result'),
      p('Fixing accessibility issues after launch is expensive and reactive. Treating them as a design requirement, checked with the same rigor as a broken link, catches them before they ship.'),
    ],
  });

  // Add gallery-style images as inline figures for post 1
  {
    const extra = [
      [`${OLD_SITE}/2021/09/wave-overview-1.jpg`, 'WAVE accessibility scan summary: errors, contrast errors, alerts, and structural elements'],
      [`${OLD_SITE}/2021/09/wave-errors-1.jpg`, "WAVE contrast checker comparing foreground and background color against WCAG's AA and AAA thresholds"],
      [`${OLD_SITE}/2021/09/whocanuse-visionTypes.jpg`, 'Vision-type simulation reference covering color blindness, low vision, and cataracts'],
      [`${OLD_SITE}/2021/09/whocanuse-situationalVisualEvents.jpg`, 'Situational vision event simulations: direct sunlight and night mode'],
    ];
    const images = [];
    for (const [path, alt] of extra) {
      images.push(await uploadImage(path, alt));
    }
    const doc = await client.fetch(`*[_type == "blogPost" && slug.current == "auditing-a-corporate-site-for-accessibility"][0]{_id, body}`);
    const newBody = [...doc.body];
    // interleave images after relevant paragraphs: after WAVE section (index 3) and after vision section (index 6)
    newBody.splice(4, 0, images[0], images[1]);
    newBody.splice(9, 0, images[2], images[3]);
    await client.patch(doc._id).set({ body: newBody }).commit();
    console.log('  added inline images to accessibility post');
  }

  // 2. CA Blog design
  await createPost({
    title: 'Designing the CA Blog: From Wireframe to Launch',
    slug: 'designing-the-ca-blog-from-wireframe-to-launch',
    excerpt:
      'Before a single visual comp, the CA blog needed its navigation logic mapped: how tags, categories, author pages, and individual posts all connect and reset against each other.',
    caseStudyId: CA_ID,
    featuredPath: `${OLD_SITE}/2021/08/ca-blog-design-blogmainpage.jpg`,
    featuredAlt: 'Curriculum Associates blog main page, final design',
    galleryPaths: [],
    body: [
      p('A blog looks like a simple content type until you map how someone actually moves through it: from a tag, into a post, over to that author\'s other work, back through a category that clears the tag filter you had applied a minute ago.'),
      h2('Mapping the Navigation Before the Visuals'),
      p("Before any visual design, I diagrammed the relationships between Blog Home, tags, categories, individual posts, and author pages: what filters apply where, what clears when you navigate away, and which paths lead back to Blog Home versus staying within a filtered view. Getting that logic settled first meant the templates that came after didn't have to accommodate ambiguous navigation behavior partway through."),
      h2('From Wireframe to Final Design'),
      p('The main blog listing started as a grayscale wireframe: a featured post, a filterable "Latest Posts" list, a tag/category sidebar, and an optional promo block. Once the structure held up, I applied it to Curriculum Associates\' actual brand: their blue, their photography, their typography, turning a generic layout into something that reads as unmistakably theirs.'),
      h2('The Supporting Pages'),
      p('The individual post template carried a pull quote, inline media, a "Share This Post" bar, related content, and an author bio block, plus a local sales rep contact footer specific to Curriculum Associates\' regional sales model. The author page reused the same "Latest Posts" pattern from Blog Home, scoped to one person, so a reader curious about a byline could follow it without learning a new layout.'),
    ],
  });

  {
    const extra = [
      [`${OLD_SITE}/2021/08/ca-blog-wireframe-blogmainpage.jpg`, 'Grayscale wireframe of the blog main page with tags and promo area annotated'],
      [`${OLD_SITE}/2021/08/ca-blog-tags-categories.jpg`, 'Navigation diagram mapping how Blog Home, tags, categories, author pages, and individual posts connect'],
      [`${OLD_SITE}/2021/08/ca-blog-individualBlogPost-individualPost.jpg`, 'Individual blog post template with pull quote, share bar, and author bio'],
      [`${OLD_SITE}/2021/08/ca-blog-design-authorPage.jpg`, 'Author page template showing bio and latest posts by that author'],
    ];
    const images = [];
    for (const [path, alt] of extra) {
      images.push(await uploadImage(path, alt));
    }
    const doc = await client.fetch(`*[_type == "blogPost" && slug.current == "designing-the-ca-blog-from-wireframe-to-launch"][0]{_id, body}`);
    const newBody = [...doc.body];
    newBody.splice(3, 0, images[1]); // nav diagram after "Mapping the Navigation" paragraph
    newBody.splice(6, 0, images[0]); // wireframe after "From Wireframe to Final Design" paragraph
    newBody.push(images[2], images[3]); // post + author page at the end
    await client.patch(doc._id).set({ body: newBody }).commit();
    console.log('  added inline images to CA blog post');
  }

  // 3. Reliant Life Sciences rebrand
  await createPost({
    title: 'The Reliant Life Sciences Rebrand: Logo, Color, and a New Site',
    slug: 'reliant-life-sciences-rebrand-logo-color-site',
    excerpt:
      'Three circles, a documented color system, and a site that went from generic corporate blue to something that actually looks like a life sciences company.',
    caseStudyId: RLS_ID,
    featuredPath: `${OLD_SITE}/2024/02/RLC-after.jpg`,
    featuredAlt: 'Reliant Life Sciences website after the rebrand',
    galleryPaths: [],
    body: [
      p('The old Reliant site could have belonged to almost any B2B consulting firm: blue and red, stock photography, a generic "Our Services" layout. The rebrand needed to look like what Reliant actually is: a life sciences staffing and consulting firm with real technical depth.'),
      h2('A Logo That Means Something'),
      p("The mark is three circles arranged like a cluster of petri dishes, but each circle also stands for one of Reliant's core practice areas: pharma, medical device, and biotech. The logo isn't decoration sitting next to the name, it's a small diagram of the business itself."),
      h2('A Color System, Not a Palette Guess'),
      p('Every color shipped with its hex, CMYK, and Pantone values documented: a deep navy (#0D162D) and a bright teal (#33FFBE) as the core pair, with black, yellow, magenta, and purple as supporting accents. Having exact values matters the moment this brand needs to show up somewhere I didn\'t design: a printed booth banner, a partner\'s co-branded deck, a vendor\'s template.'),
      h2('Before and After'),
      p('The before-state was safe and forgettable. The after-state leads with "Life Sciences. Period." over a dark gradient with a hexagon motif nodding to lab equipment and molecular structures, immediately signaling the industry instead of making a visitor read three paragraphs to figure it out.'),
    ],
  });

  {
    const extra = [
      [`${OLD_SITE}/2024/10/rlsLogoExplanation3.jpg`, 'Reliant Life Sciences logo explanation: the three circles represent pharma, medical device, and biotech'],
      [`${OLD_SITE}/2024/10/rls-colors.jpg`, 'Reliant Life Sciences documented color system with hex, CMYK, and Pantone values'],
      [`${OLD_SITE}/2024/02/RLC-before.jpg`, 'Reliant website before the rebrand'],
    ];
    const images = [];
    for (const [path, alt] of extra) {
      images.push(await uploadImage(path, alt));
    }
    const doc = await client.fetch(`*[_type == "blogPost" && slug.current == "reliant-life-sciences-rebrand-logo-color-site"][0]{_id, body}`);
    const newBody = [...doc.body];
    newBody.splice(3, 0, images[0]); // logo explanation after "A Logo That Means Something"
    newBody.splice(6, 0, images[1]); // colors after "A Color System"
    newBody.splice(1, 0, images[2]); // before shot near the top intro
    await client.patch(doc._id).set({ body: newBody }).commit();
    console.log('  added inline images to Reliant rebrand post');
  }

  console.log('Done: all 3 posts created.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
