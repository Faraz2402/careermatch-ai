import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth-forms";
import { enabledProviders } from "@/lib/oauth";

export const metadata: Metadata = {
  title: "Create your free account",
  description: "Sign up free with Google or email. Upload your résumé and get ranked job matches, skill gaps and tailored applications in minutes.",
  alternates: { canonical: "/signup" },
};

export default function Page() {
  return (
    <Suspense>
      <SignupForm providers={enabledProviders()} />
    </Suspense>
  );
}
