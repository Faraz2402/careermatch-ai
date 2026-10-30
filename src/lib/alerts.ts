import "server-only";
import { db, parseJson } from "./db";
import { formatSalary } from "./format";
import { searchJobs, STRONG_MATCH, type JobCard, type SearchFilters } from "./jobs/service";
import { log } from "./log";
import { appUrl, emailLayout, escapeHtml, sendEmail } from "./mailer";

const PERIOD_MS = { daily: 86_400_000, weekly: 7 * 86_400_000 } as const;
export const ALERT_MIN_SCORE = 50;

function digestHtml(name: string, jobs: JobCard[]) {
  const rows = jobs
    .map(
      (j) => `<tr><td style="padding:10px 0;border-top:1px solid #e2e8f0">
<a href="${appUrl()}/jobs/${encodeURIComponent(j.id)}" style="font-weight:600;color:#0f172a;text-decoration:none">${escapeHtml(j.title)}</a>
<div style="font-size:13px;color:#475569">${escapeHtml(j.company)} · ${escapeHtml(j.location || j.workMode)} · ${escapeHtml(formatSalary(j) ?? "Salary not listed")} · Source: ${escapeHtml(j.sourceName)}</div></td>
<td style="padding:10px 0 10px 12px;border-top:1px solid #e2e8f0;text-align:right;font-weight:700;color:${j.match.score >= STRONG_MATCH ? "#059669" : "#d97706"}">${j.match.score}</td></tr>`,
    )
    .join("");
  return emailLayout(
    `${jobs.length} new match${jobs.length === 1 ? "" : "es"} for “${name}”`,
    `<table style="width:100%;border-collapse:collapse">${rows}</table>`,
    { label: "See all matches", url: `${appUrl()}/jobs` },
  );
}

/** Find new matches for one saved search and email them. */
export async function sendDigest(searchId: string, opts: { force?: boolean } = {}) {
  const s = await db.savedSearch.findUnique({ where: { id: searchId }, include: { user: true } });
  if (!s) return { sent: false, reason: "not found" };
  if (!s.user.emailVerifiedAt && !s.user.googleId) return { sent: false, reason: "Verify your email to receive alerts." };
  const filters = parseJson<SearchFilters>(s.filters, {});
  const res = await searchJobs(s.userId, { ...filters, newSince: opts.force ? undefined : s.lastAlertAt, pageSize: 50, sort: "match" });
  const jobs = res.jobs.filter((j) => j.match.score >= ALERT_MIN_SCORE).slice(0, 15);
  await db.savedSearch.update({ where: { id: s.id }, data: { lastAlertAt: new Date() } });
  if (jobs.length === 0) return { sent: false, reason: "No new matches since the last alert." };
  await sendEmail({ to: s.user.email, subject: `${jobs.length} new job match${jobs.length === 1 ? "" : "es"}: ${s.name}`, html: digestHtml(s.name, jobs) });
  return { sent: true, count: jobs.length };
}

async function sendFollowUps() {
  const due = await db.userJob.findMany({
    where: { followUpAt: { lte: new Date() }, followUpNotifiedAt: null, status: { in: ["interested", "applied", "interviewing"] } },
    include: { job: true, user: true },
    take: 200,
  });
  let sent = 0;
  for (const d of due) {
    if (!d.user.emailVerifiedAt && !d.user.googleId) continue;
    await sendEmail({
      to: d.user.email,
      subject: `Follow up: ${d.job.title} at ${d.job.company}`,
      html: emailLayout(
        "Time to follow up",
        `<p>You planned to follow up on <b>${escapeHtml(d.job.title)}</b> at ${escapeHtml(d.job.company)}${d.contactName ? ` with ${escapeHtml(d.contactName)}` : ""}.</p>${d.notes ? `<p style="color:#475569">Your notes: ${escapeHtml(d.notes)}</p>` : ""}`,
        { label: "Open application", url: `${appUrl()}/applications` },
      ),
    });
    await db.userJob.update({ where: { id: d.id }, data: { followUpNotifiedAt: new Date() } });
    sent++;
  }
  return sent;
}

export async function runAlerts() {
  const now = Date.now();
  const searches = await db.savedSearch.findMany({ where: { frequency: { in: ["daily", "weekly"] } } });
  const due = searches.filter((s) => now - s.lastAlertAt.getTime() >= PERIOD_MS[s.frequency as keyof typeof PERIOD_MS]);
  let digests = 0;
  for (const s of due) {
    try {
      if ((await sendDigest(s.id)).sent) digests++;
    } catch (e) {
      log.error("alerts.digest_failed", { search: s.id, message: String(e) });
    }
  }
  const followUps = await sendFollowUps();
  log.info("alerts.done", { due: due.length, digests, followUps });
  return { due: due.length, digests, followUps };
}
