import Link from "next/link";
import { notFound } from "next/navigation";
import { MockInterview } from "@/components/mock-interview";
import { aiEnabled } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Mock interview" };

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = decodeURIComponent((await params).id);
  const job = await db.job.findUnique({ where: { id }, select: { id: true, title: true, company: true, importedById: true } });
  if (!job || (job.importedById && job.importedById !== user.id)) notFound();
  const versions = await db.resumeVersion.findMany({ where: { userId: user.id }, select: { id: true, name: true } });
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/jobs/${encodeURIComponent(id)}`} className="text-sm font-medium text-brand-600 hover:underline">← Back to job</Link>
      <h1 className="mt-3 font-display text-2xl font-extrabold">Mock interview</h1>
      <p className="text-sm text-slate-600">{job.title} · {job.company}</p>
      <MockInterview jobId={id} aiEnabled={aiEnabled()} versions={[{ id: null, name: "Primary profile" }, ...versions]} />
    </div>
  );
}
