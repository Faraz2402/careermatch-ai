import { StudioHome } from "@/components/studio/studio-home";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLANS, planOf } from "@/lib/plans";
import { getProfile } from "@/lib/profile";
import { listUploads } from "@/lib/resume/uploads";
import { listDrafts } from "@/lib/tailor/drafts";

export const metadata = { title: "Make Resume & Cover Letter" };

export default async function StudioPage() {
  const user = await requireUser();
  const plan = PLANS[planOf(user)];
  const [drafts, profile, versions, saved, uploads] = await Promise.all([
    listDrafts(user.id),
    getProfile(user.id),
    db.resumeVersion.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, select: { id: true, name: true } }),
    db.userJob.findMany({ where: { userId: user.id, OR: [{ saved: true }, { status: { not: "none" } }] }, orderBy: { updatedAt: "desc" }, take: 50, include: { job: { select: { id: true, title: true, company: true } } } }),
    listUploads(user.id),
  ]);
  return (
    <StudioHome
      drafts={drafts}
      jobs={saved.map((s) => s.job)}
      bases={[{ id: null, name: "Primary profile" }, ...versions]}
      uploads={uploads}
      resume={profile?.data ?? null}
      canUsePro={plan.premiumTemplates}
      draftLimit={plan.tailorDrafts}
    />
  );
}
