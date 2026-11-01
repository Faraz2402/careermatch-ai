const lakh = (n: number) => String(Math.round(n / 10_000) / 10);

/** One amount: "₹18 LPA", "₹1.5L/mo", "$120k/yr", "€4,000/mo". */
export function formatMoney(n: number, currency: string, period: "year" | "month") {
  if (currency === "INR") return period === "year" ? `₹${lakh(n)} LPA` : n >= 100_000 ? `₹${lakh(n)}L/mo` : `₹${n.toLocaleString("en-IN")}/mo`;
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "";
  const amount = period === "year" && n >= 1000 ? `${Math.round(n / 1000)}k` : n.toLocaleString("en-US");
  return `${symbol}${amount}/${period === "year" ? "yr" : "mo"}${symbol ? "" : ` ${currency}`}`;
}

export function formatSalary(j: { salaryMin: number | null; salaryMax: number | null; salaryCurrency: string | null; salaryPeriod: string | null }) {
  if (j.salaryMin == null && j.salaryMax == null) return null;
  const cur = j.salaryCurrency ?? "";
  if (cur === "INR" && j.salaryPeriod === "year") {
    const lo = lakh(j.salaryMin ?? j.salaryMax!), hi = lakh(j.salaryMax ?? j.salaryMin!);
    return `₹${lo === hi ? lo : `${lo}–${hi}`} LPA`;
  }
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
  // Days up to 30, so nothing in the "Past month" filter reads as a month or older.
  if (days <= 30) return `${days} days ago`;
  if (days < 60) return "Over a month ago";
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
