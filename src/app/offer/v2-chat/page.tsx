'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';

// Focused QA route for the song-chat **V2** — drops you straight into the chat
// window (the `song_chat` step) so you can test the conversation + vision reveal
// without walking the whole funnel. Every visit RESETS: it clears any saved
// progress and forces the v2 arm, so each reload is a clean run of the new chat.
//
// This is a test harness, not a live entry point — don't point ads here.
//
// NB: we deliberately do NOT import from session.ts here — that module pulls in
// the pixel/supabase clients, which touch localStorage at module load and break
// the static prerender. The two storage keys are inlined instead.
const SNAPSHOT_KEY = 'lov-onboarding-comeback1-snapshot-web'; // mirrors session.ts snapshotKey('web')
const CHAT_VARIANT_KEY = 'lov-chat-variant';                  // mirrors chatVariant.ts

const OnboardingComeback1Flow = dynamic(
  () => import('@/components/onboarding/comeback1/OnboardingComeback1Flow').then((m) => m.OnboardingComeback1Flow),
  { ssr: false },
);

export default function OfferV2ChatTestPage() {
  // Runs once, synchronously, on first client render — before the dynamically
  // imported flow mounts and reads its snapshot / chat variant. So by the time
  // the flow boots, there's no stale snapshot and the arm is pinned to v2.
  // Guard on localStorage itself: the prerender env can define a partial
  // `window` without it, so a `typeof window` check isn't enough.
  useState(() => {
    if (typeof localStorage === 'undefined') return null;
    try {
      localStorage.removeItem(SNAPSHOT_KEY);          // fresh chat every visit
      localStorage.setItem(CHAT_VARIANT_KEY, 'v2');   // force the V2 arm
    } catch { /* ignore */ }
    return null;
  });
  return (
    <div style={{ height: '100dvh' }}>
      <OnboardingComeback1Flow mode="web" offer="annual99" startAt="song_chat" />
    </div>
  );
}
