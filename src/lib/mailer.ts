import "server-only";
import { db } from "./db";
import { log } from "./log";

import { appUrl } from "./site-url";

export { appUrl };

export type Email = { to: string; subject: string; html: string; text?: string };

export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

/**
 * Sends through Resend when RESEND_API_KEY + EMAIL_FROM are set. Otherwise the
 * message is stored in the dev outbox (/dev/outbox) and logged.
 */
export async function sendEmail(email: Email): Promise<{ delivered: boolean }> {
  if (!mailConfigured()) {
    await db.outboxEmail.create({ data: { to: email.to, subject: email.subject, html: email.html } });
    log.info("mail.outbox", { to: email.to, subject: email.subject });
    return { delivered: false };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM!.trim(), to: [email.to], subject: email.subject, html: email.html, text: email.text }),
  });
  if (!res.ok) {
    log.error("mail.failed", { status: res.status, to: email.to });
    throw new Error("Email delivery failed.");
  }
  return { delivered: true };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Minimal branded wrapper used by every transactional email. */
export function emailLayout(title: string, bodyHtml: string, cta?: { label: string; url: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
<div style="font-weight:800;font-size:18px;margin-bottom:16px">CareerMatch <span style="color:#4f46e5">AI</span></div>
<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px">
<h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>${bodyHtml}
${cta ? `<p style="margin:24px 0 0"><a href="${esc(cta.url)}" style="background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">${esc(cta.label)}</a></p>` : ""}
</div><p style="font-size:12px;color:#64748b;margin-top:16px">You're receiving this because of your CareerMatch AI account.</p></div></body></html>`;
}

export { esc as escapeHtml };
