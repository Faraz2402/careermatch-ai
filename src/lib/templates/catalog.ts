// Country / market résumé template library. Every template is an original
// CareerMatch layout built from the region's documented conventions (e.g.
// Europass, the German Federal Employment Agency's Lebenslauf guidance, Canada
// Job Bank, Careers NZ) — not a copy of any commercial template. Conventions
// are editable defaults: the job advert and employer instructions come first.

export type Layout = "ats" | "tabular" | "sidebar" | "banner" | "form" | "academic" | "federal";
export type Lang = "en" | "de" | "fr" | "es" | "pt" | "it" | "nl" | "sv" | "pl" | "tr" | "ja" | "ko" | "zh";
export type PersonalField = "nationality" | "visaStatus" | "noticePeriod" | "dateOfBirth" | "maritalStatus" | "languages" | "drivingLicence" | "references";

export type TemplateDef = {
  id: string;
  name: string;
  /** Market label shown in filters, e.g. "India", "Gulf (UAE)". */
  market: string;
  region: "Asia" | "Europe" | "North America" | "Oceania" | "Middle East" | "Africa" | "Latin America" | "Global";
  mode: "ats" | "visual";
  tier: "free" | "pro";
  layout: Layout;
  paper: "A4" | "Letter";
  /** How dates are written: "MMM YYYY", "MM/YYYY" or "YYYY.MM". */
  dates: "MMM YYYY" | "MM/YYYY" | "YYYY.MM";
  lang: Lang;
  photo: "omit" | "optional" | "expected";
  /** Optional personal fields this market sometimes uses — never required. */
  personal: PersonalField[];
  pages: string;
  levels: ("Entry" | "Mid" | "Senior" | "Executive" | "Academic")[];
  industries: string[];
  /** Short convention notes shown in the library. */
  notes: string;
  style: { font: "sans" | "serif"; accent: string; align: "left" | "center"; density: "airy" | "standard" | "compact" };
};

const ALL_LEVELS: TemplateDef["levels"] = ["Entry", "Mid", "Senior", "Executive"];
const ANY = ["Any industry"];

type Seed = Partial<TemplateDef> & Pick<TemplateDef, "id" | "name" | "market" | "region" | "notes">;

const base: Omit<TemplateDef, "id" | "name" | "market" | "region" | "notes"> = {
  mode: "ats",
  tier: "pro",
  layout: "ats",
  paper: "A4",
  dates: "MMM YYYY",
  lang: "en",
  photo: "omit",
  personal: [],
  pages: "1–2",
  levels: ALL_LEVELS,
  industries: ANY,
  style: { font: "sans", accent: "#1f2937", align: "left", density: "standard" },
};

// Columns, header bands and forms (tables) can confuse ATS parsers, so those layouts are always "Visual".
const T = (s: Seed): TemplateDef => ({ ...base, ...s, mode: s.layout === "sidebar" || s.layout === "banner" || s.layout === "form" ? "visual" : (s.mode ?? base.mode), style: { ...base.style, ...s.style } });

export const TEMPLATES: TemplateDef[] = [
  // --- Global ---------------------------------------------------------------
  T({ id: "intl-ats", name: "International ATS Résumé", market: "Global", region: "Global", tier: "free", notes: "Photo-free, privacy-first, single column, neutral English. Safe default for job portals anywhere.", style: { font: "sans", accent: "#4338ca", align: "left", density: "standard" } }),
  T({ id: "europass", name: "Europass-style CV", market: "European Union", region: "Europe", layout: "tabular", personal: ["nationality", "languages", "drivingLicence"], pages: "2–3", notes: "Follows the EU Europass structure (labelled left column). Use when a vacancy asks for Europass; not universally preferred.", style: { font: "sans", accent: "#1d4ed8", align: "left", density: "standard" } }),
  T({ id: "global-sidebar", name: "Creative Sidebar (Visual)", market: "Global", region: "Global", mode: "visual", layout: "sidebar", notes: "Two-column design for sharing directly with recruiters or creative roles. Some ATS parsers misread columns — use the ATS-first export for portals.", style: { font: "sans", accent: "#7c3aed", align: "left", density: "standard" } }),
  T({ id: "global-executive", name: "Executive Banner (Visual)", market: "Global", region: "Global", mode: "visual", layout: "banner", levels: ["Senior", "Executive"], pages: "2", notes: "Bold header band and generous spacing for senior profiles shared directly.", style: { font: "serif", accent: "#0f766e", align: "left", density: "airy" } }),
  // --- India ----------------------------------------------------------------
  T({ id: "in-corporate-ats", name: "Indian Corporate ATS", market: "India", region: "Asia", tier: "free", personal: ["noticePeriod", "languages"], notes: "1–2 pages, no photo for MNC / ATS applications, notice period optional. The default for Naukri, LinkedIn and company portals.", style: { font: "sans", accent: "#0369a1", align: "left", density: "standard" } }),
  T({ id: "in-experienced", name: "Indian Experienced Professional", market: "India", region: "Asia", pages: "1–3", levels: ["Mid", "Senior", "Executive"], personal: ["noticePeriod", "languages"], notes: "Longer format where experience warrants, key achievements up front.", style: { font: "serif", accent: "#9a3412", align: "center", density: "standard" } }),
  T({ id: "in-modern-visual", name: "Indian Modern (Visual)", market: "India", region: "Asia", mode: "visual", layout: "sidebar", personal: ["noticePeriod", "languages"], notes: "Colour sidebar for sharing directly with recruiters and consultancies.", style: { font: "sans", accent: "#ea580c", align: "left", density: "standard" } }),
  T({ id: "in-biodata", name: "Government / PSU Biodata", market: "India", region: "Asia", layout: "form", photo: "optional", personal: ["dateOfBirth", "nationality", "languages", "maritalStatus"], notes: "Only where a government, PSU or the employer explicitly asks for a biodata. Personal fields are optional — include only what's requested.", style: { font: "serif", accent: "#111827", align: "center", density: "standard" } }),
  T({ id: "in-academic", name: "Indian Academic CV", market: "India", region: "Asia", layout: "academic", levels: ["Academic"], pages: "2+", industries: ["Academia", "Research"], notes: "Education and research first, for universities and research institutes.", style: { font: "serif", accent: "#1e3a8a", align: "center", density: "standard" } }),
  // --- North America --------------------------------------------------------
  T({ id: "us-corporate", name: "US Corporate Résumé", market: "United States", region: "North America", tier: "free", paper: "Letter", notes: "1–2 pages, no photo, no age or marital status. Achievement-led bullets.", style: { font: "sans", accent: "#111827", align: "left", density: "standard" } }),
  T({ id: "us-federal", name: "US Federal Résumé", market: "United States", region: "North America", layout: "federal", paper: "Letter", dates: "MM/YYYY", pages: "2–5", personal: ["references"], notes: "Detailed format for USAJOBS-style vacancies. Follow the vacancy's instructions (hours per week, supervisor, salary) exactly.", style: { font: "serif", accent: "#1e3a8a", align: "left", density: "standard" } }),
  T({ id: "us-academic", name: "US Academic CV", market: "United States", region: "North America", layout: "academic", paper: "Letter", levels: ["Academic"], pages: "2+", industries: ["Academia", "Research"], notes: "Full academic record; length is expected.", style: { font: "serif", accent: "#7f1d1d", align: "center", density: "standard" } }),
  T({ id: "ca-ats", name: "Canadian ATS Résumé", market: "Canada", region: "North America", tier: "free", paper: "Letter", notes: "1–2 pages, no photo or sensitive personal details (Canada Job Bank guidance).", style: { font: "sans", accent: "#b91c1c", align: "left", density: "standard" } }),
  T({ id: "ca-academic", name: "Canadian Academic CV", market: "Canada", region: "North America", layout: "academic", paper: "Letter", levels: ["Academic"], pages: "2+", industries: ["Academia", "Research"], notes: "Academic record first.", style: { font: "serif", accent: "#b91c1c", align: "center", density: "standard" } }),
  T({ id: "mx-cv", name: "Mexican CV", market: "Mexico", region: "Latin America", lang: "es", photo: "optional", notes: "Spanish, concise; photo optional and employer-dependent. Avoid sensitive personal data unless asked.", style: { font: "sans", accent: "#166534", align: "left", density: "standard" } }),
  // --- UK & Ireland ---------------------------------------------------------
  T({ id: "uk-cv", name: "UK Professional CV", market: "United Kingdom", region: "Europe", tier: "free", pages: "Up to 2", notes: "Typically up to 2 pages, no photo, no date of birth.", style: { font: "sans", accent: "#1e40af", align: "left", density: "standard" } }),
  T({ id: "uk-academic", name: "UK Academic CV", market: "United Kingdom", region: "Europe", layout: "academic", levels: ["Academic"], pages: "2+", industries: ["Academia", "Research"], notes: "Research, teaching and publications sections.", style: { font: "serif", accent: "#1e40af", align: "center", density: "standard" } }),
  T({ id: "ie-cv", name: "Irish Professional CV", market: "Ireland", region: "Europe", notes: "1–2 pages, no photo by default.", style: { font: "sans", accent: "#15803d", align: "left", density: "standard" } }),
  T({ id: "ie-academic", name: "Irish Academic CV", market: "Ireland", region: "Europe", layout: "academic", levels: ["Academic"], pages: "2+", industries: ["Academia", "Research"], notes: "Academic record first.", style: { font: "serif", accent: "#15803d", align: "center", density: "standard" } }),
  // --- Oceania --------------------------------------------------------------
  T({ id: "au-professional", name: "Australian Professional Résumé", market: "Australia", region: "Oceania", tier: "free", pages: "2–3", personal: ["references"], notes: "Often 2–3 pages for experienced applicants, no photo; referees on request.", style: { font: "sans", accent: "#0e7490", align: "left", density: "standard" } }),
  T({ id: "au-selection", name: "Selection Criteria Application", market: "Australia", region: "Oceania", layout: "federal", pages: "2+", industries: ["Government", "Public sector"], notes: "For Australian government roles that ask you to address selection criteria. Follow the agency's word limits.", style: { font: "serif", accent: "#0e7490", align: "left", density: "standard" } }),
  T({ id: "nz-cv", name: "NZ Professional CV", market: "New Zealand", region: "Oceania", personal: ["references"], notes: "Achievement-led, no photo or age; referees optional or on request (Careers NZ guidance).", style: { font: "sans", accent: "#0f172a", align: "left", density: "standard" } }),
  // --- Europe ---------------------------------------------------------------
  T({ id: "de-lebenslauf", name: "German Lebenslauf", market: "Germany", region: "Europe", layout: "tabular", lang: "de", dates: "MM/YYYY", photo: "optional", personal: ["nationality", "languages", "drivingLicence"], notes: "Tabular reverse chronology, 1–2 pages (Bundesagentur für Arbeit guidance). Photo optional, not mandatory; keep personal details restrained.", style: { font: "sans", accent: "#374151", align: "left", density: "standard" } }),
  T({ id: "at-lebenslauf", name: "Austrian Lebenslauf", market: "Austria", region: "Europe", layout: "tabular", lang: "de", dates: "MM/YYYY", photo: "optional", personal: ["nationality", "languages"], notes: "Tabular and concise; photo traditional but optional. Follow employer instructions.", style: { font: "sans", accent: "#b91c1c", align: "left", density: "standard" } }),
  T({ id: "ch-cv", name: "Swiss CV", market: "Switzerland", region: "Europe", layout: "tabular", lang: "de", dates: "MM/YYYY", photo: "optional", personal: ["nationality", "languages", "visaStatus"], notes: "Structured and factual; language adapted to canton and job (German shown — switch language in Design).", style: { font: "sans", accent: "#dc2626", align: "left", density: "standard" } }),
  T({ id: "fr-cv", name: "French CV", market: "France", region: "Europe", lang: "fr", photo: "optional", pages: "1", personal: ["languages"], notes: "Usually one page, French when required; photo optional, not a default requirement.", style: { font: "sans", accent: "#1d4ed8", align: "left", density: "compact" } }),
  T({ id: "nl-cv", name: "Dutch CV", market: "Netherlands", region: "Europe", lang: "nl", layout: "tabular", photo: "optional", personal: ["languages"], notes: "Concise reverse chronology; photo optional; no sensitive personal data by default.", style: { font: "sans", accent: "#ea580c", align: "left", density: "standard" } }),
  T({ id: "be-cv", name: "Belgian CV", market: "Belgium", region: "Europe", lang: "fr", photo: "optional", personal: ["languages"], notes: "Language adapted to region and job (Dutch, French or German); photo only if requested.", style: { font: "sans", accent: "#b45309", align: "left", density: "standard" } }),
  T({ id: "es-cv", name: "Spanish CV", market: "Spain", region: "Europe", lang: "es", photo: "optional", personal: ["languages"], notes: "Spanish-language option, concise reverse chronology; photo optional.", style: { font: "sans", accent: "#b91c1c", align: "left", density: "standard" } }),
  T({ id: "it-cv", name: "Italian CV", market: "Italy", region: "Europe", lang: "it", layout: "tabular", photo: "optional", personal: ["languages"], notes: "Italian where needed; Europass accepted in some contexts but not universally preferred.", style: { font: "sans", accent: "#15803d", align: "left", density: "standard" } }),
  T({ id: "pt-cv", name: "Portuguese CV", market: "Portugal", region: "Europe", lang: "pt", personal: ["languages"], notes: "Portuguese, concise, reverse chronological.", style: { font: "sans", accent: "#166534", align: "left", density: "standard" } }),
  T({ id: "nordic-ats", name: "Nordic ATS CV", market: "Nordics (SE, NO, DK, FI)", region: "Europe", lang: "sv", personal: ["languages"], notes: "Clean and concise, no photo by default; local language when requested (Swedish shown).", style: { font: "sans", accent: "#0369a1", align: "left", density: "airy" } }),
  T({ id: "pl-cv", name: "Polish CV", market: "Poland", region: "Europe", lang: "pl", photo: "optional", personal: ["languages"], notes: "Polish-language option; photo only if requested or customary for the employer. Polish employers often require a data-processing consent clause — add it if asked.", style: { font: "sans", accent: "#b91c1c", align: "left", density: "standard" } }),
  T({ id: "tr-cv", name: "Turkish CV", market: "Turkey", region: "Europe", lang: "tr", photo: "optional", personal: ["languages"], notes: "Turkish or English; photo sometimes customary but not universal.", style: { font: "sans", accent: "#dc2626", align: "left", density: "standard" } }),
  // --- Asia -----------------------------------------------------------------
  T({ id: "jp-rirekisho", name: "Japanese Rirekisho (履歴書)", market: "Japan", region: "Asia", layout: "form", lang: "ja", dates: "YYYY.MM", photo: "expected", personal: ["dateOfBirth", "nationality"], notes: "Standardised form in Japanese; a photo is commonly expected. Pair it with a Shokumu-keirekisho.", style: { font: "serif", accent: "#111827", align: "center", density: "compact" } }),
  T({ id: "jp-shokumu", name: "Japanese Shokumu-keirekisho (職務経歴書)", market: "Japan", region: "Asia", layout: "tabular", lang: "ja", dates: "YYYY.MM", notes: "Detailed work-history and skills document — a separate document from the Rirekisho.", style: { font: "serif", accent: "#111827", align: "left", density: "standard" } }),
  T({ id: "kr-iryeokseo", name: "Korean Iryeokseo (이력서)", market: "South Korea", region: "Asia", layout: "form", lang: "ko", dates: "YYYY.MM", photo: "optional", notes: "Structured career history; photo and personal fields only where locally requested.", style: { font: "sans", accent: "#1e3a8a", align: "center", density: "compact" } }),
  T({ id: "cn-resume", name: "Mainland China Résumé (简历)", market: "China", region: "Asia", lang: "zh", layout: "tabular", dates: "YYYY.MM", photo: "optional", notes: "Chinese-language option; photo and personal fields vary by employer and sector.", style: { font: "sans", accent: "#b91c1c", align: "left", density: "standard" } }),
  T({ id: "hk-cv", name: "Hong Kong Professional CV", market: "Hong Kong", region: "Asia", photo: "optional", personal: ["noticePeriod", "languages"], notes: "English or Chinese; concise; photo generally optional.", style: { font: "sans", accent: "#be123c", align: "left", density: "standard" } }),
  T({ id: "sg-professional", name: "Singapore Professional Résumé", market: "Singapore", region: "Asia", tier: "free", personal: ["visaStatus", "noticePeriod"], notes: "1–2 pages, English, no photo for multinationals; work-authorisation details only when relevant.", style: { font: "sans", accent: "#dc2626", align: "left", density: "standard" } }),
  T({ id: "my-professional", name: "Malaysian Professional Résumé", market: "Malaysia", region: "Asia", photo: "optional", personal: ["noticePeriod", "languages"], notes: "English or Malay as appropriate; photo optional and employer-dependent.", style: { font: "sans", accent: "#1d4ed8", align: "left", density: "standard" } }),
  // --- Middle East ----------------------------------------------------------
  T({ id: "ae-gulf", name: "UAE / Gulf Professional CV", market: "UAE", region: "Middle East", tier: "free", photo: "optional", personal: ["nationality", "visaStatus", "noticePeriod", "drivingLicence"], notes: "Often includes nationality, visa status and notice period; photo optional. Share personal details selectively.", style: { font: "sans", accent: "#047857", align: "left", density: "standard" } }),
  T({ id: "sa-gulf", name: "Saudi / Gulf CV", market: "Saudi Arabia", region: "Middle East", photo: "optional", personal: ["nationality", "visaStatus", "noticePeriod"], notes: "English or Arabic; work authorisation and relocation details where relevant; photo only if requested.", style: { font: "serif", accent: "#166534", align: "center", density: "standard" } }),
  T({ id: "gcc-regional", name: "Gulf Regional CV (QA, KW, BH, OM)", market: "Qatar · Kuwait · Bahrain · Oman", region: "Middle East", photo: "optional", personal: ["nationality", "visaStatus", "noticePeriod"], notes: "Visa / work-authorisation and availability fields configurable; photo optional by employer.", style: { font: "sans", accent: "#7c2d12", align: "left", density: "standard" } }),
  T({ id: "gulf-visual", name: "Gulf Executive (Visual)", market: "UAE", region: "Middle East", mode: "visual", layout: "banner", photo: "optional", personal: ["nationality", "visaStatus", "noticePeriod"], levels: ["Senior", "Executive"], notes: "Header band design for senior roles shared directly with recruiters.", style: { font: "serif", accent: "#a16207", align: "left", density: "airy" } }),
  T({ id: "il-resume", name: "Israeli Résumé", market: "Israel", region: "Middle East", pages: "1–2", notes: "Concise, no photo by default; Hebrew or English depending on the role (English shown).", style: { font: "sans", accent: "#1d4ed8", align: "left", density: "compact" } }),
  // --- Africa ---------------------------------------------------------------
  T({ id: "za-cv", name: "South African Professional CV", market: "South Africa", region: "Africa", personal: ["references"], notes: "Achievement-led, no photo by default; references only where requested.", style: { font: "sans", accent: "#15803d", align: "left", density: "standard" } }),
  T({ id: "wa-cv", name: "West & East African Professional CV", market: "Nigeria · Kenya · Ghana", region: "Africa", personal: ["references"], notes: "English, concise reverse chronology; photo not a default requirement; employer instructions first.", style: { font: "sans", accent: "#b45309", align: "left", density: "standard" } }),
  // --- Latin America --------------------------------------------------------
  T({ id: "br-curriculo", name: "Brazilian Currículo", market: "Brazil", region: "Latin America", lang: "pt", photo: "optional", personal: ["languages"], notes: "Portuguese, concise; photo and personal data vary by sector — never required here.", style: { font: "sans", accent: "#15803d", align: "left", density: "standard" } }),
  T({ id: "latam-cv", name: "Latin American CV", market: "Argentina · Chile · Colombia", region: "Latin America", lang: "es", photo: "optional", personal: ["languages"], notes: "Spanish; country-specific personal-data settings; photo optional, not mandatory.", style: { font: "sans", accent: "#0369a1", align: "left", density: "standard" } }),
];

export const FREE_TEMPLATE_IDS = TEMPLATES.filter((t) => t.tier === "free").map((t) => t.id);
export const DEFAULT_TEMPLATE_ID = "in-corporate-ats";

export const templateById = (id: string | null | undefined) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID)!;

/** Countries / markets for the library filter, in catalogue order. */
export const MARKETS = [...new Set(TEMPLATES.map((t) => t.market))];

/** Personal fields that are sensitive in privacy-first markets (warned about on export). */
export const SENSITIVE_FIELDS: PersonalField[] = ["dateOfBirth", "maritalStatus"];
