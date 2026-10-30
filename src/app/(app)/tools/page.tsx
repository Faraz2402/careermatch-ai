import { Bookmarklet } from "@/components/bookmarklet";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { appUrl } from "@/lib/mailer";

export const metadata = { title: "Save-to-CareerMatch button" };

export default async function ToolsPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Save jobs from any site" subtitle="One click sends the job you're looking at to CareerMatch for matching and tailoring." />
      <div className="card space-y-5 p-6 text-sm text-slate-700">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Show your browser&apos;s bookmarks bar (Ctrl/⌘ + Shift + B).</li>
          <li>Drag the button below onto the bookmarks bar.</li>
          <li>On any job posting, click <b>Save to CareerMatch</b>. You&apos;ll confirm the import on the next screen.</li>
        </ol>
        <Bookmarklet appUrl={appUrl()} />
        <p className="text-xs text-slate-500">
          The button only sends the page address. We then read the employer&apos;s public structured job data (or the official Greenhouse/Lever API),
          respecting robots.txt — pages behind a login are never fetched. If a page can&apos;t be read, you can paste the description instead.
        </p>
      </div>
    </div>
  );
}
