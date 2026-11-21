import Link from "next/link";
import { Logo } from "@/components/ui";
import { LEGAL_LINKS } from "@/lib/legal";

/** Header for the public pages (home, pricing). Signed-in visitors are sent on from /login by the middleware. */
export function SiteHeader() {
  return (
    <>
      <div aria-hidden className="scroll-progress" />
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/90 text-forest-deep backdrop-blur-md">
        <div className="shell flex h-[68px] items-center gap-8">
          <Logo className="text-forest-deep!" />
          <nav aria-label="Site" className="hidden items-center gap-7 text-[0.95rem] text-forest-deep/80 md:flex">
            <Link href="/#how" className="hover:text-forest-deep">How it works</Link>
            <Link href="/#features" className="hover:text-forest-deep">Features</Link>
            <Link href="/#who" className="hover:text-forest-deep">Who it&rsquo;s for</Link>
            <Link href="/pricing" className="hover:text-forest-deep">Pricing</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2.5 whitespace-nowrap">
            <Link href="/login" className="btn rounded-full border border-forest-deep/80 px-4 text-forest-deep hover:bg-forest-deep hover:text-white">Sign in</Link>
            <Link href="/signup" className="btn rounded-full bg-leaf px-5 text-white hover:bg-forest">
              <span className="sm:hidden">Start</span><span className="hidden sm:inline">Get started free</span>
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-forest-deep text-white/75">
      <div className="shell grid gap-10 py-14 text-sm md:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <Logo className="text-white!" />
          <p className="mt-4 max-w-sm leading-6">Job matching for India and remote roles. Listings come from employer career sites and official job APIs, each shown with its source.</p>
        </div>
        <nav aria-label="Product">
          <p className="font-semibold text-white">Product</p>
          <ul className="mt-4 space-y-2.5">
            <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
            <li><Link href="/signup" className="hover:text-white">Create an account</Link></li>
            <li><Link href="/login" className="hover:text-white">Sign in</Link></li>
          </ul>
        </nav>
        <nav aria-label="Legal">
          <p className="font-semibold text-white">Policies</p>
          <ul className="mt-4 space-y-2.5">
            {LEGAL_LINKS.map((l) => <li key={l.href}><Link href={l.href} className="hover:text-white">{l.short}</Link></li>)}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="shell py-5 text-xs text-white/50">
          <span>© {new Date().getFullYear()} CareerMatch AI</span>
        </div>
      </div>
    </footer>
  );
}
