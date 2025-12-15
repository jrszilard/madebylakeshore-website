// Add or edit case studies here - both the listing and detail pages will update automatically

export const caseStudies = [
  {
    slug: 'product-design',
    title: 'Sales HBR Spark',
    client: 'Harvard Business Publishing',
    category: 'design' as const,
    author: 'Wilma',
    duration: '12 weeks',
    year: '2025',
    heroImage: '/images/case-1.jpg',
    excerpt: 'Branding and product design for a new leadership learning platform aimed at modern leadership teams.',
    results: [
      { value: '100%', label: 'Increase in new door visibility' },
      { value: '30%', label: 'Net New Door Growth' },
      { value: '2x', label: 'Franchise Engagement' },
    ],
    challenge: `
Company corporate was looking for a way to hold franshices accountable for the number of new doors they gained each month. With over 300 franchises across North America, tracking and motivating growth was a challenge

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
  /*    
  {
    slug: 'KPI-dashboard',
    title: 'Sales Leaderboad',
    client: 'Real Property Management',
    category: 'data' as const,
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
  */
  {
    slug: 'Drop-Ship-Report',
    title: 'Balancing Efficiency and Partnership Through Data Collaboration',
    client: 'Wire Belt Company of America',
    category: 'data' as const,
    author: 'Justin',
    duration: '8 weeks',
    year: '2023',
    heroImage: '/images/case-2.jpg',
    excerpt: 'Developing a Power BI solution that visualized drop ship trends, enabling Wire Belt and its distribution partner to find a cost-efficient balance between inventory and responsiveness.',
    results: [
      { value: '38%', label: 'Reduction in total drop ships' },
      { value: '3', label: 'Key customers identified as primary cost drivers' },
      { value: '12', label: 'Repetitive part SKUs optimized' }
    ],
    challenge: `
Wire Belt manufactures stainless steel conveyor belts for food processing customers and relies on distribution partners to keep local replacement stock. While the partner preferred drop shipping to reduce inventory costs, Wire Belt faced mounting shipping expenses from numerous small orders.


Both sides agreed that drop ships were necessary for emergencies, but neither had visibility into who requested them or how often they occurred. Without this transparency, they struggled to align operational priorities and control costs.
    `.trim(),
    approach: `
We started by facilitating open data sharing between Wire Belt and the distribution partner’s business data owners, ensuring both teams understood the shared goal: balancing service quality with financial efficiency.


Through stakeholder interviews and data exploration, we merged ERP data with the partner’s internal requests to map drop ship frequency, customers involved, and part-level details. This discovery phase revealed opportunities for focused cost reduction rather than broad restrictions.
    `.trim(),
    solution: `
Using Power BI and Excel, we built a modular dashboard that could pivot between high-level insights and specific customer or part details. The report enabled both Wire Belt and the partner to:


• Visualize drop ship trends by customer, branch, and part type  
• Identify repeat shipments and high-cost customers  
• Quantify the financial impact of excessive small-order drop ships  
• Model scenarios for adjusting stocking levels or consolidating shipments


These insights pinpointed a handful of customers driving most of the extra cost, allowing leaders to establish targeted stocking agreements instead of company-wide limits.
    `.trim(),
    testimonial: {
      quote: "INSERT QUOTE HERE.",
      author: 'FIRST NAME LAST NAME',
      title: 'WIRE BELT COMPANY OF AMERICA',
    },
  },
  {
    slug: 'ETL-orgnanization-reporting',
    title: 'Linking Multiple Datasources to Deliever In Depth Financial Reporting',
    client: 'Fortune Brands',
    category: 'data' as const,
    author: 'Justin',
    duration: '12 weeks',
    year: '2025',
    heroImage: '/images/case-3.jpg',
    excerpt: 'Utilizing Tableau Prep as an ETL tool to quickly organize and clean data from multiple sources to create in depth financial reports for leadership.',
    results: [
      { value: '40→4', label: 'Hours per month saved' },
      { value: '99.9%', label: 'Accuracy rate' },
      { value: '3 days', label: 'Faster delivery' },
    ],
    challenge: `
Fortune Brands has multiple business units with each of those having a unique data storage system forcing leaders to need to referce multiple reports to get the full picture.

The organization was working on a modern data platform that compines these sources but while that system was being built they asked for me to create a faster solution using Tableau Prep
    `.trim(),
    approach: `
We analyze what sources were available, what common fields existed across the sources, and what the ETL process would look like to be quick to make and stable.

We worked with the owners of each data source to create a connection, bring the data into Tableau Prep, and then clean, organize, and union the data into a single source for reporting.
    `.trim(),
    solution: `
The solution combined several technologies:

• Automated data pipelines pulling from four different sources
• Handled data cleaning from tens of millions of rows down to a few hundred thousand relevant records to maintain performance 
• Unifed product and sales number categories across business units
• Created a suite of financial reports in Tableau that refreshed daily with the latest data

The finance team now reviews and refines reports instead of referencing multiple sources and manually combining data.
    `.trim(),
    testimonial: {
    quote: "QUOTE GOES HERE",
      author: 'FIRST NAME LAST NAME',
      title: 'TITLE GOES HERE',
    },
  },
];

// Helper to get category colors
export const categoryColors = {
  design: 'bg-mbl-warm/10 text-mbl-warm',
  data: 'bg-mbl-accent/10 text-mbl-accent',
  ai: 'bg-purple-100 text-purple-600',
};