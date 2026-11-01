// Salary normalisation and market insights. FX rates are static
// approximations - the UI labels converted figures as "approx."

import { FX_TO_USD } from "../geo/currency";
import type { NormalizedJob } from "./types";

export { FX_TO_USD };
const PERIOD_FACTOR: Record<string, number> = { year: 1, month: 12, hour: 2080 };

type SalaryFields = Pick<NormalizedJob, "salaryMin" | "salaryMax" | "salaryCurrency" | "salaryPeriod">;

/** Midpoint of the posted range, converted to yearly USD. */
export function normalizeSalaryYearlyUsd(j: SalaryFields): number | null {
  const lo = j.salaryMin ?? j.salaryMax;
  const hi = j.salaryMax ?? j.salaryMin;
  if (lo == null || hi == null) return null;
  const fx = FX_TO_USD[(j.salaryCurrency ?? "USD").toUpperCase()];
  const factor = PERIOD_FACTOR[j.salaryPeriod ?? "year"];
  if (!fx || !factor) return null;
  const value = ((lo + hi) / 2) * factor * fx;
  // Guard against obviously wrong units (e.g. "120" meaning 120k).
  return value >= 5_000 && value <= 2_000_000 ? Math.round(value) : null;
}

export type SalaryInsight = {
  sample: number;
  p25: number;
  median: number;
  p75: number;
  thisJob: number | null;
  percentile: number | null;
};

const pct = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)))];

export function salaryInsight(values: number[], thisJob: number | null): SalaryInsight | null {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (sorted.length < 5) return null;
  const percentile = thisJob == null ? null : Math.round((100 * sorted.filter((v) => v <= thisJob).length) / sorted.length);
  return { sample: sorted.length, p25: pct(sorted, 0.25), median: pct(sorted, 0.5), p75: pct(sorted, 0.75), thisJob, percentile };
}

export const formatUsdK = (n: number) => `$${Math.round(n / 1000)}k`;
