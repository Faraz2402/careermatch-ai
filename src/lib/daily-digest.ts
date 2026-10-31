import "server-only";
// The daily 7 AM email: each Pro member's best new job matches, scored
// against their profile and keywords, each linking to the job page on
// CareerMatch (description, score breakdown, apply links).

import { createHmac, timingSafeEqual } from "node:crypto";
import type { User } from "@prisma/client";
import { db } from "./db";
import { formatSalary, relativeDate } from "./format";
import { detectLocation } from "./geo/detect";
import { loadUserContext, searchJobs, STRONG_MATCH, type JobCard } from "./jobs/service";
import { log } from "./log";
import { appUrl, escapeHtml as esc, sendEmail } from "./mailer";
import { hasSocialLogin } from "./oauth";
import { planOf } from "./plans";

export const DIGEST_MIN_SCORE = 50;
export const DIGEST_MAX_JOBS = 10;

// --- Unsubscribe links (signed, so they work without signing in) -------------

const secret = () => process.env.DATA_ENCRYPTION_KEY || process.env.CRON_SECRET || "careermatch-digest";
const sign = (userId: string) => createHmac("sha256", secret()).update(`digest-unsub:${userId}`).digest("hex").slice(0, 32);

export const unsubscribeUrl = (userId: string) => `${appUrl()}/api/digest/unsubscribe?u=${encodeURIComponent(userId)}&t=${sign(userId)}`;

export function verifyUnsubscribe(userId: string, token: string) {
  const a = Buffer.from(sign(userId)), b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

// --- Choosing the jobs --------------------------------------------------------

/** Best new matches for one user: their country, their target roles, scored on their profile. */
export async function pickDigestJobs(user: Pick<User, "id" | "digestLastSentAt">) {
  const { resume, prefs, hasProfile } = await loadUserContext(user.id);
  if (!hasProfile) return { jobs: [] as JobCard[], reason: "no profile" };
  const country = [...prefs.locations, resume.location].map((l) => detectLocation(l).countries[0]).find(Boolean);
  // Two days of postings (fetching fresh ones for the country), then keep only
  // listings first seen since the last email so nothing repeats.
  const res = await searchJobs(user.id, { q: prefs.roles.join(", "), country, postedWithinDays: 2, sort: "match", pageSize: 50 });
  const since = user.digestLastSentAt ?? new Date(Date.now() - 26 * 3_600_000);
  const fresh = new Set(
    (await db.job.findMany({ where: { id: { in: res.jobs.map((j) => j.id) }, firstSeenAt: { gt: since } }, select: { id: true } })).map((j) => j.id),
  );
  const jobs = res.jobs.filter((j) => fresh.has(j.id) && j.match.score >= DIGEST_MIN_SCORE && !j.hidden && j.source !== "demo").slice(0, DIGEST_MAX_JOBS);
  return { jobs, reason: jobs.length ? "" : "no new matches" };
}

// --- The email ----------------------------------------------------------------

const chip = (text: string, ok: boolean) =>
  `<span style="display:inline-block;margin:0 4px 4px 0;padding:2px 8px;border-radius:999px;font-size:12px;${ok ? "background:#ecfdf5;color:#047857" : "background:#fff1f2;color:#be123c"}">${ok ? "✓" : "✗"} ${esc(text)}</span>`;

function jobCard(j: JobCard) {
  const url = `${appUrl()}/jobs/${encodeURIComponent(j.id)}`;
  const color = j.match.score >= STRONG_MATCH ? "#059669" : "#d97706";
  const meta = [j.company, j.location || "Location not stated", j.workMode !== "unknown" ? j.workMode : "", formatSalary(j) ?? "", `Posted ${relativeDate(j.postedAt).toLowerCase()}`]
    .filter(Boolean)
    .map(esc)
    .join(" · ");
  return `<tr><td style="padding:18px 0;border-top:1px solid #e4e4e7">
<table role="presentation" style="width:100%;border-collapse:collapse"><tr>
<td style="vertical-align:top">
  <a href="${url}" style="font-size:16px;font-weight:700;color:#18181b;text-decoration:none">${esc(j.title)}</a>
  <div style="margin-top:4px;font-size:13px;color:#52525b;text-transform:none">${meta}</div>
</td>
<td style="vertical-align:top;width:64px;text-align:right">
  <div style="display:inline-block;min-width:44px;padding:8px 6px;border-radius:12px;border:2px solid ${color};text-align:center;font-weight:800;font-size:18px;color:${color}">${j.match.score}</div>
  <div style="font-size:10px;color:#71717a;text-align:center;margin-top:2px">MATCH</div>
</td></tr></table>
<div style="margin-top:10px">${j.match.matched.slice(0, 4).map((s) => chip(s, true)).join("")}${j.match.missing.slice(0, 3).map((s) => chip(s, false)).join("")}</div>
<a href="${url}" style="display:inline-block;margin-top:10px;padding:9px 16px;border-radius:999px;background:#18181b;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none">View job &amp; apply →</a>
</td></tr>`;
}

export function digestEmail(user: Pick<User, "id" | "name">, jobs: JobCard[]) {
  const first = user.name?.split(" ")[0];
  const date = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" });
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:'Plus Jakarta Sans',Inter,Arial,sans-serif;color:#18181b">
<div style="max-width:600px;margin:0 auto;padding:28px 16px">
  <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:16px"><tr>
    <td><img src="${appUrl()}/brand/mark.png" width="32" height="32" alt="" style="vertical-align:middle;border-radius:8px">
    <span style="vertical-align:middle;margin-left:8px;font-family:Georgia,serif;font-size:20px;color:#18181b">CareerMatch</span></td>
    <td style="text-align:right;font-size:12px;color:#71717a">${esc(date)}</td>
  </tr></table>
  <div style="background:#ffffff;border:1px solid #e4e4e7;border-radius:18px;padding:24px">
    <h1 style="margin:0;font-family:Georgia,serif;font-weight:500;font-size:24px">${first ? `${esc(first)}, here` : "Here"} ${jobs.length === 1 ? "is your best new match" : `are your ${jobs.length} best new matches`}</h1>
    <p style="margin:8px 0 0;font-size:14px;color:#52525b">New since your last email, ranked against your résumé and target roles. <span style="color:#047857">✓ green</span> skills are on your profile; <span style="color:#be123c">✗ red</span> ones are missing.</p>
    <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:12px">${jobs.map(jobCard).join("")}</table>
    <p style="margin:20px 0 0"><a href="${appUrl()}/jobs" style="font-size:14px;font-weight:600;color:#6d28d9">See all your matches →</a></p>
  </div>
  <p style="font-size:12px;color:#71717a;margin-top:16px;line-height:1.6">
    You get this daily email at 7 AM because you're a CareerMatch Pro member. Matches use your <a href="${appUrl()}/preferences" style="color:#52525b">preferences</a> and profile.<br>
    <a href="${unsubscribeUrl(user.id)}" style="color:#52525b">Unsubscribe from the daily email</a> · <a href="${appUrl()}/privacy" style="color:#52525b">Privacy</a>
  </p>
</div></body></html>`;
  const subject = `${jobs.length} new job match${jobs.length === 1 ? "" : "es"} for you · top score ${Math.max(...jobs.map((j) => j.match.score))}`;
  return { subject, html };
}

// --- Sending --------------------------------------------------------------------

/** Pro members who can receive the email (verified, not demo, not opted out). */
async function recipients() {
  const users = await db.user.findMany({ where: { plan: "pro", isDemo: false, digestOptOut: false } });
  return users.filter((u) => planOf(u) === "pro" && (u.emailVerifiedAt || hasSocialLogin(u)));
}

export async function sendDailyDigest(user: User, opts: { force?: boolean } = {}) {
  const { jobs, reason } = await pickDigestJobs(opts.force ? { ...user, digestLastSentAt: new Date(Date.now() - 3 * 86_400_000) } : user);
  if (!jobs.length) return { sent: false, reason };
  const { subject, html } = digestEmail(user, jobs);
  await sendEmail({ to: user.email, subject, html });
  // A test/preview send doesn't count as that day's email.
  if (!opts.force) await db.user.update({ where: { id: user.id }, data: { digestLastSentAt: new Date() } });
  return { sent: true, count: jobs.length };
}

/** The 7 AM run: one email per Pro member, stopping before the function time limit. */
export async function runDailyDigests(opts: { onlyEmail?: string; force?: boolean } = {}, deadline = Date.now() + 50_000) {
  const users = (await recipients()).filter((u) => !opts.onlyEmail || u.email.toLowerCase() === opts.onlyEmail.toLowerCase());
  let sent = 0, skipped = 0, failed = 0;
  for (const u of users) {
    if (Date.now() > deadline) break;
    // Already sent today (e.g. a retry of the cron)
    if (!opts.force && u.digestLastSentAt && Date.now() - u.digestLastSentAt.getTime() < 20 * 3_600_000) {
      skipped++;
      continue;
    }
    try {
      if ((await sendDailyDigest(u, { force: opts.force })).sent) sent++;
      else skipped++;
    } catch (e) {
      failed++;
      log.error("digest.failed", { user: u.id, message: String(e) });
    }
  }
  log.info("digest.done", { recipients: users.length, sent, skipped, failed });
  return { recipients: users.length, sent, skipped, failed };
}
