'use client';
import dynamic from 'next/dynamic';

// Preview/QA storyboard for the /offer funnel: renders the email-first save
// flow (capture email → plan picker → success) in labelled phone frames.
// Client-only (the screens use browser APIs). Not part of the live funnel —
// a design tool at /offer/canvas. The real funnel is /offer.
const OfferCanvas = dynamic(
  () => import('@/components/onboarding/comeback1/OfferCanvas').then((m) => m.OfferCanvas),
  { ssr: false },
);

export default function OfferCanvasPage() {
  return <OfferCanvas />;
}
