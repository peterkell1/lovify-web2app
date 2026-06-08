"use client";

import { useRouter } from "next/navigation";

import { OptionCard } from "@/components/onboarding/option-card";
import { ProgressBar } from "@/components/onboarding/progress-bar";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/lib/onboarding/context";
import { ONBOARDING_STEPS } from "@/lib/onboarding/steps";

const OPTIONS = [
  { value: "build", label: "Build something new" },
  { value: "learn", label: "Learn a new skill" },
  { value: "grow", label: "Grow my business" },
];

export default function GoalStep() {
  const router = useRouter();
  const { data, setField } = useOnboarding();

  return (
    <div>
      <ProgressBar current={1} total={ONBOARDING_STEPS.length} />
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">
        {ONBOARDING_STEPS[0].title}
      </h1>

      <div className="space-y-3">
        {OPTIONS.map((opt) => (
          <OptionCard
            key={opt.value}
            label={opt.label}
            selected={data.goal === opt.value}
            onSelect={() => setField("goal", opt.value)}
          />
        ))}
      </div>

      <div className="mt-10 flex justify-end">
        <Button
          disabled={!data.goal}
          onClick={() => router.push("/onboarding/experience")}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
