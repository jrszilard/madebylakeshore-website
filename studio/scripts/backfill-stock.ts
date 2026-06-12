import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2024-01-01' });

async function run() {
  const products = await client.fetch(
    `*[_type == "fattamanoProduct" && !defined(stock)]{ _id, title }`
  );
  console.log(`Backfilling stock on ${products.length} product(s)...`);
  let tx = client.transaction();
  for (const p of products) {
    tx = tx.patch(p._id, (patch) => patch.set({ stock: 10 }));
    console.log(`  ${p.title} -> stock 10`);
  }
  if (products.length) await tx.commit();
  console.log('Done. Adjust real counts in Studio.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
