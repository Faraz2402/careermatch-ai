import Link from "next/link";
import { ProfileBuilder } from "@/components/profile-builder";
import { EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { appUrl } from "@/lib/mailer";
import { getProfile } from "@/lib/profile";

export const metadata = { title: "Profile builder" };

export default async function ProfilePage() {
  const user = await requireUser();
  const p = await getProfile(user.id);
  if (!p)
    return (
      <EmptyState
        title="No profile yet"
        body="Upload your resume and we'll turn it into an editable, shareable profile page."
        action={<Link href="/onboarding" className="btn-primary">Upload resume</Link>}
      />
    );
  return <ProfileBuilder initial={{ data: p.data, visibility: p.visibility, isPublic: p.isPublic, slug: p.slug, theme: p.theme }} views={p.views} appUrl={appUrl()} />;
}
