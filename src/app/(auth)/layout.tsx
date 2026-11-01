import Link from "next/link";
import { LEGAL_LINKS } from "@/lib/legal";
import { LandingFx } from "@/components/landing-fx";
import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <LandingFx />
      <div aria-hidden className="lux-aurora pointer-events-none absolute -top-72 left-1/2 h-[640px] w-[1000px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(124,58,237,0.13),rgba(8,145,178,0.04)_55%,transparent)] blur-xl" />
      <Logo className="relative mb-8" />
      <div className="card relative w-full max-w-md p-8 backdrop-blur-xl sm:p-10">{children}</div>
      <div className="relative mt-6"><nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-slate-500" aria-label="Legal">{LEGAL_LINKS.map((l) => <Link key={l.href} href={l.href} className="hover:text-slate-800">{l.label}</Link>)}</nav></div>
    </div>
  );
}
