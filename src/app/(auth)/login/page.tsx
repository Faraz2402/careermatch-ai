import { Suspense } from "react";
import { LoginForm } from "@/components/auth-forms";
import { googleEnabled } from "@/lib/google-oauth";

export const metadata = { title: "Sign in" };

export default function Page() {
  return (
    <Suspense>
      <LoginForm google={googleEnabled()} />
    </Suspense>
  );
}
