import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2024-01-01' });

function key() {
  return Math.random().toString(36).slice(2, 14);
}

function block(text) {
  return {
    _key: key(),
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [{ _key: key(), _type: 'span', marks: [], text }],
  };
}

const CREATIVE_ID = 'fd541138-8c76-4a55-9550-1e584c369e8a';
const DATA_ID = '5876150f-60cc-4599-aad6-170b79163554';
const AI_ID = 'd8b5d65a-ab00-4e7b-a3af-5a0fa4471b7b';
const CONSULTANT_REF = '4007f512-5725-4910-8cc6-90775cc34b06'; // Wilma

const BRAND_IDENTITY_OFFERINGS = [
  {
    _key: '2434a0196754',
    title: 'Brand Identity & Strategy',
    description: 'Complete brand systems including logos, color palettes, typography, and comprehensive brand guidelines.',
  },
  {
    _key: '8efb8d48619a',
    title: 'Visual Systems',
    description: 'Scalable design systems that maintain consistency across all touch points.',
  },
  {
    _key: 'd746296caefb',
    title: 'Marketing Collateral',
    description: 'Print and digital marketing materials that communicate your brand effectively.',
  },
  {
    _key: key(),
    title: 'Packaging Design',
    description: 'Packaging that carries your brand from the shelf to the unboxing moment.',
  },
];

const PRODUCT_DESIGN_OFFERINGS = [
  {
    _key: key(),
    title: 'Product Design',
    description: 'Physical and digital product design from concept through production-ready deliverables.',
  },
  {
    _key: key(),
    title: 'UI/UX Consultation',
    description: 'User interface and experience guidance for digital products and websites.',
  },
];

async function run() {
  const tx = client.transaction();

  // Repurpose the existing "Creative" doc in place -> Brand Identity
  tx.patch(CREATIVE_ID, (p) =>
    p.set({
      title: 'Brand Identity',
      slug: { _type: 'slug', current: 'brand-identity' },
      icon: 'brand-identity',
      order: 1,
      tagline: 'Design that looks intentional and earns trust',
      description: [
        block(
          'I help businesses develop visual identities — logos, color systems, typography, and the guidelines that hold them together — so every touchpoint feels intentional and instantly recognizable.'
        ),
        block(
          'Every project starts with understanding your business goals, audience, and competitive landscape. From there, I develop identity systems that are not only beautiful but strategically aligned with your objectives — brand, packaging, and everything in between.'
        ),
      ],
      offerings: BRAND_IDENTITY_OFFERINGS,
    })
  );

  // New Product Design service
  tx.createIfNotExists({
    _id: 'service-product-design',
    _type: 'service',
    title: 'Product Design',
    slug: { _type: 'slug', current: 'product-design' },
    icon: 'product-design',
    order: 2,
    consultant: { _type: 'reference', _ref: CONSULTANT_REF },
    tagline: 'Products that are as easy to use as they are to look at',
    description: [
      block(
        "I help businesses design physical and digital products — from early concept through production-ready deliverables — with a close eye on how real people will actually use them."
      ),
      block(
        "Every project starts with understanding the people who'll use it and the constraints you're designing within. From there, I move through sketches and prototypes to a polished, buildable solution."
      ),
    ],
    offerings: PRODUCT_DESIGN_OFFERINGS,
  });

  // Bump Data & AI down to keep Brand Identity / Product Design first
  tx.patch(DATA_ID, (p) => p.set({ order: 3 }));
  tx.patch(AI_ID, (p) => p.set({ order: 4 }));

  // Tag case studies with their service area(s)
  const brandIdentityStudies = [
    'bea864a6-77d8-431f-b05d-309e6f507587', // Freedom Yacht
    'c13acdda-f112-447c-86f8-bec1ab6797c7', // Reliant Life Sciences
  ];
  const productDesignStudies = [
    '570bafc9-bd1f-40a1-8701-cc094f33e1c0', // Harvard ManageMentor
    'MjdSXFelIF5IivE64xrdz6', // Fixerator
    '5s2JqVukoz2gxEpJ7G4Kl7', // Admin Experience for HBI
    'f1289f17-6593-441a-89a9-81ac2629134d', // Learner Experience for HBI
    'pathway-curation-hbi', // AI Pathway Curation for HBI
  ];

  for (const id of brandIdentityStudies) {
    tx.patch(id, (p) => p.set({ serviceAreas: ['brand-identity'] }));
  }
  for (const id of productDesignStudies) {
    tx.patch(id, (p) => p.set({ serviceAreas: ['product-design'] }));
  }

  await tx.commit();
  console.log('Done: Creative split into Brand Identity + Product Design, case studies tagged.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
