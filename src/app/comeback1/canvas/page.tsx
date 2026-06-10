'use client';
import dynamic from 'next/dynamic';

// Preview/QA storyboard: renders every comeback1 funnel frame at once in
// labelled phone frames. Client-only (the screens use browser APIs / audio).
// Not part of the live funnel — a design tool at /comeback1/canvas.
const OnboardingComeback1Canvas = dynamic(
  () =>
    import('@/components/onboarding/comeback1/OnboardingComeback1Canvas').then(
      (m) => m.OnboardingComeback1Canvas,
    ),
  { ssr: false },
);

export default function Comeback1CanvasPage() {
  return <OnboardingComeback1Canvas />;
}
