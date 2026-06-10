'use client';
import dynamic from 'next/dynamic';

// Shareable deep link: drops the visitor STRAIGHT into the comeback song chat
// (skipping the story/quiz screens), then continues through the reveal →
// paywall → account like the full funnel. Great for "just try making a song"
// shares and for testing the core make-song → purchase loop.
const OnboardingComeback1Flow = dynamic(
  () => import('@/components/onboarding/comeback1/OnboardingComeback1Flow').then((m) => m.OnboardingComeback1Flow),
  { ssr: false },
);

export default function SongPage() {
  return (
    <div style={{ height: '100dvh' }}>
      <OnboardingComeback1Flow mode="web" startAt="song_chat" />
    </div>
  );
}
