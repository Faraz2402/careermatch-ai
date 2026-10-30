import { applyPlatform, externalSearchLinks } from "@/lib/apply-links";
import { cx } from "@/lib/format";

type JobLike = { title: string; company: string; url: string; city?: string | null; country?: string | null; location?: string; source?: string };

/** Primary "Apply on <platform>" button for the listing's real link. */
export function ApplyButton({ job, className }: { job: JobLike; className?: string }) {
  if (!job.url) return null;
  const platform = applyPlatform(job.url);
  return (
    <a href={job.url} target="_blank" rel="noopener noreferrer" className={cx("btn-primary", className)}>
      Apply on {platform ?? "source"} ↗
    </a>
  );
}

/** "Find on LinkedIn · Naukri · Workday · Company careers" search links. */
export function FindOnLinks({ job, compact }: { job: JobLike; compact?: boolean }) {
  const links = externalSearchLinks(job);
  if (links.length === 0) return null;
  return (
    <div className={cx("flex flex-wrap items-center gap-1.5", compact ? "text-[11px]" : "text-xs")}>
      <span className="text-slate-500">Find on:</span>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          title={l.hint}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="rounded-full border border-slate-200 px-2 py-0.5 font-medium text-slate-700 hover:border-brand-400 hover:text-brand-700"
        >
          {l.label} ↗
        </a>
      ))}
    </div>
  );
}
