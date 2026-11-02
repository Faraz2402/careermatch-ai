import Link from "next/link";
import { LandingNav } from "@/components/landing-nav";
import { ThemeToggle } from "@/components/theme";
import { Logo } from "@/components/ui";
import { LEGAL_LINKS } from "@/lib/legal";

/** Public layout for the Resume Examples library (static pages: no session lookups). */
export default function ResumeExamplesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-surface/85 backdrop-blur-md">
        <div className="shell flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-6">
            <Logo />
            <LandingNav className="hidden lg:block" />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="hidden rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800 transition hover:border-brand-500 hover:text-brand-700 sm:block">Sign in</Link>
            <Link href="/signup" className="btn-primary !px-4 text-sm whitespace-nowrap sm:!px-5">Build <span className="hidden sm:inline">my&nbsp;</span>résumé</Link>
          </div>
        </div>
      </header>
      <main id="main" className="shell py-8 sm:py-12">{children}</main>
      <footer className="border-t border-slate-200 py-8">
        <nav className="shell flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-slate-600" aria-label="Legal">
          <Link href="/resume-examples" className="hover:text-slate-900">Resume examples</Link>
          {LEGAL_LINKS.map((l) => <Link key={l.href} href={l.href} className="hover:text-slate-900">{l.label}</Link>)}
        </nav>
        <p className="shell mt-3 text-center text-xs text-slate-500">Every example is fictional: people, employers, phone numbers and figures are invented for illustration.</p>
      </footer>
    </div>
  );
}
