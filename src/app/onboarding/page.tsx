import type { Metadata } from "next";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata: Metadata = {
  title: "Set up your writing space",
  description: "Personalize your private, local-first Awthor writing workspace.",
};

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
