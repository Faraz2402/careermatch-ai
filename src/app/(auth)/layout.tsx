import Link from "next/link";
import { LEGAL_LINKS } from "@/lib/legal";
import { ThemeToggle } from "@/components/theme";
import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <ThemeToggle className="absolute! top-4 right-4 z-10" />
      <Logo className="mb-8" />
      <div className="card w-full max-w-md p-8 sm:p-10">{children}</div>
      <nav className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-slate-500" aria-label="Legal">
        {LEGAL_LINKS.map((l) => <Link key={l.href} href={l.href} className="hover:text-slate-800">{l.label}</Link>)}
      </nav>
    </div>
  );
}
