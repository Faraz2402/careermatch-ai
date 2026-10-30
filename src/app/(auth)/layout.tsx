import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,var(--color-brand-100),transparent_60%)] px-4 py-12">
      <Logo className="mb-8" />
      <div className="card w-full max-w-md p-8">{children}</div>
    </div>
  );
}
