'use client';
import dynamic from 'next/dynamic';

// Standalone "$99/year upfront" offer funnel — same make-a-song-and-hear-it
// flow as /comeback1, but the $1-trial paywalls are replaced by a single
// $99/year order page (email capture → RevenueCat checkout). Off the live A/B
// split; point a test ad here. Client-only like the other funnel routes.
const OnboardingComeback1Flow = dynamic(
  () => import('@/components/onboarding/comeback1/OnboardingComeback1Flow').then((m) => m.OnboardingComeback1Flow),
  { ssr: false },
);

export default function OfferPage() {
  return (
    <div style={{ height: '100dvh' }}>
      <OnboardingComeback1Flow mode="web" offer="annual99" />
    </div>
  );
}
