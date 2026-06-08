"use client";

import { useRouter } from "next/navigation";

import { OptionCard } from "@/components/onboarding/option-card";
import { ProgressBar } from "@/components/onboarding/progress-bar";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/lib/onboarding/context";
import { ONBOARDING_STEPS } from "@/lib/onboarding/steps";

const PLANS = [
  { value: "monthly", label: "Monthly", description: "$12 / month" },
  {
    value: "yearly",
    label: "Yearly",
    description: "$96 / year — save 33%",
  },
];

export default function PlanStep() {
  const router = useRouter();
  const { data, setField } = useOnboarding();

  function handleCheckout() {
    // STRIPE: not wired up yet. When ready, POST the selected plan +
    // collected onboarding data to a checkout Route Handler that creates a
    // Stripe Checkout Session, then redirect to its URL. For now we send the
    // user to the success page so the funnel is walkable end-to-end.
    router.push("/success");
  }

  return (
    <div>
      <ProgressBar current={3} total={ONBOARDING_STEPS.length} />
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">
        {ONBOARDING_STEPS[2].title}
      </h1>

      <div className="space-y-3">
        {PLANS.map((plan) => (
          <OptionCard
            key={plan.value}
            label={plan.label}
            description={plan.description}
            selected={data.plan === plan.value}
            onSelect={() => setField("plan", plan.value)}
          />
        ))}
      </div>

      <div className="mt-10 flex justify-between">
        <Button variant="secondary" onClick={() => router.back()}>
          Back
        </Button>
        <Button disabled={!data.plan} onClick={handleCheckout}>
          Continue to checkout
        </Button>
      </div>

      <p className="mt-6 text-center text-xs opacity-50">
        Payments are not yet connected — see README for Stripe setup.
      </p>
    </div>
  );
}
