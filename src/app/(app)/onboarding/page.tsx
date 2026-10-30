import { OnboardingFlow } from "@/components/onboarding";
import { aiEnabled } from "@/lib/ai";

export const metadata = { title: "Upload resume" };

export default function OnboardingPage() {
  return <OnboardingFlow aiEnabled={aiEnabled()} />;
}
