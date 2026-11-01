import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { relativeDate } from "@/lib/format";

export const metadata = { title: "Dev outbox" };

/** Emails captured when no provider is configured. Dev, or admins only. */
export default async function OutboxPage() {
  const user = await requireUser();
  if (process.env.NODE_ENV === "production" && !user.isAdmin) notFound();
  const emails = await db.outboxEmail.findMany({
    // Non-admins only see mail addressed to themselves.
    where: user.isAdmin ? {} : { to: user.email },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return (
    <div className="w-full">
      <PageHeader title="Dev outbox" subtitle="Emails that would have been sent. Configure RESEND_API_KEY + EMAIL_FROM to deliver for real." />
      {emails.length === 0 && <p className="text-sm text-slate-500">No emails yet.</p>}
      <div className="space-y-4">
        {emails.map((e) => (
          <details key={e.id} className="card overflow-hidden">
            <summary className="cursor-pointer p-4 text-sm">
              <b>{e.subject}</b> <span className="text-slate-500">→ {e.to} · {relativeDate(e.createdAt).toLowerCase()}</span>
            </summary>
            <iframe title={e.subject} sandbox="" srcDoc={e.html} className="h-[480px] w-full border-t border-slate-100 bg-surface" />
          </details>
        ))}
      </div>
    </div>
  );
}
