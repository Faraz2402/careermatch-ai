import Link from "next/link";
import { LEGAL_LINKS } from "@/lib/legal";
import { BackgroundSync } from "@/components/background-sync";
import { GlobalSearch } from "@/components/global-search";
import { NavLinks, UserMenu } from "@/components/nav";
import { ThemeToggle } from "@/components/theme";
import { Logo } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { hasSocialLogin } from "@/lib/oauth";

export const metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unverified = !user.isDemo && !user.emailVerifiedAt && !hasSocialLogin(user);
  return (
    <div className="min-h-screen">
      <BackgroundSync />
      <div aria-hidden className="scroll-progress" />
      <header className="glass-header">
        <div className="shell flex flex-wrap items-center gap-x-5 gap-y-2 pt-3">
          <Logo />
          <div className="order-last w-full md:order-none md:w-auto md:max-w-md md:flex-1"><GlobalSearch /></div>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <UserMenu label={user.isDemo ? "Demo account" : user.name ?? user.email} isAdmin={user.isAdmin} plan={user.plan} />
          </div>
        </div>
        <div className="shell mt-2"><NavLinks /></div>
      </header>
      {user.isDemo && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
          You&apos;re exploring a demo account with a fictional résumé (deleted after 24 hours). Listings marked &ldquo;Demo data&rdquo; are samples, not real jobs.
        </div>
      )}
      {unverified && (
        <div className="border-b border-sky-200 bg-sky-50 px-4 py-2 text-center text-xs text-sky-800">
          Confirm your email to turn on job alerts and follow-up reminders. <Link href="/settings" className="font-semibold underline">Resend confirmation</Link>
        </div>
      )}
      <main id="main" className="shell py-8">{children}</main>
      <footer className="border-t border-slate-200 py-6"><nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-slate-500" aria-label="Legal">{LEGAL_LINKS.map((l) => <Link key={l.href} href={l.href} className="hover:text-slate-800">{l.label}</Link>)}</nav></footer>
    </div>
  );
}
