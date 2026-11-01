import { notFound } from "next/navigation";
import { StudioEditor } from "@/components/studio/studio-editor";
import { requireUser } from "@/lib/auth";
import { PLANS, planOf } from "@/lib/plans";
import { getDraft } from "@/lib/tailor/drafts";

export const metadata = { title: "Résumé Studio" };

export default async function StudioDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const draft = await getDraft(user.id, (await params).id);
  if (!draft) notFound();
  // Full-window workspace over the app chrome.
  return (
    <div className="fixed inset-0 z-40">
      <StudioEditor initial={draft} canUsePro={PLANS[planOf(user)].premiumTemplates} />
    </div>
  );
}
