import { Suspense } from "react";
import { SignupForm } from "@/components/auth-forms";
import { enabledProviders } from "@/lib/oauth";

export const metadata = { title: "Sign up" };

export default function Page() {
  return (
    <Suspense>
      <SignupForm providers={enabledProviders()} />
    </Suspense>
  );
}
