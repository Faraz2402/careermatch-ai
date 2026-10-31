import { LandingFx } from "@/components/landing-fx";
import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <LandingFx />
      <div aria-hidden className="lux-aurora pointer-events-none absolute -top-72 left-1/2 h-[640px] w-[1000px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(124,58,237,0.22),rgba(8,145,178,0.08)_55%,transparent)] blur-2xl" />
      <Logo className="relative mb-8" />
      <div className="card relative w-full max-w-md p-8 backdrop-blur-xl sm:p-10">{children}</div>
    </div>
  );
}
