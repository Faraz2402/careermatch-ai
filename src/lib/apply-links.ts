// Where to apply. We can't pull listings from LinkedIn or Naukri (no public
// jobs API; their terms forbid scraping), so we deep-link to their own search
// pages instead, and label the listing's real apply link by platform.

const PLATFORMS: [RegExp, string][] = [
  [/myworkdayjobs\.com|myworkdaysite\.com|\.wd\d+\.myworkday/i, "Workday"],
  [/greenhouse\.io/i, "Greenhouse"],
  [/lever\.co/i, "Lever"],
  [/ashbyhq\.com/i, "Ashby"],
  [/smartrecruiters\.com/i, "SmartRecruiters"],
  [/icims\.com/i, "iCIMS"],
  [/taleo\.net/i, "Taleo"],
  [/successfactors\.|sapsf\./i, "SuccessFactors"],
  [/workable\.com/i, "Workable"],
  [/bamboohr\.com/i, "BambooHR"],
  [/linkedin\.com/i, "LinkedIn"],
  [/naukri\.com/i, "Naukri"],
  [/indeed\./i, "Indeed"],
  [/adzuna\./i, "Adzuna"],
  [/remotive\.com/i, "Remotive"],
  [/arbeitnow\.com/i, "Arbeitnow"],
  [/usajobs\.gov/i, "USAJOBS"],
];

/** "Workday", "Greenhouse", … or the site's domain for employer career pages. */
export function applyPlatform(url: string): string | null {
  if (!url) return null;
  for (const [re, name] of PLATFORMS) if (re.test(url)) return name;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const enc = encodeURIComponent;

export type ExternalLink = { label: string; href: string; hint: string };

/** Search the same role on LinkedIn, Naukri (India), Workday sites and the company's careers page. */
export function externalSearchLinks(job: { title: string; company: string; city?: string | null; country?: string | null; location?: string; source?: string }): ExternalLink[] {
  if (job.source === "demo") return []; // sample companies don't exist
  const company = job.company.replace(/\s*\(sample\)$/, "").trim();
  const title = job.title.replace(/\s*\((m\/w\/d|f\/m\/d|m\/f\/d|w\/m\/d)\)/gi, "").trim();
  const place = job.city ?? (job.country === "IN" ? "India" : "");
  const links: ExternalLink[] = [
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/jobs/search/?keywords=${enc(`${title} ${company}`)}${place ? `&location=${enc(place)}` : ""}`,
      hint: `Search "${title}" at ${company} on LinkedIn Jobs`,
    },
  ];
  if (job.country === "IN" || /india/i.test(job.location ?? "")) {
    const city = job.city ? `-in-${slug(job.city)}` : "";
    links.push({
      label: "Naukri",
      href: `https://www.naukri.com/${slug(title)}-jobs${city}?k=${enc(title)}${job.city ? `&l=${enc(job.city)}` : ""}`,
      hint: `Search "${title}" on Naukri.com`,
    });
  }
  links.push(
    {
      label: "Workday",
      href: `https://www.google.com/search?q=${enc(`site:myworkdayjobs.com "${company}" ${title}`)}`,
      hint: `Find ${company}'s Workday career site`,
    },
    {
      label: "Company careers",
      href: `https://www.google.com/search?q=${enc(`${company} careers ${title}`)}`,
      hint: `Find this role on ${company}'s own careers page`,
    },
  );
  return links;
}
