import { Suspense } from "react";
import { LoginForm } from "@/components/auth-forms";
import { enabledProviders } from "@/lib/oauth";

export const metadata = { title: "Sign in" };

export default function Page() {
  return (
    <Suspense>
      <LoginForm providers={enabledProviders()} />
    </Suspense>
  );
}
