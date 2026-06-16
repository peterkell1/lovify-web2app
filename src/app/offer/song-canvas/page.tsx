'use client';
import dynamic from 'next/dynamic';

// Storyboard of the /offer song-creation chat: every question, the bot prompts
// in between, what each step captures, and the 4 AI generation prompts behind
// it. A design/optimization reference — NOT the live funnel (that's /offer).
const SongCanvas = dynamic(
  () => import('@/components/onboarding/comeback1/SongCanvas').then((m) => m.SongCanvas),
  { ssr: false },
);

export default function SongCanvasPage() {
  return <SongCanvas />;
}
