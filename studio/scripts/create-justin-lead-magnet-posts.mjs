import { getCliClient } from 'sanity/cli';
import fs from 'node:fs';

const client = getCliClient({ apiVersion: '2024-01-01' });

const JUSTIN_REF = '7b68cfea-f12d-45c3-b3e3-c7f9572fb532';
const OLD_SITE = '/Users/wilmariehuertas/Downloads/wilmariehuertas old website/wp-content/uploads/2025/10';

function key() {
  return Math.random().toString(36).slice(2, 14);
}

function p(text) {
  return { _key: key(), _type: 'block', style: 'normal', markDefs: [], children: [{ _key: key(), _type: 'span', marks: [], text }] };
}

function h2(text) {
  return { _key: key(), _type: 'block', style: 'h2', markDefs: [], children: [{ _key: key(), _type: 'span', marks: [], text }] };
}

function bullet(text) {
  return { _key: key(), _type: 'block', style: 'normal', level: 1, listItem: 'bullet', markDefs: [], children: [{ _key: key(), _type: 'span', marks: [], text }] };
}

function downloadLink(fileUrl, label) {
  const linkKey = key();
  return {
    _key: key(),
    _type: 'block',
    style: 'normal',
    markDefs: [{ _key: linkKey, _type: 'link', href: fileUrl, blank: true }],
    children: [{ _key: key(), _type: 'span', marks: [linkKey], text: label }],
  };
}

async function uploadPdf(filename) {
  const filePath = `${OLD_SITE}/${filename}`;
  const asset = await client.assets.upload('file', fs.createReadStream(filePath), {
    filename,
  });
  return asset.url;
}

async function createPost({ title, slug, excerpt, categories, body }) {
  const doc = {
    _type: 'blogPost',
    title,
    slug: { _type: 'slug', current: slug },
    author: { _type: 'reference', _ref: JUSTIN_REF },
    excerpt,
    categories,
    body,
    publishedAt: new Date().toISOString(),
  };
  const created = await client.create(doc);
  console.log(`  created: ${created.title} (${created._id})`);
  return created;
}

async function run() {
  console.log('Uploading PDFs...');
  const aiBiUrl = await uploadPdf('ai-powered_business_intelligence_smb_owners_guide.pdf');
  const playbookUrl = await uploadPdf('data_mess_to_data_success_playbook.pdf');
  const excelUrl = await uploadPdf('Excel_Health_Check_25_point_Audit.pdf');
  const powerBiUrl = await uploadPdf('power_bi_quick_start_guide_for_small_business.pdf');
  const starterKitUrl = await uploadPdf('small_business_dashboard_starter_kit.pdf');

  console.log('Creating posts...');

  await createPost({
    title: 'AI-Powered Business Intelligence: The SMB Owner\'s Guide',
    slug: 'ai-powered-business-intelligence-smb-guide',
    excerpt: 'For decades, real business intelligence was a Fortune 500 luxury: a team of analysts, a six-figure budget, months of work. AI changes that math.',
    categories: ['AI'],
    body: [
      p('For decades, sophisticated business intelligence was reserved for companies with million-dollar budgets and teams of data analysts. That era is over. The same analytics capabilities that once required 5 to 10 specialists can now be delivered by a single AI-augmented consultant, at a fraction of the cost and in a fraction of the time.'),
      h2('Old Way vs. New Way'),
      p('Traditional BI consulting runs 3 to 6 months, costs $50,000 to $150,000, and needs a team of 5 to 10 people: discovery interviews, hand-coded dashboards, manual QA, the works. An AI-powered engagement runs 4 to 8 weeks, costs $5,000 to $20,000, and needs one AI-augmented consultant. AI handles the repetitive technical work (SQL queries, dashboard code, testing at scale), while the human provides strategic thinking, validation, and the judgment that makes the results actually usable.'),
      h2('What This Looks Like in Practice'),
      p('The guide walks through two real scenarios: an 8-location retail chain that went from 12 hours a week consolidating spreadsheets to 1, and identified $40,000 in slow-moving inventory in the process; and a professional services firm that couldn\'t tell which clients were actually profitable until month-end close.'),
      downloadLink(aiBiUrl, 'Download the full guide →'),
    ],
  });

  await createPost({
    title: 'The Data Mess to Data Success Playbook',
    slug: 'data-mess-to-data-success-playbook',
    excerpt: '78% of small businesses say their data is scattered across systems, spreadsheets, and sticky notes. This playbook is the manageable, no-technical-degree path out.',
    categories: ['Data & Analytics'],
    body: [
      p('If your business data feels chaotic, you\'re in good company. The majority of small businesses report data scattered across systems, spreadsheets, and even sticky notes, and every data-driven business started exactly there.'),
      h2('Start With an Honest Inventory'),
      p('Before you can fix anything, you need to know what you have and where it lives: every spreadsheet, every piece of accounting software, every CRM, every inbox, every drawer of paper records. The playbook\'s Data Health Assessment scores your business across four dimensions (accessibility, accuracy, timeliness, security) and tells you, honestly, how urgent the problem is.'),
      h2('The Single Source of Truth Principle'),
      p('The core fix is simple to state and hard to do: every piece of information should live in exactly one authoritative place, with everything else referencing it rather than duplicating it. The guide walks through identifying your core data domains (customers, products, vendors, employees, transactions) and choosing where each one should actually live.'),
      downloadLink(playbookUrl, 'Download the full playbook →'),
    ],
  });

  await createPost({
    title: 'Excel Health Check: 25-Point Audit',
    slug: 'excel-health-check-25-point-audit',
    excerpt: 'A scored checklist to find out whether your Excel-based reporting is actually working, or quietly costing you hours and money every week.',
    categories: ['Data & Analytics'],
    body: [
      p('Excel is often the right tool, until it isn\'t, and most businesses don\'t notice the shift until it\'s already expensive. This 25-point checklist scores your reporting system across five areas: data quality, time and efficiency, collaboration, scalability, and security.'),
      h2('The Warning Signs'),
      p('The checklist calls out specific, recognizable failure patterns: the "bus factor" (only one person understands how the reports work), the Sunday night scramble to prep Monday\'s numbers, decisions made on outdated data because the wrong file version got opened. If more than a couple of these sound familiar, that\'s the signal.'),
      h2('What Your Score Means'),
      p('Scoring under 5 means your system is healthy. Scoring 20 or higher means Excel has become a business liability, with an estimated $37,500 to $100,000 a year in lost productivity from manual workarounds alone.'),
      downloadLink(excelUrl, 'Download the full checklist →'),
    ],
  });

  await createPost({
    title: 'Power BI Quick Start Guide for Small Business',
    slug: 'power-bi-quick-start-guide-small-business',
    excerpt: 'A beginner-friendly path from zero to a working Power BI dashboard in under four hours, including which license tier actually makes sense for a small team.',
    categories: ['Data & Analytics'],
    body: [
      p('Power BI has become the default business intelligence tool for small and medium businesses: the same platform Fortune 500 companies use, with a free desktop app and a Pro tier that costs $10 per user per month. This guide gets you from a clean install to your first working dashboard.'),
      h2('Picking the Right License'),
      p('Power BI Desktop is free forever and enough to build unlimited dashboards for yourself. Power BI Pro, at $10 a user monthly, is what most small teams actually need once they want to share dashboards and collaborate. Premium, at $4,995 a month, only makes sense past 250 users or very large datasets, which is not most small businesses.'),
      h2('From Install to First Dashboard'),
      p('The guide walks through installing Power BI Desktop, setting up a Microsoft account, understanding the three core views (Report, Data, and Model), and building a first sales dashboard from sample data in 30 to 45 minutes.'),
      downloadLink(powerBiUrl, 'Download the full guide →'),
    ],
  });

  await createPost({
    title: 'Small Business Dashboard Starter Kit',
    slug: 'small-business-dashboard-starter-kit',
    excerpt: 'Five pre-built dashboard templates, Sales, Financial KPI, Operational, Customer Analytics, and Marketing ROI, ready to drop your own data into.',
    categories: ['Data & Analytics'],
    body: [
      p('Building a dashboard from a blank canvas is the slowest way to get to a useful answer. This starter kit includes five pre-built templates, each available in both Excel and Power BI formats with sample data included, so you can see exactly what each one does before you touch your own numbers.'),
      h2('What\'s Included'),
      bullet('Sales Performance Dashboard: revenue, pipeline, and sales rep performance'),
      bullet('Financial KPI Dashboard: profitability, cash flow, and expenses'),
      bullet('Operational Metrics Dashboard: productivity, efficiency, and quality'),
      bullet('Customer Analytics Dashboard: behavior and retention'),
      bullet('Marketing ROI Dashboard: campaign performance and lead generation'),
      h2('Built to Start From, Not Around'),
      p('Each template lists exactly what data source it needs (a CRM export, or a spreadsheet with specific columns) and includes filters, drill-downs, and built-in threshold alerts already configured, so the setup work is replacing sample data with real data, not building the dashboard from scratch.'),
      downloadLink(starterKitUrl, 'Download the starter kit →'),
    ],
  });

  console.log('Done: all 5 posts created.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
