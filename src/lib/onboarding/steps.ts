/**
 * Single source of truth for the onboarding funnel.
 *
 * Order here defines the flow. The funnel page reads this to render progress,
 * route between steps, and know where the funnel ends (→ pricing/checkout).
 * Add, remove, or reorder steps by editing this array.
 */
export const ONBOARDING_STEPS = [
  { slug: "goal", title: "What's your goal?" },
  { slug: "experience", title: "How experienced are you?" },
  { slug: "plan", title: "Choose your plan" },
] as const;

export type OnboardingStepSlug = (typeof ONBOARDING_STEPS)[number]["slug"];

/** Shape of the data we collect across the funnel. */
export type OnboardingData = {
  goal?: string;
  experience?: string;
  plan?: string;
};
