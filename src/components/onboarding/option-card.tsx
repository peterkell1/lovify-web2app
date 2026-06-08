"use client";

import { clsx } from "@/lib/cn";

/**
 * A selectable card used for single-choice onboarding questions.
 */
export function OptionCard({
  label,
  description,
  selected,
  onSelect,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={clsx(
        "w-full rounded-2xl border p-5 text-left transition",
        selected
          ? "border-foreground ring-2 ring-foreground"
          : "border-black/10 hover:border-black/30 dark:border-white/15 dark:hover:border-white/40"
      )}
    >
      <span className="block font-medium">{label}</span>
      {description ? (
        <span className="mt-1 block text-sm opacity-60">{description}</span>
      ) : null}
    </button>
  );
}
