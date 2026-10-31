import { Suspense } from "react";
import { ForgotForm } from "@/components/auth-forms";

export const metadata = { title: "Forgot password", robots: { index: false } };

export default function Page() {
  return (
    <Suspense>
      <ForgotForm />
    </Suspense>
  );
}
