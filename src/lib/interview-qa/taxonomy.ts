// Interview Q&A taxonomy: departments -> roles, the software tool index and the
// market skill matrix. Every question is tagged against these lists, and the
// filters on /interview-qa are built from them.

export const ALL_DEPARTMENTS = "All departments";

export const DEPARTMENTS: Record<string, string[]> = {
  "Engineering & Technology": ["Frontend Developer", "Backend Developer", "Full-Stack Engineer", "DevOps Engineer", "Cloud Architect", "Cybersecurity Analyst", "QA Automation Engineer"],
  "Data & Analytics": ["Data Scientist", "Data Analyst", "Data Engineer", "Machine Learning Engineer", "Business Intelligence (BI) Developer", "AI Research Scientist"],
  "Supply Chain & Procurement": ["Procurement Specialist", "Sourcing Manager", "Supply Chain Analyst", "Logistics Coordinator", "Category Manager", "Vendor Relationship Manager"],
  "Business Analysis & Strategy": ["Business Analyst (BA)", "Technical Business Analyst", "Agile Product Analyst", "Systems Analyst", "Process Optimization Consultant", "Management Consultant"],
  "Product & Design": ["Product Manager (Technical/Growth)", "UI/UX Designer", "Product Designer", "Interaction Designer", "User Researcher"],
  "Marketing & Growth": ["Growth Marketer", "SEO Specialist", "Performance Marketing Manager", "Content Strategist", "Social Media Manager", "Brand Manager"],
  "Sales & Business Development": ["Account Executive (AE)", "Business Development Representative (BDR)", "Customer Success Manager (CSM)", "Sales Engineer", "Enterprise Partnerships Manager"],
  "Finance, Legal & Operations": ["Financial Analyst", "Investment Banking Analyst", "Corporate Strategy Manager", "Compliance Officer", "Legal Counsel", "HR Specialist", "Operations Manager"],
};

export const DEPARTMENT_NAMES = Object.keys(DEPARTMENTS);
export const ALL_ROLES = Object.values(DEPARTMENTS).flat();
export const departmentOf = (role: string) => DEPARTMENT_NAMES.find((d) => DEPARTMENTS[d].includes(role));

type Tag = { name: string; match: RegExp };

/** Software tool index (what interviewers test hands-on). */
export const TOOLS: (Tag & { covers: string })[] = [
  { name: "Excel", covers: "XLOOKUP, INDEX/MATCH, Power Query, VBA macros, pivot tables", match: /\b(excel|xlookup|vlookup|index\s*\/\s*match|pivot table|vba|power query|spreadsheet)\b/i },
  { name: "Power BI", covers: "DAX, data modelling, M code, dashboards, Power BI Service", match: /\b(power ?bi|dax|m code)\b/i },
  { name: "Tableau", covers: "LOD expressions, calculated fields, blending, dashboards", match: /\b(tableau|lod expression)\b/i },
  { name: "SQL", covers: "Window functions, CTEs, joins, query optimisation, normalisation", match: /\b(sql|select\b.*\bfrom|join|window function|cte|group by|normali[sz]ation|postgres|mysql)\b/i },
  { name: "Salesforce", covers: "CRM workflows, Apex, SOQL, Sales/Service Cloud", match: /\b(salesforce|apex|soql|service cloud|sales cloud)\b/i },
  { name: "Oracle NetSuite", covers: "ERP configuration, SuiteAnalytics, saved searches", match: /\b(netsuite|suiteanalytics|saved search)\b/i },
  { name: "SAP", covers: "MM, SD, FI/CO, SAP HANA, T-codes", match: /\b(sap|hana|t-?code|fi\/co|ariba)\b/i },
];

/** Market skill matrix: clusters of skills, each with keyword patterns used by the tagger. */
export const SKILL_CLUSTERS: { cluster: string; departments: string[]; skills: Tag[] }[] = [
  {
    cluster: "Software Engineering & Systems",
    departments: ["Engineering & Technology"],
    skills: [
      { name: "System Design", match: /\b(design (a|an|the)\b|system design|scal(e|ability|able)|load balanc|sharding|cach(e|ing)|throughput|latency)\b/i },
      { name: "Object-Oriented Programming (OOP)", match: /\b(object[- ]oriented|oop|polymorphism|encapsulation|design pattern|solid principles)\b/i },
      { name: "Data Structures & Algorithms (DSA)", match: /\b(algorithm|big[- ]o|complexity|linked list|binary (tree|search)|hash ?map|graph|sort(ing)?|recursion|dynamic programming|array)\b/i },
      { name: "CI/CD Pipelines", match: /\b(ci\/cd|continuous (integration|delivery|deployment)|pipeline|build tool|webpack|bundl)/i },
      { name: "Microservices Architecture", match: /\b(microservice|service mesh|monolith)\b/i },
      { name: "RESTful/GraphQL APIs", match: /\b(rest(ful)?|graphql|api|http|endpoint|fetch|ajax|cors)\b/i },
      { name: "Test-Driven Development (TDD)", match: /\b(test(s|ing)?|tdd|unit test|jest|mock)\b/i },
      { name: "Containerization & Orchestration", match: /\b(docker|kubernetes|container)\b/i },
      { name: "Distributed Systems", match: /\b(distributed|consisten(cy|t hashing)|replication|partition|consensus|cap theorem|key-value store)\b/i },
    ],
  },
  {
    cluster: "Languages & Frameworks",
    departments: ["Engineering & Technology", "Data & Analytics"],
    skills: [
      { name: "JavaScript", match: /\b(javascript|js|es6|closure|promise|async|event loop|hoisting|this\b|prototype)\b/i },
      { name: "TypeScript", match: /\btypescript\b/i },
      { name: "React", match: /\b(react|jsx|hooks?|usestate|useeffect|redux|virtual dom|component)\b/i },
      { name: "HTML & CSS", match: /\b(html|css|flexbox|grid layout|selector|specificity|box model|dom|semantic)\b/i },
      { name: "Web Accessibility", match: /\b(accessib|aria|a11y|screen reader)\b/i },
      { name: "Python", match: /\b(python|pandas|numpy)\b/i },
      { name: "Node.js", match: /\bnode(\.js)?\b/i },
    ],
  },
  {
    cluster: "Data Science, AI & ML",
    departments: ["Data & Analytics"],
    skills: [
      { name: "LLM Fine-Tuning", match: /\b(fine-?tun|llm|large language model)\b/i },
      { name: "Retrieval-Augmented Generation (RAG)", match: /\b(rag|retrieval-augmented|vector (db|database|search)|embedding)\b/i },
      { name: "Prompt Engineering", match: /\bprompt\b/i },
      { name: "Deep Learning", match: /\b(neural network|deep learning|cnn|rnn|lstm|backprop|activation function|dropout|transformer|convolution)\b/i },
      { name: "Predictive Modeling", match: /\b(regression|classification|random forest|gradient boost|decision tree|overfit|regulari[sz]|cross-validation|feature (selection|engineering)|svm|k-?nn|model)\b/i },
      { name: "Natural Language Processing (NLP)", match: /\b(nlp|text classification|tokeni[sz]|word2vec|tf-?idf|bag of words|sentiment)\b/i },
      { name: "MLOps", match: /\b(mlops|model deployment|monitoring model|drift)\b/i },
      { name: "Statistical Analysis", match: /\b(statistic|p-?value|hypothesis|distribution|variance|probability|confidence interval|bayes|correlation)\b/i },
      { name: "A/B Testing", match: /\b(a\/b test|ab test|experiment|split test)\b/i },
      { name: "Data Engineering Pipelines", match: /\b(etl|elt|data pipeline|spark|airflow|kafka|batch processing|streaming data)\b/i },
    ],
  },
  {
    cluster: "Product, Analytics & Optimization",
    departments: ["Product & Design", "Business Analysis & Strategy", "Data & Analytics"],
    skills: [
      { name: "Business Intelligence", match: /\b(business intelligence|dashboard|kpi|report(ing)?)\b/i },
      { name: "Data Modeling", match: /\b(data model|schema|star schema|normali[sz]|entity)\b/i },
      { name: "Data Warehousing (Snowflake/BigQuery)", match: /\b(data warehouse|snowflake|bigquery|redshift|olap)\b/i },
      { name: "Requirements Gathering", match: /\b(requirement|stakeholder|user need)\b/i },
      { name: "Business Process Mapping (BPMN)", match: /\b(bpmn|process map|as-is|to-be|workflow)\b/i },
      { name: "User Story Mapping", match: /\buser stor(y|ies)\b/i },
      { name: "Agile/Scrum Frameworks", match: /\b(agile|scrum|sprint|kanban|backlog)\b/i },
      { name: "Product Analytics", match: /\b(product analytics|retention|funnel|cohort|engagement|metric)\b/i },
      { name: "Feature Specification", match: /\b(spec(ification)?|prd|feature)\b/i },
      { name: "Product Roadmap Strategy", match: /\b(roadmap|prioriti[sz])/i },
    ],
  },
  {
    cluster: "Supply Chain, Commerce & Procurement",
    departments: ["Supply Chain & Procurement"],
    skills: [
      { name: "Vendor Negotiation", match: /\bnegotiat/i },
      { name: "Strategic Sourcing", match: /\b(sourcing|rfq|rfp|tender)\b/i },
      { name: "Contract Management", match: /\bcontract/i },
      { name: "Spend Analysis", match: /\bspend\b/i },
      { name: "Logistics & Freight Optimization", match: /\b(logistic|freight|shipping|warehouse operation)/i },
      { name: "Inventory Control (EOQ/Just-In-Time)", match: /\b(inventory|eoq|just-in-time|jit|stock level)\b/i },
      { name: "Category Strategy", match: /\bcategory (strategy|management)\b/i },
      { name: "Risk Mitigation", match: /\b(supply risk|risk mitigation)\b/i },
      { name: "Supplier Relationship Management (SRM)", match: /\b(supplier|vendor) (relationship|management)\b/i },
    ],
  },
  {
    cluster: "Growth & Revenue Generation",
    departments: ["Marketing & Growth", "Sales & Business Development"],
    skills: [
      { name: "Growth Hacking", match: /\bgrowth hack/i },
      { name: "Search Engine Optimization (SEO)", match: /\b(seo|search engine optimi[sz]ation)\b/i },
      { name: "Search Engine Marketing (SEM)", match: /\b(sem|paid search|google ads)\b/i },
      { name: "Performance Marketing", match: /\b(performance marketing|roas|cpc|cpa|campaign)\b/i },
      { name: "Funnel Optimization", match: /\b(conversion rate|funnel)\b/i },
      { name: "Customer Acquisition Cost (CAC) Management", match: /\b(cac|customer acquisition cost)\b/i },
      { name: "Customer Lifetime Value (LTV) Modeling", match: /\b(ltv|lifetime value)\b/i },
      { name: "B2B Enterprise Selling", match: /\b(b2b|enterprise (sale|selling|deal))\b/i },
      { name: "Pipeline Management", match: /\b(sales pipeline|pipeline management|quota)\b/i },
    ],
  },
  {
    cluster: "Finance, Strategy & Corporate Operations",
    departments: ["Finance, Legal & Operations", "Business Analysis & Strategy"],
    skills: [
      { name: "Financial Modeling (DCF/LBO)", match: /\b(dcf|lbo|financial model|discounted cash flow)\b/i },
      { name: "Corporate Valuation", match: /\b(valuation|multiples|enterprise value)\b/i },
      { name: "Risk Management", match: /\brisk management\b/i },
      { name: "Quantitative Analysis", match: /\bquantitative\b/i },
      { name: "Regulatory Compliance", match: /\b(compliance|regulat|gdpr|sox)\b/i },
      { name: "Auditing", match: /\baudit/i },
      { name: "Talent Acquisition Strategy", match: /\b(talent acquisition|recruit|hiring)\b/i },
      { name: "Workforce Planning", match: /\bworkforce plan/i },
      { name: "Change Management", match: /\bchange management\b/i },
    ],
  },
  {
    cluster: "Core Professional / Behavioral Competencies",
    departments: DEPARTMENT_NAMES,
    skills: [
      { name: "Leadership & Team Management", match: /\b(lead(ership)?|manag(e|ing) (a )?team|mentor|influence)\b/i },
      { name: "Cross-Functional Collaboration", match: /\b(cross-functional|collaborat|co-?worker|colleague|stakeholder)\b/i },
      { name: "Conflict Resolution", match: /\b(conflict|disagree)\b/i },
      { name: "Crisis Management", match: /\b(crisis|outage|incident|tight deadline|under pressure)\b/i },
      { name: "Communication", match: /\b(communicat|explain|present|feedback)\b/i },
      { name: "Analytical Problem Solving", match: /\b(problem|challenge|bug|debug|difficult)\b/i },
      { name: "Case Study Breakdown", match: /\b(case study|estimate|market size|guesstimate)\b/i },
      { name: "STAR Method Execution", match: /\b(tell me about a time|describe a time|give an example of a time|talk about a)\b/i },
    ],
  },
];

export const ALL_SKILLS = SKILL_CLUSTERS.flatMap((c) => c.skills.map((s) => s.name));

/** Skill clusters relevant to the chosen departments (all of them when none chosen). */
export function skillsFor(departments: string[]) {
  const clusters = departments.length ? SKILL_CLUSTERS.filter((c) => c.departments.some((d) => departments.includes(d))) : SKILL_CLUSTERS;
  return clusters.map((c) => ({ cluster: c.cluster, skills: c.skills.map((s) => s.name) }));
}

export const QUESTION_TYPES = ["Coding", "SQL", "System Design", "Conceptual", "Behavioral", "Case"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Skills and tools found in a question (and its answer, which often names the concept). */
export function tagText(question: string, answer = "") {
  const q = question;
  const qa = `${question}\n${answer.slice(0, 600)}`;
  const tools = TOOLS.filter((t) => t.match.test(q)).map((t) => t.name);
  const skills = SKILL_CLUSTERS.flatMap((c) => c.skills)
    .filter((s) => s.match.test(q) || (s.match.test(qa) && !/^(Communication|Analytical Problem Solving|Feature Specification)$/.test(s.name)))
    .map((s) => s.name);
  return { tools: [...new Set(tools)], skills: [...new Set(skills)].slice(0, 8) };
}
