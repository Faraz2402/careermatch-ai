import Link from "next/link";
import { JobDiscovery } from "@/components/job-discovery";
import { EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { detectLocation } from "@/lib/geo/detect";
import { activeSources } from "@/lib/jobs/registry";
import { loadUserContext } from "@/lib/jobs/service";

export const metadata = { title: "Discover jobs" };

export default async function JobsPage() {
  const user = await requireUser();
  const { hasProfile, prefs, resume } = await loadUserContext(user.id);
  if (!hasProfile)
    return (
      <EmptyState
        title="Add your resume to see matches"
        body="Job ranking compares each listing against your skills and experience, so we need your profile first."
        action={<Link href="/onboarding" className="btn-primary">Upload resume</Link>}
      />
    );
  // Start in the user's own country: preferred locations first, then profile.
  const defaultCountry = [...prefs.locations, resume.location].map((l) => detectLocation(l).countries[0]).find(Boolean) ?? "";
  const sources = [...(await activeSources()).map((s) => ({ id: s.def.id, name: s.def.name })), { id: "user_link", name: "Imported by you" }];
  return <JobDiscovery sources={sources} defaultCountry={defaultCountry} />;
}
