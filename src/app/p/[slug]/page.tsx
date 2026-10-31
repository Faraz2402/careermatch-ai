import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProfileView } from "@/components/profile-view";
import { db } from "@/lib/db";
import { loadPublicProfile } from "@/lib/public-profile";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await loadPublicProfile((await params).slug);
  if (!p) return { title: "Profile not found" };
  const title = `${p.data.name} — ${p.data.headline}`;
  return {
    title,
    description: p.data.summary.slice(0, 160),
    openGraph: { title, description: p.data.summary.slice(0, 160), type: "profile" },
    twitter: { card: "summary_large_image", title },
    robots: p.isPublic ? undefined : { index: false },
  };
}

export default async function PublicProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await loadPublicProfile(slug);
  if (!p) notFound();
  // Count visits from anyone but the owner.
  if (!p.isOwner && p.isPublic) await db.profile.update({ where: { id: p.id }, data: { views: { increment: 1 } } });
  return (
    <div className="min-h-screen bg-surface">
      {p.isOwner && (
        <div className="flex items-center justify-center gap-3 bg-[#0f172a] px-4 py-2 text-xs text-white">
          {p.isPublic ? `This is your public profile · ${p.views} views` : "Only you can see this — your profile is private."}
          <Link href="/profile" className="font-semibold underline">Edit profile</Link>
        </div>
      )}
      <ProfileView data={p.data} visibility={p.visibility} theme={p.theme} downloadHref={`/p/${slug}/resume.pdf`} />
      <footer className="border-t border-slate-100 py-6 text-center text-xs text-slate-500">
        Built with <Link href="/" className="font-semibold text-brand-600">CareerMatch AI</Link>
      </footer>
    </div>
  );
}
