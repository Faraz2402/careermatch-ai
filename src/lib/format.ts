export function formatSalary(j: { salaryMin: number | null; salaryMax: number | null; salaryCurrency: string | null; salaryPeriod: string | null }) {
  if (j.salaryMin == null && j.salaryMax == null) return null;
  const cur = j.salaryCurrency ?? "";
  const symbol = cur === "USD" ? "$" : cur === "EUR" ? "€" : cur === "GBP" ? "£" : "";
  const fmt = (n: number) =>
    j.salaryPeriod === "year" && n >= 1000 ? `${symbol}${Math.round(n / 1000)}k` : `${symbol}${n.toLocaleString("en-US")}`;
  const lo = j.salaryMin ?? j.salaryMax!;
  const hi = j.salaryMax ?? j.salaryMin!;
  const range = lo === hi ? fmt(lo) : `${fmt(lo)}–${fmt(hi)}`;
  const per = j.salaryPeriod === "hour" ? "/hr" : j.salaryPeriod === "month" ? "/mo" : j.salaryPeriod === "year" ? "/yr" : "";
  return `${range}${per}${symbol ? "" : cur ? ` ${cur}` : ""}`;
}

export function relativeDate(iso: string | Date | null) {
  if (!iso) return "Date not provided";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} mo ago`;
  return `${Math.floor(days / 365)} yr ago`;
}

export const STATUS_LABELS: Record<string, string> = {
  none: "Not tracked",
  interested: "Interested",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Closed",
};

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
