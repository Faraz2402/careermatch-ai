// Clearly-labelled sample listings for development and the product demo.
// These are NOT real jobs: the UI badges them as "Demo data", they have no
// apply link, and the source is disabled in production.

import type { NormalizedJob, SourceDefinition } from "../types";

const DAY = 86_400_000;

type Seed = [title: string, company: string, location: string, mode: NormalizedJob["workMode"], type: string, salary: [number, number] | null, ageDays: number, body: string];

const SEEDS: Seed[] = [
  ["Senior Frontend Engineer (React)", "Northwind Labs", "Remote (US)", "remote", "full-time", [150000, 185000], 2,
    "Build our design-system-driven web app with React, TypeScript and Next.js. You will own performance, accessibility and testing (Jest, Playwright). Experience with GraphQL and Tailwind CSS is a plus. 5+ years of experience. Mentoring other engineers expected."],
  ["Full-Stack Engineer", "Bluebird Health", "Austin, TX", "hybrid", "full-time", [130000, 160000], 5,
    "Work across Node.js services and a React front end for healthcare scheduling. PostgreSQL, AWS, Docker and CI/CD. Familiarity with HIPAA and security best practices preferred. 3+ years of experience."],
  ["Staff Software Engineer, Platform", "Crescent Data", "Remote", "remote", "full-time", [190000, 230000], 9,
    "Lead the architecture of our Kubernetes-based platform. Deep experience with Go, distributed systems, Kafka and Terraform. System design leadership across teams; 8+ years."],
  ["Backend Engineer (Python)", "Lumen Analytics", "New York, NY", "onsite", "full-time", [140000, 170000], 12,
    "Design REST APIs with Python, FastAPI and PostgreSQL. Experience with Airflow, Snowflake and data pipelines. Unit testing with pytest."],
  ["Software Engineer II", "Harbor Finance", "Chicago, IL", "hybrid", "full-time", null, 3,
    "Ship features in TypeScript and React for a consumer finance app. Node.js microservices, Redis, AWS. Agile team; strong communication."],
  ["Machine Learning Engineer", "Quanta AI", "San Francisco, CA", "hybrid", "full-time", [180000, 220000], 7,
    "Train and deploy models with PyTorch. Experience with LLMs, NLP and MLOps on AWS or GCP. Python and SQL required."],
  ["Frontend Developer (Contract)", "Pixel & Pine", "Remote (Americas)", "remote", "contract", [70, 95], 1,
    "Six-month contract building marketing sites with Next.js, Tailwind CSS and a headless CMS. Figma handoff, SEO and accessibility experience."],
  ["Engineering Manager, Web", "Orbit Commerce", "Remote (US)", "remote", "full-time", [200000, 240000], 15,
    "Manage a team of 7 web engineers working in React and Node.js. Leadership, hiring, mentoring and stakeholder management. Prior hands-on full-stack experience required."],
  ["DevOps Engineer", "Granite Cloud", "Denver, CO", "onsite", "full-time", [125000, 150000], 20,
    "Own CI/CD, Terraform, Kubernetes and AWS infrastructure. Linux, Docker, monitoring and security hardening."],
  ["Junior Web Developer", "Maple Studio", "Toronto, ON", "hybrid", "full-time", [65000, 80000], 4,
    "Entry-level role working with HTML, CSS, JavaScript and React. Git and a willingness to learn testing practices."],
  ["Data Analyst", "Sundial Retail", "Remote", "remote", "full-time", [85000, 105000], 28,
    "SQL, Excel, Tableau and Power BI to analyse retail performance. Python (Pandas) is a plus. Communicate insights to stakeholders."],
  ["Senior Product Designer", "Fernway", "Seattle, WA", "hybrid", "full-time", [150000, 175000], 45,
    "Lead UX design and UI design for our mobile and web apps in Figma. Partner with product management and engineering."],
];

export const demo: SourceDefinition = {
  id: "demo",
  name: "Demo data",
  kind: "demo",
  homepage: "",
  attribution: "Sample listing for demonstration only - not a real job.",
  cacheTtlMs: 0,
  requestsPerMinute: 10_000,
  queryIndependent: true,
  missingConfig: () =>
    process.env.NODE_ENV === "production" || process.env.DEMO_JOBS === "false" ? "Disabled in production." : null,
  async fetchJobs() {
    const now = Date.now();
    return SEEDS.map(([title, company, location, workMode, type, salary, age, body], i) => ({
      source: "demo",
      externalId: `sample-${i + 1}`,
      title,
      company: `${company} (sample)`,
      location,
      workMode,
      employmentType: type,
      salaryMin: salary?.[0] ?? null,
      salaryMax: salary?.[1] ?? null,
      salaryCurrency: salary ? "USD" : null,
      salaryPeriod: salary ? (salary[0] < 1000 ? "hour" : "year") : null,
      description: `${body}\n\nThis is a sample listing generated for the CareerMatch AI demo. It does not represent a real opening.`,
      url: "",
      postedAt: new Date(now - age * DAY),
    }));
  },
};
