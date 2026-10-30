import { ApplicationsBoard, type BoardCard } from "@/components/applications-board";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Applications" };

export default async function ApplicationsPage() {
  const user = await requireUser();
  const [rows, versions] = await Promise.all([
    db.userJob.findMany({ where: { userId: user.id, status: { not: "none" } }, include: { job: true }, orderBy: [{ position: "asc" }, { updatedAt: "desc" }] }),
    db.resumeVersion.findMany({ where: { userId: user.id }, select: { id: true, name: true } }),
  ]);
  const names = new Map(versions.map((v) => [v.id, v.name]));
  const cards: BoardCard[] = rows.map((r) => ({
    jobId: r.jobId,
    title: r.job.title,
    company: r.job.company,
    status: r.status,
    appliedAt: r.appliedAt?.toISOString() ?? null,
    followUpAt: r.followUpAt?.toISOString() ?? null,
    contactName: r.contactName,
    contactEmail: r.contactEmail,
    resumeName: r.resumeVersionId ? names.get(r.resumeVersionId) ?? "Deleted version" : "Primary profile",
  }));
  return (
    <div>
      <PageHeader title="Applications" subtitle="Drag cards between stages (or use the move menu). Follow-up dates trigger email reminders." />
      <ApplicationsBoard initial={cards} />
    </div>
  );
}
