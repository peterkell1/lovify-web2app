'use client';
import dynamic from 'next/dynamic';

// Client-only: the funnel is a browser app (localStorage, audio, Supabase auth),
// so we skip server rendering/prerender for it. This is the v2 funnel variant —
// a full copy of the flow/screens that reuses the SAME shared checkout +
// RevenueCat handoff and /start/success page as /start.
const OnboardingV2Flow = dynamic(
  () => import('@/components/onboarding/v2/OnboardingV2Flow').then((m) => m.OnboardingV2Flow),
  { ssr: false },
);

export default function V2Page() {
  return (
    <div style={{ height: '100dvh' }}>
      <OnboardingV2Flow mode="web" />
    </div>
  );
}
