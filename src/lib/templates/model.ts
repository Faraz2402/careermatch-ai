// One document model for every template, used by the live preview, the PDF
// and the Word export so all three show the same content in the same order.
// Client-safe (no server imports).

import type { ResumeData } from "../resume/schema";
import type { CoverLetter } from "../tailor/types";
import type { Lang, PersonalField, TemplateDef } from "./catalog";

export type Personal = Partial<Record<PersonalField, string>>;

export type Entry = { title: string; sub: string; dates: string; location: string; bullets: string[]; text: string };
export type SectionKey = "summary" | "skills" | "experience" | "projects" | "education" | "certifications" | "personal" | "languages";
export type DocSection = { key: SectionKey; heading: string; text?: string; items?: string[]; groups?: { label: string; items: string[] }[]; entries?: Entry[]; pairs?: [string, string][] };
export type DocModel = { name: string; headline: string; contact: string[]; sections: DocSection[]; template: TemplateDef; lang: Lang };

type Labels = Record<SectionKey | "present" | "profile" | "photo" | "dear" | "nationality" | "visaStatus" | "noticePeriod" | "dateOfBirth" | "maritalStatus" | "drivingLicence" | "references", string>;

const EN: Labels = { summary: "Summary", skills: "Skills", experience: "Experience", projects: "Projects", education: "Education", certifications: "Certifications", personal: "Personal details", languages: "Languages", present: "Present", profile: "Profile", photo: "Photo", dear: "Dear", nationality: "Nationality", visaStatus: "Visa / work status", noticePeriod: "Notice period", dateOfBirth: "Date of birth", maritalStatus: "Marital status", drivingLicence: "Driving licence", references: "References" };

const L: Record<Lang, Partial<Labels>> = {
  en: {},
  de: { summary: "Profil", skills: "Kenntnisse", experience: "Berufserfahrung", projects: "Projekte", education: "Ausbildung", certifications: "Zertifikate", personal: "Persönliche Daten", languages: "Sprachen", present: "heute", nationality: "Staatsangehörigkeit", visaStatus: "Aufenthaltsstatus", noticePeriod: "Kündigungsfrist", dateOfBirth: "Geburtsdatum", maritalStatus: "Familienstand", drivingLicence: "Führerschein", references: "Referenzen" },
  fr: { summary: "Profil", skills: "Compétences", experience: "Expérience professionnelle", projects: "Projets", education: "Formation", certifications: "Certifications", personal: "Informations personnelles", languages: "Langues", present: "présent", nationality: "Nationalité", visaStatus: "Autorisation de travail", noticePeriod: "Préavis", dateOfBirth: "Date de naissance", maritalStatus: "Situation familiale", drivingLicence: "Permis de conduire", references: "Références" },
  es: { summary: "Perfil", skills: "Habilidades", experience: "Experiencia profesional", projects: "Proyectos", education: "Formación", certifications: "Certificaciones", personal: "Datos personales", languages: "Idiomas", present: "actualidad", nationality: "Nacionalidad", visaStatus: "Permiso de trabajo", noticePeriod: "Preaviso", dateOfBirth: "Fecha de nacimiento", maritalStatus: "Estado civil", drivingLicence: "Carné de conducir", references: "Referencias" },
  pt: { summary: "Perfil", skills: "Competências", experience: "Experiência profissional", projects: "Projetos", education: "Formação", certifications: "Certificações", personal: "Dados pessoais", languages: "Idiomas", present: "atual", nationality: "Nacionalidade", visaStatus: "Autorização de trabalho", noticePeriod: "Aviso prévio", dateOfBirth: "Data de nascimento", maritalStatus: "Estado civil", drivingLicence: "Carta de condução", references: "Referências" },
  it: { summary: "Profilo", skills: "Competenze", experience: "Esperienza professionale", projects: "Progetti", education: "Istruzione e formazione", certifications: "Certificazioni", personal: "Dati personali", languages: "Lingue", present: "presente", nationality: "Nazionalità", visaStatus: "Permesso di lavoro", noticePeriod: "Preavviso", dateOfBirth: "Data di nascita", maritalStatus: "Stato civile", drivingLicence: "Patente", references: "Referenze" },
  nl: { summary: "Profiel", skills: "Vaardigheden", experience: "Werkervaring", projects: "Projecten", education: "Opleiding", certifications: "Certificaten", personal: "Persoonlijke gegevens", languages: "Talen", present: "heden", nationality: "Nationaliteit", visaStatus: "Werkvergunning", noticePeriod: "Opzegtermijn", dateOfBirth: "Geboortedatum", maritalStatus: "Burgerlijke staat", drivingLicence: "Rijbewijs", references: "Referenties" },
  sv: { summary: "Profil", skills: "Kompetenser", experience: "Arbetslivserfarenhet", projects: "Projekt", education: "Utbildning", certifications: "Certifieringar", personal: "Personuppgifter", languages: "Språk", present: "nu", nationality: "Medborgarskap", visaStatus: "Arbetstillstånd", noticePeriod: "Uppsägningstid", dateOfBirth: "Födelsedatum", maritalStatus: "Civilstånd", drivingLicence: "Körkort", references: "Referenser" },
  pl: { summary: "Profil", skills: "Umiejętności", experience: "Doświadczenie zawodowe", projects: "Projekty", education: "Wykształcenie", certifications: "Certyfikaty", personal: "Dane osobowe", languages: "Języki", present: "obecnie", nationality: "Obywatelstwo", visaStatus: "Pozwolenie na pracę", noticePeriod: "Okres wypowiedzenia", dateOfBirth: "Data urodzenia", maritalStatus: "Stan cywilny", drivingLicence: "Prawo jazdy", references: "Referencje" },
  tr: { summary: "Profil", skills: "Yetkinlikler", experience: "İş deneyimi", projects: "Projeler", education: "Eğitim", certifications: "Sertifikalar", personal: "Kişisel bilgiler", languages: "Diller", present: "günümüz", nationality: "Uyruk", visaStatus: "Çalışma izni", noticePeriod: "İhbar süresi", dateOfBirth: "Doğum tarihi", maritalStatus: "Medeni durum", drivingLicence: "Ehliyet", references: "Referanslar" },
  ja: { summary: "自己PR", skills: "スキル", experience: "職歴", projects: "プロジェクト", education: "学歴", certifications: "免許・資格", personal: "個人情報", languages: "語学", present: "現在", photo: "写真", nationality: "国籍", dateOfBirth: "生年月日", references: "推薦者" },
  ko: { summary: "자기소개", skills: "보유 기술", experience: "경력 사항", projects: "프로젝트", education: "학력 사항", certifications: "자격증", personal: "인적 사항", languages: "외국어", present: "현재", photo: "사진", nationality: "국적", dateOfBirth: "생년월일" },
  zh: { summary: "个人简介", skills: "专业技能", experience: "工作经历", projects: "项目经历", education: "教育背景", certifications: "证书", personal: "个人信息", languages: "语言能力", present: "至今", photo: "照片", nationality: "国籍", dateOfBirth: "出生日期" },
};

/** Scripts the PDF standard fonts can't draw; those PDFs use English headings. */
export const NON_LATIN: Lang[] = ["ja", "ko", "zh"];

export const labelsFor = (lang: Lang, opts: { pdf?: boolean } = {}): Labels => ({ ...EN, ...(opts.pdf && NON_LATIN.includes(lang) ? {} : L[lang]) });

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Re-write a résumé date ("Jan 2021", "01/2021", "2021", "Present") in the template's format. */
export function formatDate(raw: string, t: Pick<TemplateDef, "dates">, labels: Pick<Labels, "present">): string {
  const s = raw.trim();
  if (!s) return "";
  if (/^(present|current|now|till date|to date|ongoing)$/i.test(s)) return labels.present;
  const year = s.match(/(19|20)\d{2}/)?.[0];
  if (!year) return s;
  const word = MONTHS.findIndex((m) => s.toLowerCase().includes(m));
  const num = s.match(/\b(0?[1-9]|1[0-2])\s*[/.-]\s*(19|20)\d{2}\b/)?.[1];
  const month = word >= 0 ? word + 1 : num ? Number(num) : 0;
  if (!month) return year;
  const mm = String(month).padStart(2, "0");
  if (t.dates === "MM/YYYY") return `${mm}/${year}`;
  if (t.dates === "YYYY.MM") return `${year}.${mm}`;
  return `${MONTHS[month - 1].charAt(0).toUpperCase()}${MONTHS[month - 1].slice(1)} ${year}`;
}

const range = (a: string, b: string, t: TemplateDef, labels: Labels) => [formatDate(a, t, labels), formatDate(b, t, labels)].filter(Boolean).join(" – ");

export function contactLine(r: Pick<ResumeData, "email" | "phone" | "location" | "links">) {
  return [r.email, r.phone, r.location, ...r.links.map((l) => l.url.replace(/^https?:\/\//, ""))].filter(Boolean);
}

/** Editor design choices, kept within safe, ATS-friendly limits. */
export type Design = { font?: "sans" | "serif"; density?: "airy" | "standard" | "compact"; accent?: string; order?: SectionKey[] };
export const ACCENTS = ["#4338ca", "#0369a1", "#0f766e", "#15803d", "#b45309", "#b91c1c", "#be185d", "#7c3aed", "#1f2937"];

/** The template with the user's design choices applied. */
export function styledTemplate(t: TemplateDef, d: Design = {}): TemplateDef {
  const accent = d.accent && ACCENTS.includes(d.accent) ? d.accent : t.style.accent;
  return { ...t, style: { ...t.style, ...(d.font && { font: d.font }), ...(d.density && { density: d.density }), accent } };
}

/** Build the document a template renders. `pdf` switches non-Latin headings to English. */
export function buildDoc(resume: ResumeData, template: TemplateDef, personal: Personal = {}, opts: { pdf?: boolean; order?: SectionKey[] } = {}): DocModel {
  const labels = labelsFor(template.lang, opts);
  const sections: DocSection[] = [];
  const add = (s: DocSection | null) => s && sections.push(s);

  const summary = resume.summary ? { key: "summary" as const, heading: template.layout === "academic" ? labels.profile : labels.summary, text: resume.summary } : null;
  const skills = resume.skills.some((g) => g.skills.length) ? { key: "skills" as const, heading: labels.skills, groups: resume.skills.filter((g) => g.skills.length).map((g) => ({ label: g.category, items: g.skills })) } : null;
  const experience = resume.experience.length
    ? {
        key: "experience" as const,
        heading: labels.experience,
        entries: resume.experience.map((e) => ({ title: e.title, sub: e.company, dates: range(e.startDate, e.endDate, template, labels), location: e.location, bullets: e.highlights.filter(Boolean), text: "" })),
      }
    : null;
  const projects = resume.projects.length ? { key: "projects" as const, heading: labels.projects, entries: resume.projects.map((p) => ({ title: p.name, sub: p.technologies.join(", "), dates: "", location: "", bullets: [], text: p.description })) } : null;
  const education = resume.education.length
    ? { key: "education" as const, heading: labels.education, entries: resume.education.map((e) => ({ title: [e.degree, e.field].filter(Boolean).join(", "), sub: e.school, dates: range(e.startDate, e.endDate, template, labels), location: "", bullets: [], text: e.details })) }
    : null;
  const certifications = resume.certifications.length ? { key: "certifications" as const, heading: labels.certifications, items: resume.certifications.map((c) => [c.name, c.issuer, c.date].filter(Boolean).join(", ")) } : null;
  // Only fields this market uses AND the user chose to fill in.
  const pairs = template.personal.filter((f) => f !== "languages" && personal[f]?.trim()).map((f) => [labels[f], personal[f]!.trim()] as [string, string]);
  const personalSection = pairs.length ? { key: "personal" as const, heading: labels.personal, pairs } : null;
  const languages = template.personal.includes("languages") && personal.languages?.trim() ? { key: "languages" as const, heading: labels.languages, text: personal.languages.trim() } : null;

  const order =
    template.layout === "academic"
      ? [summary, education, experience, projects, certifications, skills, languages, personalSection]
      : template.layout === "form"
        ? [personalSection, education, experience, certifications, skills, languages, summary]
        : template.layout === "tabular"
          ? [personalSection, summary, experience, education, skills, certifications, languages, projects]
          : [summary, skills, experience, projects, education, certifications, languages, personalSection];
  order.forEach(add);
  // A user-chosen section order (forms keep their fixed structure).
  if (opts.order?.length && template.layout !== "form") sections.sort((a, b) => (opts.order!.indexOf(a.key) + 1 || 99) - (opts.order!.indexOf(b.key) + 1 || 99));
  return { name: resume.name || "Your Name", headline: resume.headline, contact: contactLine(resume), sections, template, lang: template.lang };
}

/** The cover letter as plain blocks, in the same header style as the résumé. */
export function letterBlocks(letter: CoverLetter, locale = "en-GB") {
  return {
    date: new Date().toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" }),
    subject: letter.subject,
    greeting: letter.greeting,
    paragraphs: letter.paragraphs.filter((p) => p.trim()),
    closing: letter.closing,
    signature: letter.signature,
  };
}

/** Sample person (clearly fictional) for template previews in the library. */
export const SAMPLE_RESUME: ResumeData = {
  name: "Ananya Sharma",
  headline: "Procurement & Business Analyst",
  location: "Bengaluru, India",
  email: "ananya.sharma@example.com",
  phone: "+91 98765 43210",
  summary: "Procurement and business analyst with six years of experience in strategic sourcing, spend analytics and Procure-to-Pay process improvement across manufacturing and technology.",
  experience: [
    { title: "Senior Procurement Analyst", company: "Northwind Components", location: "Bengaluru", startDate: "Apr 2022", endDate: "Present", highlights: ["Led spend analysis across 14 indirect categories and built Power BI dashboards used by the CPO's leadership team", "Ran RFQ events for packaging and logistics, consolidating 60 suppliers to 22", "Redesigned the P2P exception workflow with finance, cutting invoice holds by 31%"] },
    { title: "Business Analyst", company: "Contoso Retail", location: "Pune", startDate: "Jul 2019", endDate: "Mar 2022", highlights: ["Gathered requirements for an SAP Ariba rollout across three business units", "Automated weekly supplier KPI reporting with Excel and SQL, saving 6 hours a week"] },
  ],
  education: [{ school: "Symbiosis Institute of Business Management", degree: "MBA", field: "Operations", startDate: "2017", endDate: "2019", details: "" }],
  skills: [
    { category: "Procurement", skills: ["Strategic sourcing", "Category management", "Contract management"] },
    { category: "Tools", skills: ["SAP Ariba", "Power BI", "Advanced Excel", "SQL"] },
  ],
  certifications: [{ name: "CIPS Level 4 Diploma", issuer: "CIPS", date: "2023" }],
  projects: [],
  links: [{ label: "LinkedIn", url: "https://linkedin.com/in/ananya-sharma-sample" }],
};

export const SAMPLE_PERSONAL: Personal = { nationality: "Indian", noticePeriod: "30 days", languages: "English, Hindi, Kannada", visaStatus: "Indian citizen", drivingLicence: "Category B", references: "Available on request" };
