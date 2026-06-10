'use client';
import dynamic from 'next/dynamic';

// Client-only: the funnel is a browser app (localStorage, audio, Supabase auth),
// so we skip server rendering/prerender for it. This is the v2 funnel variant —
// a full copy of the flow/screens that reuses the SAME shared checkout +
// RevenueCat handoff and /start/success page as /start.
const OnboardingComeback1Flow = dynamic(
  () => import('@/components/onboarding/comeback1/OnboardingComeback1Flow').then((m) => m.OnboardingComeback1Flow),
  { ssr: false },
);

export default function Comeback1Page() {
  return (
    <div style={{ height: '100dvh' }}>
      <OnboardingComeback1Flow mode="web" />
    </div>
  );
}
