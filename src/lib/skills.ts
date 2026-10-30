// Skill vocabulary used for deterministic matching. Each canonical skill maps
// to the patterns that indicate it in free text. Kept intentionally broad but
// not exhaustive; unknown skills from the resume are still matched literally.

type Entry = { category: string; aliases?: string[] };

const VOCAB: Record<string, Entry> = {
  JavaScript: { category: "Languages", aliases: ["javascript", "js", "es6", "ecmascript"] },
  TypeScript: { category: "Languages", aliases: ["typescript", "ts"] },
  Python: { category: "Languages" },
  Java: { category: "Languages" },
  "C#": { category: "Languages", aliases: ["c#", "csharp", ".net c#"] },
  "C++": { category: "Languages", aliases: ["c++", "cpp"] },
  Go: { category: "Languages", aliases: ["golang", "go lang"] },
  Rust: { category: "Languages" },
  Ruby: { category: "Languages" },
  PHP: { category: "Languages" },
  Kotlin: { category: "Languages" },
  Swift: { category: "Languages" },
  Scala: { category: "Languages" },
  R: { category: "Languages", aliases: ["r programming", "r language"] },
  SQL: { category: "Data", aliases: ["sql", "t-sql", "pl/sql"] },
  HTML: { category: "Frontend", aliases: ["html", "html5"] },
  CSS: { category: "Frontend", aliases: ["css", "css3", "sass", "scss"] },
  React: { category: "Frontend", aliases: ["react", "react.js", "reactjs"] },
  "Next.js": { category: "Frontend", aliases: ["next.js", "nextjs"] },
  Vue: { category: "Frontend", aliases: ["vue", "vue.js", "vuejs", "nuxt"] },
  Angular: { category: "Frontend", aliases: ["angular", "angularjs"] },
  Svelte: { category: "Frontend" },
  "Tailwind CSS": { category: "Frontend", aliases: ["tailwind", "tailwindcss"] },
  Redux: { category: "Frontend" },
  "Node.js": { category: "Backend", aliases: ["node.js", "nodejs", "node"] },
  Express: { category: "Backend", aliases: ["express", "express.js"] },
  Django: { category: "Backend" },
  Flask: { category: "Backend" },
  FastAPI: { category: "Backend" },
  Spring: { category: "Backend", aliases: ["spring", "spring boot"] },
  Rails: { category: "Backend", aliases: ["rails", "ruby on rails"] },
  ".NET": { category: "Backend", aliases: [".net", "dotnet", "asp.net"] },
  GraphQL: { category: "Backend" },
  "REST APIs": { category: "Backend", aliases: ["rest", "restful", "rest api", "rest apis"] },
  Microservices: { category: "Backend", aliases: ["microservices", "microservice"] },
  PostgreSQL: { category: "Data", aliases: ["postgres", "postgresql"] },
  MySQL: { category: "Data" },
  MongoDB: { category: "Data", aliases: ["mongodb", "mongo"] },
  Redis: { category: "Data" },
  Elasticsearch: { category: "Data" },
  Kafka: { category: "Data", aliases: ["kafka", "apache kafka"] },
  Spark: { category: "Data", aliases: ["spark", "apache spark", "pyspark"] },
  Airflow: { category: "Data" },
  dbt: { category: "Data" },
  Snowflake: { category: "Data" },
  BigQuery: { category: "Data" },
  Pandas: { category: "Data" },
  "Data analysis": { category: "Data", aliases: ["data analysis", "data analytics"] },
  Tableau: { category: "Data" },
  "Power BI": { category: "Data", aliases: ["power bi", "powerbi"] },
  Excel: { category: "Tools", aliases: ["excel", "microsoft excel"] },
  "Machine learning": { category: "AI/ML", aliases: ["machine learning", "ml"] },
  "Deep learning": { category: "AI/ML", aliases: ["deep learning"] },
  PyTorch: { category: "AI/ML" },
  TensorFlow: { category: "AI/ML" },
  "scikit-learn": { category: "AI/ML", aliases: ["scikit-learn", "sklearn"] },
  LLMs: { category: "AI/ML", aliases: ["llm", "llms", "large language models", "generative ai", "genai"] },
  NLP: { category: "AI/ML", aliases: ["nlp", "natural language processing"] },
  AWS: { category: "Cloud & DevOps", aliases: ["aws", "amazon web services"] },
  GCP: { category: "Cloud & DevOps", aliases: ["gcp", "google cloud"] },
  Azure: { category: "Cloud & DevOps", aliases: ["azure", "microsoft azure"] },
  Docker: { category: "Cloud & DevOps" },
  Kubernetes: { category: "Cloud & DevOps", aliases: ["kubernetes", "k8s"] },
  Terraform: { category: "Cloud & DevOps" },
  "CI/CD": { category: "Cloud & DevOps", aliases: ["ci/cd", "continuous integration", "github actions", "jenkins"] },
  Linux: { category: "Cloud & DevOps" },
  Git: { category: "Tools", aliases: ["git", "github", "gitlab"] },
  Jira: { category: "Tools" },
  Figma: { category: "Design" },
  "UX design": { category: "Design", aliases: ["ux", "user experience", "ux design"] },
  "UI design": { category: "Design", aliases: ["ui design", "user interface design"] },
  "Product management": { category: "Product", aliases: ["product management", "product manager", "roadmap"] },
  Agile: { category: "Practices", aliases: ["agile", "scrum", "kanban"] },
  "Unit testing": { category: "Practices", aliases: ["unit testing", "jest", "pytest", "tdd", "test-driven"] },
  Playwright: { category: "Practices" },
  Cypress: { category: "Practices" },
  Selenium: { category: "Practices" },
  Accessibility: { category: "Frontend", aliases: ["accessibility", "a11y", "wcag"] },
  "System design": { category: "Practices", aliases: ["system design", "distributed systems", "scalability"] },
  Security: { category: "Practices", aliases: ["security", "owasp", "application security"] },
  SEO: { category: "Marketing" },
  "Digital marketing": { category: "Marketing", aliases: ["digital marketing", "performance marketing"] },
  Salesforce: { category: "Tools" },
  "Project management": { category: "Business", aliases: ["project management", "pmp"] },
  Leadership: { category: "Soft skills", aliases: ["leadership", "led a team", "mentoring", "mentored"] },
  Communication: { category: "Soft skills", aliases: ["communication", "stakeholder management"] },
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function patternFor(alias: string) {
  // Word-ish boundaries that tolerate symbols like C#, C++, .NET, Node.js
  return new RegExp(`(^|[^a-z0-9+#.])${escape(alias.toLowerCase())}(?=$|[^a-z0-9+#])`, "i");
}

// Ordinary English words that are also skill names. In prose they only count
// when written with the canonical capitalisation (or via an unambiguous alias).
const AMBIGUOUS = new Set(["go", "r", "swift", "spring", "express", "rails", "node", "git", "excel", "security", "communication", "leadership", "rest"]);

const COMPILED = Object.entries(VOCAB).map(([name, e]) => {
  const words = [name.toLowerCase(), ...(e.aliases ?? [])];
  const patterns = words.filter((w) => !AMBIGUOUS.has(w)).map(patternFor);
  if (AMBIGUOUS.has(name.toLowerCase()) && name.length > 1) {
    // case-sensitive canonical form, not followed by a hyphen ("Go-to-market")
    patterns.push(new RegExp(`(^|[^A-Za-z0-9+#])${escape(name)}(?=$|[^A-Za-z0-9+#-])`));
  }
  return { name, category: e.category, patterns };
});

/** Find vocabulary skills mentioned in a block of text. */
export function extractSkills(text: string): { name: string; category: string }[] {
  return COMPILED.filter((s) => s.patterns.some((p) => p.test(text)));
}

export function canonicalSkill(raw: string): string {
  const t = raw.trim();
  const lower = t.toLowerCase();
  for (const [name, e] of Object.entries(VOCAB))
    if (name.toLowerCase() === lower || e.aliases?.includes(lower)) return name;
  for (const s of COMPILED) if (s.patterns.some((p) => p.test(t)) && t.length <= s.name.length + 12) return s.name;
  return t;
}

export function categoryOf(skill: string): string {
  return VOCAB[canonicalSkill(skill)]?.category ?? "Other";
}

/**
 * Does the text mention this (possibly non-vocabulary) skill? Pass the
 * result of extractSkills(text) as `found` when checking many skills against
 * the same text, so the vocabulary is scanned once.
 */
export function textMentionsSkill(text: string, skill: string, found?: Set<string>): boolean {
  const canon = canonicalSkill(skill);
  if (VOCAB[canon]) return (found ?? new Set(extractSkills(text).map((s) => s.name))).has(canon);
  return patternFor(skill).test(text);
}

export function groupSkills(skills: string[]): { category: string; skills: string[] }[] {
  const groups = new Map<string, Set<string>>();
  for (const raw of skills) {
    const name = canonicalSkill(raw);
    const cat = categoryOf(name);
    if (!groups.has(cat)) groups.set(cat, new Set());
    groups.get(cat)!.add(name);
  }
  return [...groups.entries()].map(([category, s]) => ({ category, skills: [...s] }));
}
