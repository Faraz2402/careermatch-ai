import Link from "next/link";
import { ThemeToggle } from "@/components/theme";
import { Logo } from "@/components/ui";
import { LEGAL_LINKS } from "@/lib/legal";

/** Header for the public pages (home, pricing). Signed-in visitors are sent on from /login by the middleware. */
/** `dark` sits over the navy hero; both turn to frosted glass as the page scrolls. */
export function SiteHeader({ dark = false }: { dark?: boolean }) {
  const link = dark ? "text-white/75 hover:text-white" : "text-slate-600 hover:text-slate-900";
  return (
    <>
      <div aria-hidden className="scroll-progress" />
      <header className={dark ? "glass-header-dark -mb-[61px] text-white" : "glass-header"}>
        <div className="shell flex h-[60px] items-center gap-6">
          <Logo className={dark ? "text-white!" : undefined} />
          <nav aria-label="Site" className="hidden items-center gap-6 text-sm md:flex">
            <Link href="/#scoring" className={link}>How scoring works</Link>
            <Link href="/#sources" className={link}>Where jobs come from</Link>
            <Link href="/pricing" className={link}>Pricing</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2 whitespace-nowrap">
            <ThemeToggle className="max-sm:hidden!" />
            <Link href="/login" className={dark ? "btn px-3 text-white/85 hover:bg-white/10 hover:text-white" : "btn-ghost px-3"}>Sign in</Link>
            <Link href="/signup" className={dark ? "btn bg-white text-[#0b1524] hover:bg-[#ffe36e]" : "btn-primary"}>
              <span className="sm:hidden">Start</span><span className="hidden sm:inline">Upload résumé</span>
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-surface">
      <div className="shell grid gap-8 py-10 text-sm text-slate-600 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm">Job matching for India and remote roles. Listings come from employer career sites and official job APIs, each shown with its source.</p>
        </div>
        <nav aria-label="Product">
          <p className="font-semibold text-slate-900">Product</p>
          <ul className="mt-3 space-y-2">
            <li><Link href="/pricing" className="hover:text-slate-900">Pricing</Link></li>
            <li><Link href="/signup" className="hover:text-slate-900">Create an account</Link></li>
            <li><Link href="/login" className="hover:text-slate-900">Sign in</Link></li>
          </ul>
        </nav>
        <nav aria-label="Legal">
          <p className="font-semibold text-slate-900">Policies</p>
          <ul className="mt-3 space-y-2">
            {LEGAL_LINKS.map((l) => <li key={l.href}><Link href={l.href} className="hover:text-slate-900">{l.short}</Link></li>)}
          </ul>
        </nav>
      </div>
      <div className="border-t border-slate-200">
        <p className="shell py-4 text-xs text-slate-500">© {new Date().getFullYear()} CareerMatch AI</p>
      </div>
    </footer>
  );
}
