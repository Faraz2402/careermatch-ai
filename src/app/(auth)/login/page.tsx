import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth-forms";
import { enabledProviders } from "@/lib/oauth";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: true } };

export default function Page() {
  return (
    <Suspense>
      <LoginForm providers={enabledProviders()} />
    </Suspense>
  );
}
