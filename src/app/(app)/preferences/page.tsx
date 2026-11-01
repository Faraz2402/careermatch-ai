import { PreferencesForm } from "@/components/preferences-form";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { loadUserContext } from "@/lib/jobs/service";
import { inferSeniority } from "@/lib/jobs/rank";

export const metadata = { title: "Job preferences" };

export default async function PreferencesPage({ searchParams }: { searchParams: Promise<{ onboarding?: string }> }) {
  const user = await requireUser();
  const { prefs, resume } = await loadUserContext(user.id);
  const onboarding = (await searchParams).onboarding === "1";
  // Seed sensible defaults from the resume the first time.
  const initial = prefs.roles.length
    ? prefs
    : { ...prefs, roles: [resume.headline || resume.experience[0]?.title].filter(Boolean) as string[], locations: resume.location ? [resume.location] : [], seniorities: resume.experience.length ? [inferSeniority(resume)] : prefs.seniorities };
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Job preferences" subtitle="These shape which listings we fetch and how we rank them." />
      <PreferencesForm initial={initial} onboarding={onboarding} />
    </div>
  );
}
