// Labels a job's apply link by the platform it's hosted on.

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
  [/careerjet\.|jobviewtrack\.com/i, "Careerjet"],
  [/jooble\.org/i, "Jooble"],
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
