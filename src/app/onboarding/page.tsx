import { redirect } from "next/navigation";

import { ONBOARDING_STEPS } from "@/lib/onboarding/steps";

/** Entry point — sends the user to the first step of the funnel. */
export default function OnboardingIndex() {
  redirect(`/onboarding/${ONBOARDING_STEPS[0].slug}`);
}
