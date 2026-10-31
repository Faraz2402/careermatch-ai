import { applyPlatform } from "@/lib/apply-links";
import { cx } from "@/lib/format";

type JobLike = { url: string; verifiedLink?: boolean };

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
