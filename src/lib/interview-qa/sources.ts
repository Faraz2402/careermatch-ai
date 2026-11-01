import "server-only";
// Openly licensed interview-question collections. Each source is a public GitHub
// repository whose licence allows reuse with attribution (MIT or CC BY 4.0); we
// keep the licence, attribution and a link back to the original on every row.
// Sites whose terms forbid scraping (Glassdoor, LinkedIn, Indeed, Blind, ...) are
// never crawled - the UI links out to them instead.

import { createHash } from "node:crypto";
import { ALL_DEPARTMENTS, type QuestionType } from "./taxonomy";

export type RawQuestion = {
  sourceId: string;
  question: string;
  answer?: string;
  type: QuestionType;
  department: string;
  roles: string[];
  company?: string;
  level?: string;
  skills?: string[];
  tools?: string[];
  roundType?: string;
  url: string;
};

export type InterviewSource = {
  key: string;
  name: string;
  repo: string;
  branch: string;
  license: string;
  attribution: string;
  /** Files whose latest commit date is shown as "Updated". */
  files: string[];
  fetch: () => Promise<RawQuestion[]>;
};

const UA = { "User-Agent": "CareerMatchAI/1.0 (+interview-qa; open-licence collections)" };
const raw = (repo: string, branch: string, path: string) => `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;
const blob = (repo: string, branch: string, path: string) => `https://github.com/${repo}/blob/${branch}/${path}`;

async function text(url: string) {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
}

export const stableId = (s: string) => createHash("sha1").update(s.trim().toLowerCase()).digest("hex").slice(0, 16);
const clean = (s: string) => s.replace(/<br\s*\/?>/gi, "").replace(/<\/?(table|tr|td|img)[^>]*>/gi, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
const LEVEL: Record<string, string> = { "👶": "Entry", "⭐️": "Mid", "⭐": "Mid", "🚀": "Senior" };
const stripEmoji = (s: string) => s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{FE0F}\u{200D}]/gu, "").trim();

// --- 30 seconds of interviews (MIT) ------------------------------------------------
const THIRTY: InterviewSource = {
  key: "30s-interviews",
  name: "30 Seconds of Interviews",
  repo: "Chalarangelo/30-seconds-of-interviews",
  branch: "master",
  license: "MIT",
  attribution: "30 Seconds of Interviews, © Angelos Chalaris and contributors (MIT licence)",
  files: ["data/questions.json"],
  async fetch() {
    type Q = { name: string; question: string; answer: string; goodToHear?: string[]; links?: string[]; tags?: string[]; expertise?: number; answerCodeBlocks?: string[]; questionCodeBlocks?: string[] };
    const data = JSON.parse(await text(raw(this.repo, this.branch, "data/questions.json"))) as Q[];
    const TAG: Record<string, string> = { javascript: "JavaScript", css: "HTML & CSS", html: "HTML & CSS", react: "React", accessibility: "Web Accessibility", node: "Node.js" };
    return data.map((q) => {
      const code = q.answer.includes("```") ? [] : (q.answerCodeBlocks ?? []);
      const good = q.goodToHear?.length ? `\n\n**Good to hear**\n${q.goodToHear.map((g) => `- ${g}`).join("\n")}` : "";
      const links = q.links?.length ? `\n\n**Further reading**\n${q.links.map((l) => `- ${l}`).join("\n")}` : "";
      const question = [q.question, ...(q.questionCodeBlocks ?? [])].join("\n\n");
      return {
        sourceId: q.name.replace(/\.md$/, ""),
        question,
        answer: clean([q.answer, ...code].join("\n\n") + good + links),
        type: "Conceptual" as const,
        department: "Engineering & Technology",
        roles: q.tags?.includes("node") ? ["Backend Developer", "Full-Stack Engineer"] : ["Frontend Developer", "Full-Stack Engineer"],
        level: ["Entry", "Mid", "Senior"][q.expertise ?? 1],
        skills: [...new Set((q.tags ?? []).map((t) => TAG[t]).filter(Boolean))],
        url: blob(this.repo, this.branch, `questions/${q.name}`),
      };
    });
  },
};

// --- Front-end Developer Interview Questions, h5bp (MIT) -----------------------------
const H5BP: InterviewSource = {
  key: "h5bp-fediq",
  name: "Front-end Developer Interview Questions (h5bp)",
  repo: "h5bp/Front-end-Developer-Interview-Questions",
  branch: "main",
  license: "MIT",
  attribution: "Front-end Developer Interview Questions, © H5BP and contributors (MIT licence)",
  files: ["src/questions"],
  async fetch() {
    const files: [string, string[], QuestionType][] = [
      ["general-questions", ["Analytical Problem Solving"], "Conceptual"],
      ["html-questions", ["HTML & CSS"], "Conceptual"],
      ["css-questions", ["HTML & CSS"], "Conceptual"],
      ["javascript-questions", ["JavaScript"], "Conceptual"],
      ["testing-questions", ["Test-Driven Development (TDD)"], "Conceptual"],
      ["performance-questions", ["System Design"], "Conceptual"],
      ["network-questions", ["RESTful/GraphQL APIs"], "Conceptual"],
      ["coding-questions", ["JavaScript"], "Coding"],
    ];
    const out: RawQuestion[] = [];
    for (const [file, skills, type] of files) {
      const path = `src/questions/${file}.md`;
      const md = await text(raw(this.repo, this.branch, path));
      let current: RawQuestion | null = null;
      for (const line of md.split("\n")) {
        const top = line.match(/^\* (.+)/);
        const sub = line.match(/^\s{2,}\* (.+)/);
        if (top) {
          if (current) out.push(current);
          current = { sourceId: `${file}-${stableId(top[1])}`, question: top[1].trim(), type, department: "Engineering & Technology", roles: ["Frontend Developer", "Full-Stack Engineer"], skills, url: blob(this.repo, this.branch, path) };
        } else if (sub && current) current.question += `\n- Follow-up: ${sub[1].trim()}`;
      }
      if (current) out.push(current);
      // Coding questions carry their code block on the following lines.
      if (type === "Coding") {
        const blocks = [...md.matchAll(/^\* (.+)\n\s*```(\w*)\n([\s\S]*?)```/gm)];
        for (const b of blocks) {
          const q = out.find((x) => x.sourceId === `${file}-${stableId(b[1])}`);
          if (q) q.question += `\n\n\`\`\`${b[2] || "js"}\n${b[3].replace(/^ {2}/gm, "").trimEnd()}\n\`\`\``;
        }
      }
    }
    return out;
  },
};

// --- React interview questions, Sudheer Jonna (MIT) -----------------------------------
const REACT: InterviewSource = {
  key: "react-iq",
  name: "React Interview Questions & Answers",
  repo: "sudheerj/reactjs-interview-questions",
  branch: "master",
  license: "MIT",
  attribution: "React Interview Questions & Answers, © Sudheer Jonna and contributors (MIT licence)",
  files: ["README.md"],
  async fetch() {
    const md = await text(raw(this.repo, this.branch, "README.md"));
    const lines = md.split("\n");
    const out: RawQuestion[] = [];
    let q: { title: string; body: string[] } | null = null;
    const flush = () => {
      if (!q) return;
      const answer = clean(q.body.map((l) => l.replace(/^ {4}/, "")).join("\n").replace(/\*\*\[⬆ Back to Top\]\(#[^)]*\)\*\*/g, ""));
      out.push({
        sourceId: stableId(q.title),
        question: q.title,
        answer: answer.slice(0, 9000) || undefined,
        type: /write|implement|code|output of/i.test(q.title) ? "Coding" : "Conceptual",
        department: "Engineering & Technology",
        roles: ["Frontend Developer", "Full-Stack Engineer"],
        skills: ["React"],
        url: blob(this.repo, this.branch, "README.md"),
      });
      q = null;
    };
    for (const line of lines) {
      const h = line.match(/^\s*\d+\.\s+### (.+?)\s*$/);
      if (h) {
        flush();
        q = { title: h[1].replace(/\s+$/, ""), body: [] };
      } else if (/^#{1,3} (Table of Contents|Disclaimer)/i.test(line)) flush();
      else if (q) q.body.push(line);
    }
    flush();
    return out;
  },
};

// --- Data science interviews, Alexey Grigorev and contributors (CC BY 4.0) ---------------
const DS = {
  repo: "alexeygrigorev/data-science-interviews",
  branch: "master",
  license: "CC BY 4.0",
  attribution: "Data Science Interviews, Alexey Grigorev and contributors (CC BY 4.0)",
};
const DS_THEORY: InterviewSource = {
  ...DS,
  key: "ds-theory",
  name: "Data Science Interviews (theory)",
  files: ["theory.md"],
  async fetch() {
    const md = await text(raw(this.repo, this.branch, "theory.md"));
    const out: RawQuestion[] = [];
    let section = "";
    let q: { title: string; level?: string; body: string[] } | null = null;
    const flush = () => {
      if (!q) return;
      const answer = clean(q.body.join("\n"));
      out.push({
        sourceId: stableId(q.title),
        question: q.title,
        answer: answer && !/^answer here\.?$/i.test(answer) ? answer : undefined,
        type: "Conceptual",
        department: "Data & Analytics",
        roles: ["Data Scientist", "Machine Learning Engineer", "AI Research Scientist"],
        level: q.level,
        skills: /neural|deep/i.test(section) ? ["Deep Learning"] : /text|nlp/i.test(section) ? ["Natural Language Processing (NLP)"] : ["Predictive Modeling"],
        url: blob(this.repo, this.branch, "theory.md"),
      });
      q = null;
    };
    for (const line of md.split("\n")) {
      const sec = line.match(/^## (.+)/);
      const head = line.match(/^\*\*(.+?)\*\*\s*$/);
      if (sec) {
        flush();
        section = sec[1];
      } else if (head && /\?|[👶⭐🚀]/u.test(head[1])) {
        flush();
        const level = Object.keys(LEVEL).find((e) => head[1].includes(e));
        q = { title: stripEmoji(head[1]), level: level ? LEVEL[level] : undefined, body: [] };
      } else if (q) q.body.push(line);
    }
    flush();
    return out.filter((x) => x.question.length > 8);
  },
};
const DS_TECH: InterviewSource = {
  ...DS,
  key: "ds-technical",
  name: "Data Science Interviews (technical)",
  files: ["technical.md"],
  async fetch() {
    const md = await text(raw(this.repo, this.branch, "technical.md"));
    const out: RawQuestion[] = [];
    let section = "";
    let preamble: string[] = [];
    let q: { title: string; body: string[] } | null = null;
    const flush = () => {
      if (!q) return;
      const sql = /sql/i.test(section);
      const context = sql ? `Schema: ${preamble.filter((l) => /^\* /.test(l)).map((l) => l.slice(2)).join("; ")}\n\n` : "";
      out.push({
        sourceId: stableId(`${section} ${q.title}`),
        question: `${context}${q.title}`.trim(),
        answer: clean(q.body.join("\n")) || undefined,
        type: sql ? "SQL" : "Coding",
        department: "Data & Analytics",
        roles: sql ? ["Data Analyst", "Data Scientist", "Data Engineer", "Business Intelligence (BI) Developer"] : ["Data Scientist", "Data Engineer", "Machine Learning Engineer"],
        skills: sql ? ["Data Modeling"] : /algorithm/i.test(section) ? ["Data Structures & Algorithms (DSA)", "Python"] : ["Python"],
        tools: sql ? ["SQL"] : [],
        url: blob(this.repo, this.branch, "technical.md"),
      });
      q = null;
    };
    for (const line of md.split("\n")) {
      const sec = line.match(/^## (.+)/);
      const head = line.match(/^\*\*\d+\)\*?\*?\s*(.+)$/) ?? line.match(/^\*\*\d+\)\s*([^*]+)\*\*\.?\s*(.*)$/);
      if (sec) {
        flush();
        section = sec[1];
        preamble = [];
      } else if (head) {
        flush();
        q = { title: head.slice(1).join(" ").replace(/\*\*/g, "").replace(/\s+/g, " ").trim(), body: [] };
      } else if (q) q.body.push(line);
      else preamble.push(line);
    }
    flush();
    return out.filter((x) => !/table of contents/i.test(x.question));
  },
};

// --- System Design Primer, Donne Martin (CC BY 4.0) ----------------------------------------
const SDP: InterviewSource = {
  key: "system-design-primer",
  name: "System Design Primer",
  repo: "donnemartin/system-design-primer",
  branch: "master",
  license: "CC BY 4.0",
  attribution: "The System Design Primer, © Donne Martin (CC BY 4.0)",
  files: ["README.md"],
  async fetch() {
    const md = await text(raw(this.repo, this.branch, "README.md"));
    const out: RawQuestion[] = [];
    for (const [heading, type] of [["System design interview questions with solutions", "System Design"], ["Object-oriented design interview questions with solutions", "System Design"]] as const) {
      const part = md.split(`## ${heading}`)[1]?.split(/\n## /)[0] ?? "";
      for (const row of part.matchAll(/^\| ([^|]+?) \| \[Solution\]\(([^)]+)\) \|/gm)) {
        const [, question, path] = row;
        if (/^question$/i.test(question.trim())) continue;
        const ood = heading.startsWith("Object");
        out.push({
          sourceId: stableId(question),
          question: question.trim(),
          answer: `A complete worked solution (use cases, constraints, high-level design, core components and scaling steps${ood ? ", with class design and code" : ""}) is published in the System Design Primer:\n\n[Read the full solution](${blob(this.repo, this.branch, path.replace(/^\.?\//, ""))})\n\n**How to structure your answer**\n1. Clarify use cases, users and constraints (traffic, data size, latency).\n2. Sketch the high-level design and the main components.\n3. Design the core components: data model, APIs, storage.\n4. Scale it: identify bottlenecks, then add caching, load balancing, replication and sharding as needed.`,
          type,
          department: "Engineering & Technology",
          roles: ood ? ["Backend Developer", "Full-Stack Engineer"] : ["Backend Developer", "Full-Stack Engineer", "Cloud Architect", "DevOps Engineer"],
          level: "Senior",
          skills: ood ? ["Object-Oriented Programming (OOP)", "System Design"] : ["System Design", "Distributed Systems"],
          url: blob(this.repo, this.branch, path.replace(/^\.?\//, "")),
        });
      }
    }
    return out;
  },
};

// --- Tech Interview Handbook, Yangshun Tay (MIT) ---------------------------------------
const BEHAVIORAL: InterviewSource = {
  key: "tih-behavioral",
  name: "Tech Interview Handbook (behavioral)",
  repo: "yangshun/tech-interview-handbook",
  branch: "main",
  license: "MIT",
  attribution: "Tech Interview Handbook, © Yangshun Tay and contributors (MIT licence)",
  files: ["apps/website/contents/behavioral-interview-questions.md"],
  async fetch() {
    const path = "apps/website/contents/behavioral-interview-questions.md";
    const md = await text(raw(this.repo, this.branch, path));
    const out: RawQuestion[] = [];
    let company: string | undefined;
    let inList = false;
    for (const line of md.split("\n")) {
      const sec = line.match(/^## (.+)/);
      if (sec) {
        const m = sec[1].match(/^(.+?) Software Engineer behavioral interview questions/i);
        company = m ? m[1].trim() : undefined;
        inList = /behavioral (interview )?questions/i.test(sec[1]);
        continue;
      }
      const item = inList && line.match(/^\s*(?:\d+\.|[-*])\s+(.+)/);
      if (!item) continue;
      const question = item[1].replace(/_([^_]+)_/g, "$1").trim();
      if (question.length < 12) continue;
      out.push({
        sourceId: stableId(`${company ?? "common"} ${question}`),
        question,
        type: "Behavioral",
        department: ALL_DEPARTMENTS,
        roles: [],
        company,
        roundType: "Behavioral",
        skills: ["STAR Method Execution"],
        url: blob(this.repo, this.branch, path),
      });
    }
    return out;
  },
};

// --- Tech Interview Master: company behavioral guides + Amazon LPs (MIT) ---------------
/** A guide's "good" STAR answer as Markdown: code fences and quote marks dropped, S/T/A/R labels bolded. */
function starAnswer(body: string) {
  const good = body.split(/\n\s*❌/)[0];
  return clean(
    good
      .split("\n")
      .filter((l) => !/^\s*```/.test(l) && !/^\s*✅\s*\**\s*good answer/i.test(l))
      .map((l) => l.replace(/^>\s?/, "").replace(/^(Situation|Task|Action|Result|Learning|Growth|S|T|A|R)\s*:/, "**$1:**").replace(/^\*\*(Situation|Task|Action|Result|Learning|Growth)\*\*\s*:/, "**$1:**"))
      .join("\n"),
  );
}

const TIM_COMPANIES: Record<string, string> = { google: "Google", meta: "Meta", microsoft: "Microsoft", apple: "Apple" };

const TIM: InterviewSource = {
  key: "tim-behavioral",
  name: "Tech Interview Master (behavioral)",
  repo: "kartikth40/tech-interview-master",
  branch: "main",
  license: "MIT",
  attribution: "Tech Interview Master, © kartikth40 and contributors (MIT licence)",
  files: ["Behavioral/company-specific/google.md", "Behavioral/leadership-principles.md"],
  async fetch() {
    const out: RawQuestion[] = [];
    const base = { type: "Behavioral" as const, department: ALL_DEPARTMENTS, roles: [], roundType: "Behavioral" };
    for (const [file, company] of Object.entries(TIM_COMPANIES)) {
      const path = `Behavioral/company-specific/${file}.md`;
      const md = await text(raw(this.repo, this.branch, path));
      // "**Q: ...**" blocks inside the "Common ... Behavioral Questions" section, each followed by a STAR answer.
      const section = md.split(/\n## /).find((s) => /^(\S+\s+)?Common .*Behavioral Questions/i.test(s));
      if (!section) continue;
      let theme: string | undefined;
      const parts = section.split(/\n(?=\*\*Q:|### )/);
      for (const part of parts) {
        const th = part.match(/^### \**([^*\n]+?)\**\s*$/m);
        if (part.startsWith("### ")) {
          theme = th?.[1].replace(/\s*Questions?$/i, "").trim();
          continue;
        }
        const qm = part.match(/^\*\*Q:\s*"?(.+?)"?\*\*/);
        if (!qm) continue;
        const question = qm[1].replace(/"$/, "").trim();
        const answer = starAnswer(part.slice(qm[0].length).split(/\n---/)[0]);
        out.push({
          ...base,
          sourceId: stableId(`${company} ${question}`),
          question,
          answer: answer || undefined,
          roundType: theme ? `Behavioral · ${theme}` : "Behavioral",
          company,
          skills: ["STAR Method Execution"],
          url: blob(this.repo, this.branch, path),
        });
      }
    }
    // Amazon: questions listed under each of the 16 Leadership Principles.
    const lpPath = "Behavioral/leadership-principles.md";
    const lp = await text(raw(this.repo, this.branch, lpPath));
    for (const block of lp.split(/\n(?=### \d+\. )/).slice(1)) {
      const principle = block.match(/^### \d+\.\s*\**([^*\n]+)\**/)?.[1].trim();
      if (!principle) continue;
      const qs = block.split(/\*\*Interview Questions?(?: Examples)?:\*\*/)[1]?.split(/\n\*\*/)[0] ?? "";
      for (const m of qs.matchAll(/^- "(.+?)"\s*$/gm)) {
        out.push({
          ...base,
          sourceId: stableId(`Amazon ${m[1]}`),
          question: m[1].trim(),
          company: "Amazon",
          skills: ["STAR Method Execution"],
          roundType: `Leadership Principle · ${principle}`,
          url: blob(this.repo, this.branch, lpPath),
        });
      }
    }
    return out;
  },
};

export const INTERVIEW_SOURCES: InterviewSource[] = [THIRTY, H5BP, REACT, DS_THEORY, DS_TECH, SDP, BEHAVIORAL, TIM];

/** Latest commit date of the source's files (GitHub API, unauthenticated; null if rate-limited). */
export async function sourceUpdatedAt(s: InterviewSource): Promise<Date | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${s.repo}/commits?path=${encodeURIComponent(s.files[0])}&per_page=1`, { headers: { ...UA, Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const [c] = (await res.json()) as { commit?: { committer?: { date?: string } } }[];
    return c?.commit?.committer?.date ? new Date(c.commit.committer.date) : null;
  } catch {
    return null;
  }
}
