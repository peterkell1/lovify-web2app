'use client';
import dynamic from 'next/dynamic';

// The home page IS the comeback1 funnel — visitors land straight in the flow
// (no interstitial landing). /comeback1 serves the same funnel; both paths
// share the same localStorage persistence, so progress carries across them.
// Client-only: the funnel is a browser app (localStorage, audio, Supabase auth).
const OnboardingComeback1Flow = dynamic(
  () => import('@/components/onboarding/comeback1/OnboardingComeback1Flow').then((m) => m.OnboardingComeback1Flow),
  { ssr: false },
);

export default function Home() {
  return (
    <div style={{ height: '100dvh' }}>
      <OnboardingComeback1Flow mode="web" />
    </div>
  );
}
