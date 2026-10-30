import { ResumeVersions } from "@/components/resume-versions";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { unsealJson } from "@/lib/crypto";
import { db } from "@/lib/db";
import { PLANS, planOf } from "@/lib/plans";
import { getProfile } from "@/lib/profile";
import { emptyResume, type ResumeData } from "@/lib/resume/schema";

export const metadata = { title: "Resume versions" };

export default async function ResumesPage() {
  const user = await requireUser();
  const [profile, versions] = await Promise.all([getProfile(user.id), db.resumeVersion.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } })]);
  return (
    <div>
      <PageHeader title="Resume versions" subtitle="Keep tailored base resumes (e.g. Frontend vs Full-stack) and choose one per application." />
      <ResumeVersions
        hasProfile={!!profile}
        limit={PLANS[planOf(user)].resumeVersions}
        initial={versions.map((v) => ({ id: v.id, name: v.name, updatedAt: v.updatedAt.toISOString(), data: { ...emptyResume(), ...unsealJson<Partial<ResumeData>>(v.data, {}) } }))}
      />
    </div>
  );
}
