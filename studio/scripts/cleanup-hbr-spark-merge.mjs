import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2024-01-01' });

const ADMIN_ID = '5s2JqVukoz2gxEpJ7G4Kl7'; // now "HBR Spark"
const LEARNER_ID = 'f1289f17-6593-441a-89a9-81ac2629134d';

const REDUNDANT_POST_IDS = [
  'NHF0meUgFWTYCLyulZWlYx', // Onboarding Instead of a 30,000-Resource Catalog
  'QJAJINF2DlzRmfDVfXO3bV', // The Leader Profile: Progress Against a Framework, Visualized
];

const PLATFORM_OVERVIEW_ID = '48d2cd90-b497-475c-8b81-cbe7af28524b'; // "From First Login to Completion" / draft "The Platform Overview"
const ASSIGNMENTS_ID = '64523a74-bf76-4aad-a2c1-652a0c35eacc';
const CONTENT_TYPES_ID = '82ad1fc1-8ff0-40c5-bd46-dc1f74518b01';

function key() {
  return Math.random().toString(36).slice(2, 14);
}

async function run() {
  // 1. Drop the redundant posts from HBR Spark's relatedBlogPosts BEFORE deleting them
  console.log('Removing redundant posts from HBR Spark relatedBlogPosts...');
  const current = await client.fetch(`*[_id == $id][0]{ relatedBlogPosts }`, { id: ADMIN_ID });
  const withoutRedundant = (current.relatedBlogPosts || []).filter(
    (r) => !REDUNDANT_POST_IDS.includes(r._ref)
  );
  await client.patch(ADMIN_ID).set({ relatedBlogPosts: withoutRedundant }).commit();

  console.log('Deleting redundant posts...');
  for (const id of REDUNDANT_POST_IDS) {
    await client.delete(id);
  }

  // 2. Repoint every doc that still references the old Learner Experience case study
  console.log('Repointing references from Learner Experience -> HBR Spark...');
  const tx = client.transaction();

  // Published + draft "Platform Overview" / "From First Login to Completion"
  for (const id of [PLATFORM_OVERVIEW_ID, `drafts.${PLATFORM_OVERVIEW_ID}`]) {
    tx.patch(id, (patch) =>
      patch.set({ relatedCaseStudies: [{ _type: 'reference', _ref: ADMIN_ID, _key: key() }] })
    );
  }

  // Assignments already references HBR Spark; just drop the stale Learner ref
  tx.patch(ASSIGNMENTS_ID, (patch) =>
    patch.set({ relatedCaseStudies: [{ _type: 'reference', _ref: ADMIN_ID, _key: key() }] })
  );

  // Handling Content Types only referenced Learner; repoint to HBR Spark
  tx.patch(CONTENT_TYPES_ID, (patch) =>
    patch.set({ relatedCaseStudies: [{ _type: 'reference', _ref: ADMIN_ID, _key: key() }] })
  );

  await tx.commit();

  // 3. Fix up HBR Spark's relatedBlogPosts: drop the 2 deleted posts, add the 2 newly-discovered ones
  console.log('Updating HBR Spark relatedBlogPosts...');
  const hbrSpark = await client.fetch(`*[_id == $id][0]{ relatedBlogPosts }`, { id: ADMIN_ID });
  const cleaned = (hbrSpark.relatedBlogPosts || []).filter((r) => !REDUNDANT_POST_IDS.includes(r._ref));
  const alreadyLinked = new Set(cleaned.map((r) => r._ref));
  const toAdd = [PLATFORM_OVERVIEW_ID, CONTENT_TYPES_ID].filter((id) => !alreadyLinked.has(id));
  const finalRelated = [...cleaned, ...toAdd.map((ref) => ({ _type: 'reference', _ref: ref, _key: key() }))];

  await client.patch(ADMIN_ID).set({ relatedBlogPosts: finalRelated }).commit();

  // 4. Confirm nothing else references Learner Experience, then unpublish it
  console.log('Checking for remaining references...');
  const remainingRefs = await client.fetch(`*[references($id)]{_id, title}`, { id: LEARNER_ID });
  if (remainingRefs.length > 0) {
    console.error('Still referenced by:', remainingRefs);
    throw new Error('Cannot safely retire Learner Experience doc yet.');
  }

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
