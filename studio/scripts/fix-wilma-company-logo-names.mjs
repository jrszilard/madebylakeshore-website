import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2024-01-01' });

const PERSON_ID = '4007f512-5725-4910-8cc6-90775cc34b06'; // Wilma

const NAMES_BY_KEY = {
  abb33bd4cf9f: 'Barton Associates',
  cea6b6cb2ab7: 'i-Ready',
  '40f447957b87': 'Fusion Cell',
  '0df281054624': 'Clinician1',
  be840051ea99: 'Freedom Yacht',
  '3691b952a3d2': 'Curriculum Associates',
  '2ee422ecd792': 'BRIGANCE Early Childhood',
  '28d8d6bcc977': 'Barton Healthcare Staffing',
  '3c5084b02360': 'Harvard Business Publishing',
};

async function run() {
  const person = await client.getDocument(PERSON_ID);
  const updatedCompanies = person.companies.map((c) => ({
    ...c,
    name: NAMES_BY_KEY[c._key] || c.name,
  }));

  const missing = updatedCompanies.filter((c) => !c.name);
  if (missing.length > 0) {
    throw new Error(`Missing name mapping for keys: ${missing.map((c) => c._key).join(', ')}`);
  }

  await client.patch(PERSON_ID).set({ companies: updatedCompanies }).commit();
  console.log('Updated company names:', updatedCompanies.map((c) => c.name));
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
