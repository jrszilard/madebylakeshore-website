import { getCliClient } from 'sanity/cli';
import fs from 'node:fs';

const client = getCliClient({ apiVersion: '2024-01-01' });

const COVERS_DIR = '/tmp/blog-covers/png';

const MAPPING = [
  { pngSlug: 'ai-powered-business-intelligence-smb-guide', postSlug: 'ai-powered-business-intelligence-smb-guide', alt: 'AI-Powered Business Intelligence: The SMB Owner\'s Guide' },
  { pngSlug: 'data-mess-to-data-success-playbook', postSlug: 'data-mess-to-data-success-playbook', alt: 'The Data Mess to Data Success Playbook' },
  { pngSlug: 'excel-health-check-25-point-audit', postSlug: 'excel-health-check-25-point-audit', alt: 'Excel Health Check: 25-Point Audit' },
  { pngSlug: 'power-bi-quick-start-guide-small-business', postSlug: 'power-bi-quick-start-guide-small-business', alt: 'Power BI Quick Start Guide for Small Business' },
  { pngSlug: 'small-business-dashboard-starter-kit', postSlug: 'small-business-dashboard-starter-kit', alt: 'Small Business Dashboard Starter Kit' },
  { pngSlug: 'assignment-notifications-logic', postSlug: 'admin-experience-8', alt: 'Assignment Notifications: The Logic Behind Who Gets Notified and When' },
  { pngSlug: 'leadership-framework-navigation-model', postSlug: 'leadership-framework-navigation-model', alt: 'Turning a Leadership Framework into a Navigation Model' },
];

function key() {
  return Math.random().toString(36).slice(2, 14);
}

async function run() {
  for (const { pngSlug, postSlug, alt } of MAPPING) {
    const filePath = `${COVERS_DIR}/${pngSlug}.png`;
    console.log(`Uploading ${pngSlug}.png...`);
    const asset = await client.assets.upload('image', fs.createReadStream(filePath), {
      filename: `${pngSlug}.png`,
    });

    const post = await client.fetch(`*[_type == "blogPost" && slug.current == $slug][0]{_id, title}`, { slug: postSlug });
    if (!post) {
      console.error(`  No post found for slug ${postSlug}, skipping`);
      continue;
    }

    await client
      .patch(post._id)
      .set({
        featuredImage: {
          _type: 'figure',
          _key: key(),
          asset: { _type: 'reference', _ref: asset._id },
          alt,
        },
      })
      .commit();
    console.log(`  set featuredImage on "${post.title}"`);
  }
  console.log('Done.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
