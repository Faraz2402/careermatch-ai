import { db } from "@/lib/db";
import { verifyUnsubscribe } from "@/lib/daily-digest";
import { appUrl } from "@/lib/mailer";

const page = (title: string, body: string) =>
  new Response(
    `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#050505;color:#fafafa;font-family:system-ui,sans-serif">
<div style="max-width:420px;padding:32px;text-align:center"><h1 style="font-family:Georgia,serif;font-weight:500">${title}</h1><p style="color:#d4d4d8;line-height:1.6">${body}</p>
<p><a href="${appUrl()}/settings" style="color:#c4b5fd">Email settings</a></p></div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

/** One-click unsubscribe from the daily email (signed link, no sign-in needed). */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const userId = p.get("u") ?? "";
  if (!userId || !verifyUnsubscribe(userId, p.get("t") ?? "")) return page("Link not valid", "This unsubscribe link is invalid or incomplete. You can turn the daily email off in Settings.");
  await db.user.updateMany({ where: { id: userId }, data: { digestOptOut: true } });
  return page("You're unsubscribed", "You won't get the daily job email any more. You can turn it back on anytime in Settings.");
}
