import Link from "next/link";
import { NavLinks, UserMenu } from "@/components/nav";
import { Logo } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { hasSocialLogin } from "@/lib/oauth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unverified = !user.isDemo && !user.emailVerifiedAt && !hasSocialLogin(user);
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Logo />
          <NavLinks />
          <div className="ml-auto">
            <UserMenu label={user.isDemo ? "Demo account" : user.name ?? user.email} isAdmin={user.isAdmin} plan={user.plan} />
          </div>
        </div>
      </header>
      {user.isDemo && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
          You&apos;re exploring a demo account with a fictional resume (deleted after 24 hours). Listings marked “Demo data” are samples, not real jobs.
        </div>
      )}
      {unverified && (
        <div className="border-b border-sky-200 bg-sky-50 px-4 py-2 text-center text-xs text-sky-800">
          Confirm your email to turn on job alerts and follow-up reminders. <Link href="/settings" className="font-semibold underline">Resend confirmation</Link>
        </div>
      )}
      <main id="main" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
      <footer className="border-t border-slate-200 py-6"><nav className="flex justify-center gap-5 text-xs text-slate-500" aria-label="Legal"><Link href="/privacy" className="hover:text-slate-800">Privacy Policy</Link><Link href="/terms" className="hover:text-slate-800">Terms of Service</Link></nav></footer>
    </div>
  );
}
