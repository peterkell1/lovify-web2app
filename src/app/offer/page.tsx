'use client';
import dynamic from 'next/dynamic';

// Standalone "$99/year upfront" offer funnel — same make-a-song-and-hear-it
// flow as /comeback1, but the $1-trial paywalls are replaced by a single
// $99/year order page → RevenueCat checkout. Off the live A/B split; point a
// test ad here. Client-only like the other funnel routes.
//
// Deep-link: /offer?at=<step_id> jumps straight to that step (for demos / QA).
// e.g. /offer?at=order_annual99 → the "Save your song" page.
const OnboardingComeback1Flow = dynamic(
  () => import('@/components/onboarding/comeback1/OnboardingComeback1Flow').then((m) => m.OnboardingComeback1Flow),
  { ssr: false },
);

export default function OfferPage() {
  const startAt = typeof window !== 'undefined'
    ? (new URLSearchParams(window.location.search).get('at') || undefined)
    : undefined;
  return (
    <div style={{ height: '100dvh' }}>
      <OnboardingComeback1Flow mode="web" offer="annual99" startAt={startAt} />
    </div>
  );
}
