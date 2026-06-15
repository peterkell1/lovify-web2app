// @ts-nocheck -- preview/QA canvas (not part of the live funnel)
/* Lovify /offer funnel — review canvas.
 * Renders the standalone /offer screens (email-first capture → plan picker →
 * success) at once in labelled phone frames, with sample data, so the upfront
 * "save your song" flow can be scanned at a glance. Preview/QA only — lives at
 * /offer/canvas. The real funnel is /offer. */

import type { ReactNode } from 'react';
import { LOVIFY, SANS } from '@/components/onboarding/v3/theme';
import { V3_CaptureEmail, V3_OrderAnnual99 } from './screens';
import { StartSuccessView } from '@/components/funnel/StartSuccessPage';

const noop = () => {};

// A finished song to populate the reward card (mirrors what the real flow
// passes after the song reveal).
const SAMPLE_SONG = { cover: null, title: 'Peaceful and Energized' };

const FRAME_W = 340;
const FRAME_H = 736;

const SCREENS: { id: string; label: string; node: ReactNode }[] = [
  {
    id: '1',
    label: '1 · Capture email (no price — max emails)',
    node: <V3_CaptureEmail onBack={noop} onSubmit={noop} savedSong={SAMPLE_SONG} />,
  },
  {
    id: '2',
    label: '2 · Plan picker ($89.99/yr · $17.99/mo)',
    node: <V3_OrderAnnual99 onBack={noop} onOrder={noop} savedSong={SAMPLE_SONG} email="you@email.com" />,
  },
  {
    id: '3',
    label: '3 · Success (after RC checkout)',
    node: <StartSuccessView />,
  },
];

export function OfferCanvas() {
  return (
    <div style={{ minHeight: '100dvh', background: '#EDE6DA', padding: '28px 20px 64px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 22, textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontFamily: SANS, fontWeight: 800, fontSize: 26, letterSpacing: -0.5, color: LOVIFY.ink }}>
            Lovify · /offer funnel
          </h1>
          <p style={{ margin: '6px 0 0', fontFamily: SANS, fontSize: 14, color: LOVIFY.sub }}>
            Email-first save flow. Every screen is live — type in the fields to try them.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, justifyContent: 'center' }}>
          {SCREENS.map((s) => (
            <div key={s.id} style={{ width: FRAME_W }}>
              <div style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: LOVIFY.inkSoft, letterSpacing: 0.3, marginBottom: 8, paddingLeft: 4 }}>
                {s.label}
              </div>
              <div
                style={{
                  width: FRAME_W, height: FRAME_H,
                  borderRadius: 30, overflow: 'hidden',
                  background: LOVIFY.bg,
                  border: '1px solid rgba(58, 42, 34, 0.12)',
                  boxShadow: '0 22px 48px -24px rgba(58, 42, 34, 0.5)',
                }}
              >
                {s.node}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
