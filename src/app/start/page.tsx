'use client';
import dynamic from 'next/dynamic';

// Client-only: the funnel is a browser app (localStorage, audio, Supabase auth),
// so we skip server rendering/prerender for it.
const OnboardingV3Flow = dynamic(
  () => import('@/components/onboarding/v3/OnboardingV3Flow').then((m) => m.OnboardingV3Flow),
  { ssr: false },
);

export default function StartPage() {
  return (
    <div style={{ height: '100dvh' }}>
      <OnboardingV3Flow mode="web" />
    </div>
  );
}
