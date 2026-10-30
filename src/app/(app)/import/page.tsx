import { ImportConfirm } from "@/components/import-confirm";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Import job" };

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  await requireUser();
  const { url = "" } = await searchParams;
  return <ImportConfirm url={url} />;
}
