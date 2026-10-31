import Link from "next/link";
import { LandingFx } from "@/components/landing-fx";
import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <LandingFx />
      <div aria-hidden className="lux-aurora pointer-events-none absolute -top-72 left-1/2 h-[640px] w-[1000px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(124,58,237,0.13),rgba(8,145,178,0.04)_55%,transparent)] blur-xl" />
      <Logo className="relative mb-8" />
      <div className="card relative w-full max-w-md p-8 backdrop-blur-xl sm:p-10">{children}</div>
      <div className="relative mt-6"><nav className="flex justify-center gap-5 text-xs text-slate-500" aria-label="Legal"><Link href="/privacy" className="hover:text-slate-800">Privacy Policy</Link><Link href="/terms" className="hover:text-slate-800">Terms of Service</Link></nav></div>
    </div>
  );
}
