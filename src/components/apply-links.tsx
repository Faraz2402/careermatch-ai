import { applyPlatform } from "@/lib/apply-links";
import { cx } from "@/lib/format";

type PostedOn = { site: string; url: string; title: string };
type JobLike = { url: string; verifiedLink?: boolean; sourceUrl?: string; sourceName?: string; postedOn?: PostedOn[] };

/**
 * The one live link: "Apply on <employer site>" once the original posting is
 * verified, otherwise a plainer "View listing on <aggregator>".
 */
export function ApplyButton({ job, className }: { job: JobLike; className?: string }) {
  if (!job.url) return null;
  const platform = applyPlatform(job.url) ?? "source";
  return (
    <a
      href={job.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cx(job.verifiedLink ? "btn-primary" : "btn-secondary", className)}
      title={job.verifiedLink ? "Original posting on the employer's site" : "We haven't confirmed the employer's own posting yet"}
    >
      {job.verifiedLink ? `Apply on ${platform}` : `View listing on ${platform}`} ↗
    </a>
  );
}

/**
 * Every place to apply: the employer's own posting first, then the same job
 * on LinkedIn / Naukri etc., and the aggregator listing last (muted).
 */
export function JobLinks({ job, compact, hideApply }: { job: JobLike; compact?: boolean; hideApply?: boolean }) {
  const posted = job.postedOn ?? [];
  const aggregator = job.verifiedLink ? job.sourceUrl : job.url;
  const chip = cx("rounded-full border px-2.5 py-0.5 font-medium", compact ? "text-[11px]" : "text-xs");
  if (!job.verifiedLink && posted.length === 0 && !aggregator) return null;
  return (
    <div className={cx("flex flex-wrap items-center gap-1.5", compact ? "text-[11px]" : "text-xs")}>
      {job.verifiedLink && !hideApply && (
        <a href={job.url} target="_blank" rel="noopener noreferrer" className={cx(chip, "border-brand-600 bg-brand-600 text-white hover:bg-brand-500")} title="Original posting, checked on the employer's site">
          Apply on {applyPlatform(job.url) ?? "employer site"} ↗
        </a>
      )}
      {posted.map((p) => (
        <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer nofollow" title={p.title} className={cx(chip, "border-slate-300 text-slate-700 hover:border-brand-400 hover:text-brand-700")}>
          {p.site} ↗
        </a>
      ))}
      {aggregator && (
        <a href={aggregator} target="_blank" rel="noopener noreferrer" className="px-1 text-slate-400 hover:text-slate-600 hover:underline" title="The listing where we found this job">
          {applyPlatform(aggregator) ?? job.sourceName ?? "source"} listing
        </a>
      )}
    </div>
  );
}
