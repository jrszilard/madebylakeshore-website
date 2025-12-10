// Add or edit case studies here - both the listing and detail pages will update automatically

export const caseStudies = [
  {
    slug: 'Real Property Management',
    title: 'Sales Leaderboad',
    client: 'Real Property Management',
    category: 'KPI Dashboard' as const,
    author: 'Justin',
    duration: '4 weeks',
    year: '2025',
    heroImage: '/images/case-1.jpg',
    excerpt: 'A franchisee facing accountability of doors gained each month and within the year',
    results: [
      { value: '100%', label: 'Increase in new door visibility' },
      { value: '30%', label: 'Net New Door Growth' },
      { value: '2x', label: 'Franchise Engagement' },
    ],
    challenge: `
Real Property Management corporate was looking for a way to hold franshices accountable for the number of new doors they gained each month. With over 300 franchises across North America, tracking and motivating growth was a challenge

The project was already underway with another vendor but had stalled due to lack of progress and communication. They needed a fresh approach to get the dashboard built and deployed quickly.

    `.trim(),
    approach: `
We started with a lean discovery phase, interviewing leadership, and a quick mockup of the desired dashboard. With clear requirements, we moved into a rapid development cycle.

Regular check-ins with stakeholders ensured alignment and allowed for quick feedback. We focused on key metrics that drove behavior rather than overwhelming users with data

    `.trim(),
    solution: `
The final deliverables included:

• Month-to-Date and Year-to-Date new door tracking
• Previous Month's Doo Count Winner
• Total New Doors this Year
• Doors Remaining to Reach Year End Goal
• Franchise Ranking and Leaderboard
    `.trim(),
    testimonial: {
    quote: "QUOTE GOES HERE",
      author: 'FIRST NAME LAST NAME',
      title: 'TITLE GOES HERE',
    },
  },
  {
    slug: 'logistics-dashboard',
    title: 'Building a Real-Time Operations Dashboard',
    client: 'Global Logistics Co.',
    category: 'data' as const,
    author: 'Michael',
    duration: '6 weeks',
    year: '2024',
    heroImage: '/images/case-2.jpg',
    excerpt: 'Creating a Power BI dashboard that gave leadership instant visibility into operations across 12 regions, replacing 15 different spreadsheets.',
    results: [
      { value: '90%', label: 'Reduction in reporting time' },
      { value: '15→1', label: 'Data sources consolidated' },
      { value: '$2.1M', label: 'Annual savings identified' },
    ],
    challenge: `
Global Logistics operated across 12 regions, each with their own reporting spreadsheets, formats, and update schedules. Leadership spent the first week of every month just trying to compile a coherent picture of operations.

By the time reports were ready, the data was already stale. Decisions were made on gut feel rather than current information. Regional managers spent hours on reporting instead of managing.
    `.trim(),
    approach: `
We began by mapping all existing data sources—15 spreadsheets, 3 legacy systems, and 2 cloud applications. We identified the key metrics that actually drove decisions versus the "nice to have" data that cluttered existing reports.

Working closely with regional managers and executives, we designed a dashboard hierarchy: executive overview, regional deep-dives, and operational details. Each level answered different questions at different frequencies.
    `.trim(),
    solution: `
We built a Power BI solution that:

• Automatically pulls data from all 15 sources via scheduled refreshes
• Provides real-time visibility with data no more than 4 hours old
• Offers drill-down from company-wide KPIs to individual shipment details
• Includes anomaly detection that flags issues before they become problems
• Works on desktop and mobile for on-the-go access
• Features role-based views so each user sees relevant information

We also created a data dictionary and trained the team on self-service analytics.
    `.trim(),
    testimonial: {
      quote: "For the first time in our company's history, I can see exactly what's happening across all regions in real-time. We've already caught issues that would have cost us hundreds of thousands.",
      author: 'Robert Martinez',
      title: 'COO, Global Logistics Co.',
    },
  },
  {
    slug: 'finance-ai',
    title: 'Automating Financial Reports with AI',
    client: 'FinanceFirst',
    category: 'ai' as const,
    author: 'Michael',
    duration: '10 weeks',
    year: '2024',
    heroImage: '/images/case-3.jpg',
    excerpt: 'Implementing an AI-powered system that automated monthly report generation, freeing the finance team to focus on analysis instead of compilation.',
    results: [
      { value: '40→4', label: 'Hours per month saved' },
      { value: '99.9%', label: 'Accuracy rate' },
      { value: '3 days', label: 'Faster delivery' },
    ],
    challenge: `
FinanceFirst's monthly reporting process was a marathon. The finance team spent 40+ hours compiling data from multiple systems, formatting reports, writing commentary, and checking for errors. It was tedious, error-prone, and kept talented analysts doing data entry instead of analysis.

The reports themselves were valuable—board members and executives relied on them—but the process of creating them was unsustainable as the company grew.
    `.trim(),
    approach: `
We analyzed the existing reporting workflow step by step, identifying which tasks were rule-based (and thus automatable) versus which required human judgment. Surprisingly, about 80% of the work was mechanical.

We designed an AI-assisted system that would handle data extraction, transformation, initial commentary drafting, and formatting—while keeping humans in the loop for validation and strategic insights.
    `.trim(),
    solution: `
The solution combined several technologies:

• Automated data pipelines pulling from accounting, CRM, and operational systems
• SQL-based transformations ensuring data consistency and accuracy
• AI-generated first drafts of commentary sections based on variance analysis
• Templated report generation with consistent formatting
• Human review workflow with easy editing and approval
• Audit trail tracking all automated and manual changes

The finance team now reviews and refines reports instead of building them from scratch.
    `.trim(),
    testimonial: {
      quote: "Our team went from dreading month-end to actually having time for strategic analysis. The AI drafts are surprisingly good—we usually just tweak them rather than rewrite.",
      author: 'Amanda Foster',
      title: 'CFO, FinanceFirst',
    },
  },
];

// Helper to get category colors
export const categoryColors = {
  design: 'bg-mbl-warm/10 text-mbl-warm',
  data: 'bg-mbl-accent/10 text-mbl-accent',
  ai: 'bg-purple-100 text-purple-600',
};