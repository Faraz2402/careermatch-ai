// Business, process and behavioural vocabulary for job-description analysis,
// with acronym <-> full-form equivalents ("P2P" = "Procure-to-Pay"). Works
// alongside the tech vocabulary in lib/skills.ts.

import type { ReqGroup } from "./types";

type Term = { name: string; aliases: string[]; group: Extract<ReqGroup, "tools" | "domain" | "behavioural"> };

const t = (group: Term["group"], name: string, ...aliases: string[]): Term => ({ name, aliases, group });

export const TERMS: Term[] = [
  // Tools / platforms
  t("tools", "SAP S/4HANA", "s/4hana", "s4hana", "s4 hana"),
  t("tools", "SAP MM", "sap materials management"),
  t("tools", "SAP Ariba", "ariba"),
  t("tools", "SAP", "sap erp", "sap ecc"),
  t("tools", "Coupa"),
  t("tools", "Oracle Fusion", "oracle cloud erp", "oracle erp"),
  t("tools", "Jaggaer"),
  t("tools", "Ivalua"),
  t("tools", "GEP SMART", "gep"),
  t("tools", "Microsoft Excel", "excel", "ms excel", "advanced excel"),
  t("tools", "VBA", "excel macros", "macros"),
  t("tools", "Power BI", "powerbi"),
  t("tools", "Tableau"),
  t("tools", "Looker"),
  t("tools", "Alteryx"),
  t("tools", "SQL", "t-sql", "pl/sql"),
  t("tools", "Python"),
  t("tools", "Salesforce", "sfdc"),
  t("tools", "HubSpot"),
  t("tools", "Jira"),
  t("tools", "Confluence"),
  t("tools", "Workday"),
  t("tools", "NetSuite"),
  t("tools", "Tally", "tally erp", "tally prime"),
  t("tools", "QuickBooks"),
  t("tools", "ServiceNow"),
  t("tools", "Microsoft Dynamics", "dynamics 365", "d365"),
  t("tools", "Google Analytics", "ga4"),
  t("tools", "Microsoft Office", "ms office", "office 365", "microsoft 365"),
  // Domain / process
  t("domain", "Procure-to-Pay (P2P)", "procure-to-pay", "procure to pay", "p2p"),
  t("domain", "Source-to-Pay (S2P)", "source-to-pay", "source to pay", "s2p"),
  t("domain", "Order-to-Cash (O2C)", "order-to-cash", "order to cash", "o2c"),
  t("domain", "Record-to-Report (R2R)", "record-to-report", "record to report", "r2r"),
  t("domain", "Strategic sourcing", "sourcing strategy", "sourcing"),
  t("domain", "Category management", "category manager", "category strategy"),
  t("domain", "Spend analysis", "spend analytics", "spend data", "spend cube"),
  t("domain", "Supplier relationship management (SRM)", "supplier relationship management", "srm", "supplier management", "vendor relationship management"),
  t("domain", "Vendor management", "vendor onboarding", "supplier onboarding", "vendor development"),
  t("domain", "Contract management", "contract lifecycle management", "clm", "contract negotiation"),
  t("domain", "RFx (RFI/RFP/RFQ)", "rfx", "rfp", "rfq", "rfi", "request for proposal", "request for quotation", "e-auction", "reverse auction"),
  t("domain", "Purchase orders", "purchase order", "purchase requisition", "po processing"),
  t("domain", "Supplier risk management", "supplier risk", "third-party risk", "vendor risk"),
  t("domain", "Cost savings", "cost reduction", "savings tracking", "cost optimisation", "cost optimization"),
  t("domain", "Supply chain management", "supply chain", "scm"),
  t("domain", "Inventory management", "inventory control", "stock management"),
  t("domain", "Demand planning", "demand forecasting", "s&op", "sales and operations planning"),
  t("domain", "Logistics", "freight", "warehousing", "transportation management"),
  t("domain", "Accounts payable (AP)", "accounts payable", "invoice processing", "ap process"),
  t("domain", "Accounts receivable (AR)", "accounts receivable", "collections"),
  t("domain", "Financial reporting", "management reporting", "month-end close", "month end close"),
  t("domain", "Budgeting and forecasting", "budgeting", "forecasting", "fp&a", "financial planning and analysis"),
  t("domain", "Variance analysis", "budget variance"),
  t("domain", "GST", "goods and services tax"),
  t("domain", "IFRS", "ind as", "ind-as"),
  t("domain", "GAAP", "us gaap"),
  t("domain", "Audit", "internal audit", "statutory audit", "audit readiness"),
  t("domain", "Compliance", "regulatory compliance", "policy compliance"),
  t("domain", "Risk management", "risk assessment", "risk mitigation"),
  t("domain", "KPIs", "kpi", "key performance indicators", "performance metrics"),
  t("domain", "SLAs", "sla", "service level agreements", "service levels"),
  t("domain", "Business analysis", "business analyst", "business requirements"),
  t("domain", "Requirements gathering", "requirement gathering", "brd", "user stories", "functional requirements"),
  t("domain", "Process improvement", "process optimisation", "process optimization", "process re-engineering", "continuous improvement"),
  t("domain", "Lean Six Sigma", "six sigma", "lean", "kaizen", "dmaic"),
  t("domain", "Agile", "scrum", "kanban", "sprint planning"),
  t("domain", "Project management", "project delivery", "pmp", "prince2"),
  t("domain", "Change management", "organisational change", "organizational change"),
  t("domain", "Data analysis", "data analytics", "analysing data", "analyzing data"),
  t("domain", "Data visualisation", "data visualization", "dashboards", "dashboarding"),
  t("domain", "Reporting", "mis reporting", "mis reports", "ad-hoc reporting"),
  t("domain", "Market research", "market analysis", "market intelligence", "competitive analysis"),
  t("domain", "Customer service", "customer support", "client servicing"),
  t("domain", "Account management", "key account management", "client management"),
  t("domain", "B2B sales", "business development", "lead generation"),
  t("domain", "Digital marketing", "performance marketing", "seo", "sem", "social media marketing"),
  t("domain", "Recruitment", "talent acquisition", "recruiting", "sourcing candidates"),
  t("domain", "Payroll"),
  t("domain", "ERP implementation", "erp rollout", "system implementation", "go-live"),
  t("domain", "Master data management", "master data", "mdm", "vendor master", "material master"),
  // Behavioural / leadership
  t("behavioural", "Stakeholder management", "stakeholder engagement", "managing stakeholders", "stakeholders"),
  t("behavioural", "Cross-functional collaboration", "cross-functional", "cross functional", "collaborate with teams"),
  t("behavioural", "Communication", "communication skills", "written and verbal", "verbal and written"),
  t("behavioural", "Negotiation", "negotiating", "negotiate"),
  t("behavioural", "Leadership", "lead a team", "people management", "team leadership"),
  t("behavioural", "Team management", "managing a team", "team lead", "line management"),
  t("behavioural", "Mentoring", "coaching", "coached", "mentor", "mentored", "mentors"),
  t("behavioural", "Problem solving", "problem-solving", "analytical thinking", "critical thinking"),
  t("behavioural", "Attention to detail", "detail-oriented", "detail oriented", "accuracy"),
  t("behavioural", "Time management", "prioritisation", "prioritization", "multitasking", "deadlines"),
  t("behavioural", "Presentation skills", "presenting", "presentations"),
  t("behavioural", "Ownership", "self-starter", "proactive", "accountability"),
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
/** Word-boundary pattern that tolerates "-", "/" and spaces inside terms. */
export const termPattern = (term: string) =>
  new RegExp(`(^|[^A-Za-z0-9+#&])${escape(term.toLowerCase()).replace(/(?:-|\s)+/g, "[-\\s]?")}(?=$|[^A-Za-z0-9+#])`, "i");

const COMPILED = TERMS.map((x) => ({ ...x, patterns: [x.name.replace(/\s*\(.*\)$/, ""), ...x.aliases].map(termPattern) }));

/** Business terms mentioned in a text (canonical names). */
export function findTerms(text: string): Term[] {
  return COMPILED.filter((x) => x.patterns.some((p) => p.test(text)));
}

/** Every way of writing a term: full form, acronym and aliases. */
export function termVariants(name: string): string[] {
  const found = TERMS.find((x) => x.name.toLowerCase() === name.toLowerCase());
  const bare = name.replace(/\s*\(.*\)$/, "");
  const acronym = name.match(/\(([^)]+)\)$/)?.[1];
  return [...new Set([name, bare, ...(acronym ? acronym.split("/") : []), ...(found?.aliases ?? [])].map((s) => s.trim()).filter((s) => s.length > 1))];
}

export const termGroup = (name: string) => TERMS.find((x) => x.name.toLowerCase() === name.toLowerCase())?.group;
