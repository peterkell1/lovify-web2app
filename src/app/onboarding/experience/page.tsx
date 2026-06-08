"use client";

import { useRouter } from "next/navigation";

import { OptionCard } from "@/components/onboarding/option-card";
import { ProgressBar } from "@/components/onboarding/progress-bar";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/lib/onboarding/context";
import { ONBOARDING_STEPS } from "@/lib/onboarding/steps";

const OPTIONS = [
  { value: "beginner", label: "Just getting started" },
  { value: "intermediate", label: "Some experience" },
  { value: "advanced", label: "I know what I'm doing" },
];

export default function ExperienceStep() {
  const router = useRouter();
  const { data, setField } = useOnboarding();

  return (
    <div>
      <ProgressBar current={2} total={ONBOARDING_STEPS.length} />
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">
        {ONBOARDING_STEPS[1].title}
      </h1>

      <div className="space-y-3">
        {OPTIONS.map((opt) => (
          <OptionCard
            key={opt.value}
            label={opt.label}
            selected={data.experience === opt.value}
            onSelect={() => setField("experience", opt.value)}
          />
        ))}
      </div>

      <div className="mt-10 flex justify-between">
        <Button variant="secondary" onClick={() => router.back()}>
          Back
        </Button>
        <Button
          disabled={!data.experience}
          onClick={() => router.push("/onboarding/plan")}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
