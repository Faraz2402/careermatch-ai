// Rule-based resume parser, used when no AI provider is configured (and as a
// safety net if the AI call fails). It aims to get the structure roughly right
// so the user can correct it in the review step - it never invents content.

import { extractSkills, groupSkills } from "../skills";
import { emptyResume, type ResumeData } from "./schema";

const HEADINGS: Record<string, RegExp> = {
  summary: /^(professional\s+)?(summary|profile|about( me)?|objective|overview)$/i,
  experience: /^(work\s+|professional\s+)?(experience|employment( history)?|work history|career history)$/i,
  education: /^(education|academic background|education & training)$/i,
  skills: /^((technical|core|key|top)\s+)?(skills|competencies|technologies|tech stack|skills & tools)$/i,
  contact: /^(contact|contact info(rmation)?)$/i,
  ignored: /^(languages|honors-awards|honors & awards|publications|patents|volunteer experience)$/i,
  certifications: /^(certifications?|licenses?( & certifications)?|certificates)$/i,
  projects: /^(projects|selected projects|personal projects|side projects)$/i,
  links: /^(links|online|profiles)$/i,
};

const DATE = String.raw`(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+)?(?:19|20)\d{2}`;
const RANGE = new RegExp(`(${DATE})\\s*(?:-|–|—|to)\\s*(${DATE}|present|current|now)`, "i");

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE = /(\+?\(?\d[\d\s().-]{7,}\d)/;
const URL_RE = /\b((?:https?:\/\/)?(?:www\.)?(?:linkedin\.com|github\.com|gitlab\.com|behance\.net|dribbble\.com|[\w-]+\.(?:dev|io|me|com|net|org))\/?[^\s,|)]*)/gi;

function headingKey(line: string): string | null {
  const clean = line.replace(/[:#*_]/g, "").trim();
  if (clean.length > 40) return null;
  for (const [key, re] of Object.entries(HEADINGS)) if (re.test(clean)) return key;
  return null;
}

const bullet = (l: string) => /^\s*[•\-*▪◦]\s+/.test(l);
const stripBullet = (l: string) => l.replace(/^\s*[•\-*▪◦]\s+/, "").trim();

/** LinkedIn "Save to PDF" exports put Contact / Top Skills in a sidebar first. */
export const isLinkedInExport = (text: string) => /linkedin\.com\/in\//i.test(text) && /^top skills$/im.test(text);

const LINKISH = /linkedin|www\.|https?:|\((linkedin|mobile|home|work)\)/i;

export function parseResumeHeuristically(text: string): ResumeData {
  const r = emptyResume();
  const linkedIn = isLinkedInExport(text);
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => !/^page \d+ of \d+$/i.test(l));
  const sections: Record<string, string[]> = { header: [] };
  let current = "header";
  let sidebarSkills = 0;
  for (const line of lines) {
    const key = headingKey(line);
    if (key) {
      current = key;
      sections[current] ??= [];
      continue;
    }
    // LinkedIn lists exactly three "Top Skills"; the name and headline follow.
    if (linkedIn && current === "skills" && !sections.experience && line && ++sidebarSkills > 3) current = "header";
    // Sidebar "Languages" entries look like "English (Native or Bilingual)".
    const proficiency = /\((native|full professional|professional working|limited working|elementary)/i.test(line);
    if (linkedIn && current === "ignored" && !sections.summary && !sections.experience && line && !proficiency) current = "header";
    (sections[current] ??= []).push(line);
  }

  // Header: name, headline, contact details
  const header = [...sections.header, ...(sections.contact ?? [])].filter(Boolean);
  r.email = text.match(EMAIL)?.[0] ?? "";
  const phone = header.join(" ").match(PHONE)?.[1] ?? "";
  r.phone = phone.replace(/\s+/g, " ").trim();
  const first = header.find((l) => !EMAIL.test(l) && !PHONE.test(l) && !LINKISH.test(l) && l.split(" ").length <= 5);
  r.name = first ?? "";
  const rest = header.filter((l) => l !== first);
  const headline = rest.find((l) => !EMAIL.test(l) && !PHONE.test(l) && !URL_RE.test(l) && l.length < 90);
  URL_RE.lastIndex = 0;
  r.headline = headline ?? "";
  const locLine = rest.find((l) => /\b[A-Z][a-zA-Z .]+,\s*[A-Z]{2}\b|remote/i.test(l) && l !== headline);
  r.location = locLine?.split(/[|•·]/).find((p) => /,|remote/i.test(p))?.trim() ?? "";

  // Links anywhere in the document
  const seen = new Set<string>();
  for (const m of text.matchAll(URL_RE)) {
    const url = m[1].replace(/[.,;]$/, "");
    if (EMAIL.test(url) || seen.has(url) || !/\//.test(url) && !/linkedin|github/i.test(url)) continue;
    seen.add(url);
    const label = /linkedin/i.test(url) ? "LinkedIn" : /github/i.test(url) ? "GitHub" : "Website";
    r.links.push({ label, url: url.startsWith("http") ? url : `https://${url}` });
  }

  r.summary = (sections.summary ?? []).filter(Boolean).join(" ").trim();

  r.experience = parseExperience((sections.experience ?? []).filter(Boolean), linkedIn);

  r.education = parseEducation((sections.education ?? []).filter(Boolean));
  r.skills = parseSkills((sections.skills ?? []).filter(Boolean), text);
  r.certifications = parseCertifications((sections.certifications ?? []).filter(Boolean));

  const proj = (sections.projects ?? []).filter(Boolean);
  let p: ResumeData["projects"][number] | null = null;
  for (const line of proj) {
    if (!bullet(line) && line.length < 80) {
      if (p) r.projects.push(p);
      p = { name: line.split(/[|–—]/)[0].trim(), description: "", url: "", technologies: [] };
    } else if (p) {
      p.description = [p.description, stripBullet(line)].filter(Boolean).join(" ");
    }
  }
  if (p) r.projects.push(p);
  for (const pr of r.projects) pr.technologies = extractSkills(pr.description).map((s) => s.name);

  if (!r.headline && r.experience[0]) r.headline = r.experience[0].title;
  return r;
}

const TITLE_WORDS = /\b(engineer|developer|analyst|consultant|manager|lead|director|specialist|associate|intern|coordinator|officer|designer|scientist|architect|administrator|executive|head|vp|president|assistant|representative|accountant|advisor|adviser|founder|programmer|technician|buyer|planner|strategist|researcher|partner|supervisor|controller|auditor|recruiter|teacher|nurse)\b/i;
const DURATION = /\(\s*\d+\s+(years?|months?|yrs?|mos?)[^)]*\)/i;

/**
 * Lines that can be a job title or company: short, capitalised and not a
 * sentence. Wrapped bullet text ("records from reports, so...", "3 supplier",
 * "...by 25%.") fails these checks, so it can't turn into a fake role.
 */
function headerLike(l: string) {
  return (
    !bullet(l) &&
    !RANGE.test(l) &&
    l.length <= 90 &&
    /^[A-Z]/.test(l) &&
    !/[.;:,]$/.test(l) &&
    l.split(/\s+/).length <= 12 &&
    !/\d+%/.test(l)
  );
}

type Role = ResumeData["experience"][number];

/**
 * Each date range anchors one role. Its title/company come from the
 * header-like lines just above it (or just below it, for "dates first"
 * layouts); every other line is a highlight, with wrapped lines rejoined.
 */
function parseExperience(lines: string[], linkedIn: boolean): Role[] {
  const anchors = lines.map((l, i) => (RANGE.test(l) ? i : -1)).filter((i) => i >= 0);
  if (anchors.length === 0) return [];

  type Draft = { headers: string[]; start: number; end: number; range: RegExpMatchArray; inline: string };
  const drafts: Draft[] = anchors.map((a) => ({ headers: [], start: a + 1, end: lines.length, range: lines[a].match(RANGE)!, inline: "" }));
  const owned = new Set<number>(anchors);

  drafts.forEach((d, k) => {
    const a = anchors[k];
    const floor = k > 0 ? anchors[k - 1] + 1 : 0;
    // Text sharing the date line: a header, or a bullet the PDF merged onto it.
    const rest = lines[a].replace(RANGE, "").replace(DURATION, "").replace(/^[\s|,–—-]+|[\s|,–—-]+$/g, "").trim();
    if (rest && headerLike(rest)) d.headers.push(rest);
    else if (rest) d.inline = rest;
    // Up to two header lines directly above the dates.
    const above: string[] = [];
    for (let i = a - 1; i >= floor && above.length < 2 && headerLike(lines[i]) && !owned.has(i); i--) {
      above.unshift(lines[i]);
      owned.add(i);
    }
    d.headers.unshift(...above);
    // "Dates first" layouts put the title/company just below.
    const next = k + 1 < anchors.length ? anchors[k + 1] : lines.length;
    let i = a + 1;
    while (d.headers.length < 2 && i < next && headerLike(lines[i]) && !TITLE_LINE_IS_LOCATION(lines[i], d.headers)) {
      d.headers.push(lines[i]);
      owned.add(i++);
    }
    d.start = i;
  });
  drafts.forEach((d, k) => {
    // A role's body ends where the next role's headers begin.
    const nextAnchor = k + 1 < anchors.length ? anchors[k + 1] : lines.length;
    let end = nextAnchor;
    while (end > d.start && owned.has(end - 1)) end--;
    d.end = end;
  });

  return drafts.map((d, k) => {
    const { title, company } = pickTitleCompany(d.headers, linkedIn);
    const role: Role = { title, company, location: "", startDate: d.range[1], endDate: cap(d.range[2]), highlights: [] };
    const add = (text: string, isNew: boolean) => {
      const last = role.highlights[role.highlights.length - 1];
      // Rejoin wrapped lines: no bullet, and the previous line didn't finish a sentence.
      if (!isNew && last !== undefined && (!/[.!?]$/.test(last) || /^[a-z(]/.test(text))) role.highlights[role.highlights.length - 1] = `${last} ${text}`;
      else role.highlights.push(text);
    };
    for (let i = d.start; i < d.end; i++) {
      const l = lines[i];
      if (owned.has(i)) continue;
      // A short place line right under the dates is the role's location.
      if (!role.location && role.highlights.length === 0 && i === d.start && isLocation(l)) {
        role.location = l;
        continue;
      }
      add(stripBullet(l), bullet(l));
    }
    // Bullet text merged onto the next role's date line belongs to this role.
    const merged = drafts[k + 1]?.inline;
    if (merged) add(stripBullet(merged), bullet(merged));
    return role;
  });
}

const isLocation = (l: string) => l.length < 50 && /^[A-Z][\w .'-]+,\s*[A-Z][\w .'-]+(,\s*[A-Z][\w .'-]+)?$/.test(l) && !TITLE_WORDS.test(l);
// Don't take a location line as a second header ("Seattle, Washington").
const TITLE_LINE_IS_LOCATION = (l: string, headers: string[]) => headers.length > 0 && isLocation(l);

function pickTitleCompany(headers: string[], linkedIn: boolean): { title: string; company: string } {
  const parts = headers.length === 1 ? headers[0].split(/\s+\|\s+|\s+(?:at|@)\s+|\s+[–—-]\s+/).map((p) => p.trim()).filter(Boolean) : headers;
  if (parts.length === 0) return { title: "", company: "" };
  if (parts.length === 1) return TITLE_WORDS.test(parts[0]) ? { title: parts[0], company: "" } : { title: "", company: parts[0] };
  const ti = parts.findIndex((p) => TITLE_WORDS.test(p));
  if (ti >= 0) {
    // With a single "Title | Company | City" line, keep the remainder as company.
    const rest = parts.filter((_, j) => j !== ti);
    return { title: parts[ti], company: headers.length === 1 ? rest.join(" | ") : rest[0] };
  }
  // No title keyword: LinkedIn prints company first, most resumes title first.
  return linkedIn ? { title: parts[1], company: parts[0] } : { title: parts[0], company: parts[1] };
}

// --- Education -----------------------------------------------------------------

const SCHOOL_RE = /universit|college|school|institute|academy|polytechnic|iit\b|iim\b|nit\b/i;
const DEGREE_RE = /\b(b\.?\s?(?:s|a|sc|com|tech|e|ba)|m\.?\s?(?:s|a|sc|com|tech|e)|mba|bba|bca|mca|ph\.?\s?d|bachelor|master|associate degree|diploma|degree|certificate|post\s?graduate|pgd[a-z]*|hsc|ssc|high school)\b/i;
const SINGLE_DATE = new RegExp(`(${DATE})`, "i");

function datesOf(line: string): { start: string; end: string } | null {
  const range = line.match(RANGE);
  if (range) return { start: range[1], end: cap(range[2]) };
  const single = line.match(SINGLE_DATE);
  return single ? { start: "", end: single[1] } : null;
}

const withoutDates = (l: string) => l.replace(RANGE, "").replace(SINGLE_DATE, "").replace(/[\s|,–—-]+$/, "").trim();

/**
 * Pair each school line with its own degree line - whichever side it sits on -
 * and take dates from that pair only (never from the neighbouring entry).
 * Handles "Degree ⇥ dates / School, City" and "School / Degree, dates".
 */
function parseEducation(lines: string[]): ResumeData["education"] {
  const used = new Set<number>();
  const out: ResumeData["education"] = [];
  const isSchool = (l: string) => SCHOOL_RE.test(l) && !DEGREE_RE.test(withoutDates(l).split(",")[0]);
  lines.forEach((line, i) => {
    if (!isSchool(line) || used.has(i)) return;
    used.add(i);
    // Prefer the degree line directly above (if unclaimed), else directly below.
    const pick = [i - 1, i + 1].find((j) => j >= 0 && j < lines.length && !used.has(j) && !isSchool(lines[j]) && (DEGREE_RE.test(lines[j]) || datesOf(lines[j])));
    if (pick !== undefined) used.add(pick);
    const degreeLine = pick !== undefined ? lines[pick] : "";
    const dates = datesOf(line) ?? (degreeLine ? datesOf(degreeLine) : null);

    // "Manipal Academy of Higher Education, Bengaluru, India" -> school + place.
    const [school, ...place] = withoutDates(line).split(/\s*,\s*/);
    // "Post Graduate Diploma in Data Science" -> degree + field.
    const degreeText = withoutDates(degreeLine);
    const m = degreeText.match(/^(.+?)\s+in\s+(.+)$/i);
    out.push({
      school: school.trim(),
      degree: (m ? m[1] : degreeText).trim(),
      field: (m ? m[2] : "").trim(),
      startDate: dates?.start ?? "",
      endDate: dates?.end ?? "",
      details: place.join(", "),
    });
  });
  return out;
}

// --- Skills ----------------------------------------------------------------------

/** Split on commas/semicolons that are NOT inside parentheses. */
export function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(" || ch === "[") depth++;
    if ((ch === ")" || ch === "]") && depth > 0) depth--;
    if (depth === 0 && /[,;|•·]/.test(ch)) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  // One-letter skills ("C", "R") are real; only drop empty fragments.
  return out.map((x) => x.trim()).filter((x) => /[A-Za-z0-9]/.test(x));
}

/**
 * Keep the resume's own categories ("Spend Analytics & BI: Power BI (DAX, …)")
 * and its wording. Only when there's no skills section do we fall back to
 * skills detected in the text.
 */
function parseSkills(lines: string[], fullText: string): ResumeData["skills"] {
  const groups: ResumeData["skills"] = [];
  const loose: string[] = [];
  for (const raw of lines) {
    const line = stripBullet(raw);
    const m = line.match(/^([^:]{2,50}):\s*(.+)$/);
    if (m) {
      const skills = splitTopLevel(m[2]).filter((s) => s.length < 80);
      if (skills.length) groups.push({ category: m[1].trim(), skills });
    } else {
      loose.push(...splitTopLevel(line).filter((s) => s.length < 60));
    }
  }
  if (loose.length) groups.push(...groupSkills(loose));
  if (groups.length) return groups;
  return groupSkills(extractSkills(fullText).map((s) => s.name));
}

// --- Certifications ------------------------------------------------------------

/** "Name ⇥ date" lines, each optionally followed by an issuer line. */
function parseCertifications(lines: string[]): ResumeData["certifications"] {
  const out: ResumeData["certifications"] = [];
  for (const raw of lines) {
    const line = stripBullet(raw);
    const date = line.match(SINGLE_DATE)?.[1] ?? line.match(/(?:19|20)\d{2}/)?.[0] ?? "";
    const last = out[out.length - 1];
    // A dateless line right after a cert without an issuer is that cert's issuer.
    if (!date && last && !last.issuer) {
      last.issuer = line;
      continue;
    }
    const rest = withoutDates(line.replace(date, ""));
    const [name, issuer = ""] = rest.split(/\s+[|–—]\s+|\s+-\s+(?=[A-Z])/);
    out.push({ name: name.trim(), issuer: issuer.trim(), date });
  }
  return out.filter((c) => c.name);
}

const cap = (s: string) => (/present|current|now/i.test(s) ? "Present" : s);
