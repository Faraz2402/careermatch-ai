import { Suspense } from "react";
import { SignupForm } from "@/components/auth-forms";
import { googleEnabled } from "@/lib/google-oauth";

export const metadata = { title: "Sign up" };

export default function Page() {
  return (
    <Suspense>
      <SignupForm google={googleEnabled()} />
    </Suspense>
  );
}
