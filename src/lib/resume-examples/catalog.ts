// Categories, roles and the planned samples (id, level, template) for every role x country.
import { COUNTRY_CODES, LEVELS, TEMPLATE_IDS, type CountryCode, type Level, type TemplateId } from "./types";

export const CATEGORIES: { slug: string; name: string; blurb: string }[] = [
  { slug: "accounting-finance", name: "Accounting & Finance", blurb: "Résumés for people who keep the numbers honest: closing the books, building forecasts and explaining variances to the people who make decisions." },
  { slug: "business-management", name: "Business & Management", blurb: "Samples for analysts, operators and product people who turn messy requirements into plans, processes and measurable improvements." },
  { slug: "creative-cultural", name: "Creative & Cultural", blurb: "For writers, curators, producers and artists whose work is judged by a portfolio as much as by a job history." },
  { slug: "data-science", name: "Data Science", blurb: "Résumés that show how you cleaned, modelled and explained data, and what changed because someone acted on your analysis." },
  { slug: "design", name: "Design", blurb: "For visual, product and UX designers: show the problem, your process and the outcome, then point to the portfolio." },
  { slug: "engineering", name: "Engineering", blurb: "Samples for mechanical, civil and electrical engineers, with the standards, tools and licences each market expects to see." },
  { slug: "executive", name: "Executive", blurb: "Senior leadership résumés focused on scope, strategy and results across budgets, teams and markets." },
  { slug: "food-service", name: "Food Service", blurb: "For cooks, servers and hospitality staff: speed, hygiene certificates and guest experience, written plainly." },
  { slug: "freelance", name: "Freelance", blurb: "How to present client work, contracts and self-employment as a coherent career rather than a list of gigs." },
  { slug: "government", name: "Government", blurb: "Public-sector résumés that meet the stricter formats and selection criteria many government employers use." },
  { slug: "human-resources", name: "Human Resources", blurb: "For HR generalists, recruiters and people partners who can show impact on hiring, retention and employee relations." },
  { slug: "information-technology", name: "Information Technology", blurb: "Support, infrastructure and security résumés that prove reliability with uptime, ticket and incident numbers." },
  { slug: "internships-entry-level", name: "Internships & Entry Level", blurb: "First-job résumés built on coursework, projects, part-time work and volunteering instead of years of experience." },
  { slug: "law-enforcement-emergency", name: "Law Enforcement & Emergency Services", blurb: "For police, paramedics and firefighters, where training records, certifications and calm under pressure matter most." },
  { slug: "legal", name: "Legal", blurb: "Résumés for lawyers, paralegals and legal assistants, with admissions, practice areas and matters described precisely." },
  { slug: "maintenance-repair", name: "Maintenance & Repair", blurb: "For technicians and trades: tickets, licences and safety records that show you fix things right the first time." },
  { slug: "manufacturing-warehousing", name: "Manufacturing & Warehousing", blurb: "Production and logistics résumés built around throughput, quality, safety and the equipment you are certified on." },
  { slug: "marketing", name: "Marketing", blurb: "For marketers who can connect campaigns to pipeline and revenue, not just impressions and followers." },
  { slug: "healthcare-nursing", name: "Healthcare & Nursing", blurb: "Clinical résumés that put registration, specialties and patient-care outcomes where hiring managers look first." },
  { slug: "office-administration", name: "Office & Administration", blurb: "For administrators and customer-facing staff who keep teams organised, informed and on schedule." },
  { slug: "project-management", name: "Project Management", blurb: "Résumés that show scope, budget, timeline and stakeholder results, with the methods and certifications you use." },
  { slug: "real-estate", name: "Real Estate", blurb: "For agents, property managers and analysts: listings, occupancy and transaction results in local terms." },
  { slug: "sales-retail", name: "Sales & Retail", blurb: "From the shop floor to enterprise deals: quotas, conversion and customer loyalty, shown with real-looking numbers." },
  { slug: "salon-spa", name: "Salon & Spa", blurb: "For stylists, therapists and salon staff whose rebooking rates and client loyalty tell the story." },
  { slug: "science-research", name: "Science & Research", blurb: "Research résumés with methods, publications and lab skills presented for both industry and academia." },
  { slug: "software-engineering", name: "Software Engineering", blurb: "For developers and platform engineers: what you built, how it scaled, and the stack you used to ship it." },
  { slug: "sports-recreation", name: "Sports & Recreation", blurb: "For coaches, instructors and recreation staff, with certifications, programmes run and participant results." },
  { slug: "teaching-education", name: "Teaching & Education", blurb: "Teaching résumés that show qualifications, subjects, year groups and the progress your learners made." },
  { slug: "travel-transportation", name: "Travel & Transportation", blurb: "For drivers, travel agents and logistics staff: safety records, licences and on-time performance." },
  { slug: "quality-assurance", name: "Quality Assurance", blurb: "For testers and quality specialists who prevent defects and can show it with escape rates and audit results." },
  { slug: "special-situations", name: "Special Situations", blurb: "Career changes, returning after a break, and ATS-friendly layouts: résumés for when your story needs extra care." },
];

export const ROLES: { slug: string; name: string; category: string }[] = [
  { slug: "software-engineer", name: "Software Engineer", category: "software-engineering" },
  { slug: "front-end-developer", name: "Front-End Developer", category: "software-engineering" },
  { slug: "devops-engineer", name: "DevOps Engineer", category: "software-engineering" },
  { slug: "it-support-specialist", name: "IT Support Specialist", category: "information-technology" },
  { slug: "cybersecurity-analyst", name: "Cybersecurity Analyst", category: "information-technology" },
  { slug: "data-analyst", name: "Data Analyst", category: "data-science" },
  { slug: "data-scientist", name: "Data Scientist", category: "data-science" },
  { slug: "registered-nurse", name: "Registered Nurse", category: "healthcare-nursing" },
  { slug: "medical-assistant", name: "Medical Assistant", category: "healthcare-nursing" },
  { slug: "pharmacist", name: "Pharmacist", category: "healthcare-nursing" },
  { slug: "accountant", name: "Accountant", category: "accounting-finance" },
  { slug: "financial-analyst", name: "Financial Analyst", category: "accounting-finance" },
  { slug: "marketing-manager", name: "Marketing Manager", category: "marketing" },
  { slug: "digital-marketing-specialist", name: "Digital Marketing Specialist", category: "marketing" },
  { slug: "sales-associate", name: "Sales Associate", category: "sales-retail" },
  { slug: "account-executive", name: "Account Executive", category: "sales-retail" },
  { slug: "store-manager", name: "Store Manager", category: "sales-retail" },
  { slug: "business-analyst", name: "Business Analyst", category: "business-management" },
  { slug: "operations-manager", name: "Operations Manager", category: "business-management" },
  { slug: "product-manager", name: "Product Manager", category: "business-management" },
  { slug: "teacher", name: "Teacher", category: "teaching-education" },
  { slug: "teaching-assistant", name: "Teaching Assistant", category: "teaching-education" },
  { slug: "project-manager", name: "Project Manager", category: "project-management" },
  { slug: "hr-generalist", name: "HR Generalist", category: "human-resources" },
  { slug: "recruiter", name: "Recruiter", category: "human-resources" },
  { slug: "administrative-assistant", name: "Administrative Assistant", category: "office-administration" },
  { slug: "customer-service-representative", name: "Customer Service Representative", category: "office-administration" },
  { slug: "graphic-designer", name: "Graphic Designer", category: "design" },
  { slug: "ux-designer", name: "UX Designer", category: "design" },
  { slug: "mechanical-engineer", name: "Mechanical Engineer", category: "engineering" },
];

/** Planned Phase 1 samples: every role in every country, levels and templates rotated so each role has 2 of each level. */
export const PLAN: { id: string; role: string; category: string; country: CountryCode; level: Level; template: TemplateId }[] = ROLES.flatMap((r, ri) =>
  COUNTRY_CODES.map((country, ci) => {
    const level = LEVELS[(ci + ri) % 3];
    return { id: `${r.slug}-${country}-${level}`, role: r.slug, category: r.category, country, level, template: TEMPLATE_IDS[(ci + 2 * ri) % 3] };
  }),
);

export const categoryOf = (slug: string) => CATEGORIES.find((c) => c.slug === slug);
export const roleOf = (slug: string) => ROLES.find((r) => r.slug === slug);
