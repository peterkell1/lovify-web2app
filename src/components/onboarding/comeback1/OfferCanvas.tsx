// @ts-nocheck -- preview/QA canvas (not part of the live funnel)
/* Lovify /offer funnel — review canvas.
 * Renders the WHOLE standalone /offer flow at once in labelled phone frames, in
 * the real step order: landing → song-creation chat → email capture → plan
 * picker → create account → success. The /offer funnel is deliberately short
 * (it skips the long quiz/story arc), so this is the entire thing. Preview/QA
 * only — lives at /offer/canvas. The real funnel is /offer. */

import { useState } from 'react';
import type { ReactNode } from 'react';
import { LOVIFY, SANS } from '@/components/onboarding/v3/theme';
import { V3_01_Splash, V3_CaptureEmail, V3_OrderAnnual99, V3_CreateAccount } from './screens';
import { V3_Chat } from './OnboardingChat';
import {
  generateVisionWithFace, buildVisionPrompt, startSong, pollSong, type GeneratedSong,
} from '@/components/onboarding/v3/generation';
import { StartSuccessView } from '@/components/funnel/StartSuccessPage';

const noop = () => {};

// A finished song to populate the reward card on the save screens (mirrors what
// the real flow passes after the song reveal).
const SAMPLE_SONG = { cover: null, title: 'Peaceful and Energized' };

// The song-creation chat — the magic moment of the /offer funnel. Self-runs its
// intro; in the canvas it shows the opening state, and completing it fires a
// REAL song generation (same as the live funnel). Mirrors /comeback1/canvas.
function WChat() {
  const [visionUrl, setVisionUrl] = useState<string | null>(null);
  const [visionState, setVisionState] = useState<'idle' | 'working' | 'done' | 'failed'>('idle');
  const [song, setSong] = useState<GeneratedSong | null>(null);
  const [songState, setSongState] = useState<'idle' | 'working' | 'done' | 'failed'>('idle');
  const [statusLine, setStatusLine] = useState('Composing your melody…');
  return (
    <V3_Chat
      web
      genres={['Pop', 'R&B', 'Soul']}
      onPhoto={(face, ctx) => {
        setVisionState('working');
        const prompt = buildVisionPrompt({
          songAbout: ctx.songAbout,
          scene: ctx.visionScene || ctx.scene,
          detailText: ctx.detail,
        });
        generateVisionWithFace(prompt, face, ctx.songAbout || 'Your Vision', '9:16')
          .then((u) => { setVisionUrl(u); setVisionState('done'); })
          .catch(() => setVisionState('failed'));
      }}
      onComplete={(r) => {
        setSongState('working');
        // The /offer funnel renders with Suno; the canvas uses the default
        // provider — it's only here to preview the chat UI, not the audio.
        startSong({ lyrics: r.lyrics, title: r.title, style: r.soundStyle, voice: r.voice })
          .then((tid) => pollSong(tid, (s) => {
            setStatusLine(s === 'tuning' ? 'Tuning every word to you…' : s === 'streaming' ? 'Almost ready…' : 'Composing your melody…');
          }))
          .then((finished) => { setSong(finished); setSongState('done'); })
          .catch(() => setSongState('failed'));
      }}
      visionUrl={visionUrl}
      visionState={visionState}
      song={song}
      songState={songState}
      songStatusLine={statusLine}
      onSave={noop}
      onBack={noop}
    />
  );
}

const FRAME_W = 340;
const FRAME_H = 736;

const SCREENS: { id: string; label: string; node: ReactNode }[] = [
  { id: '1', label: '1 · Landing (Continue → song chat)', node: <V3_01_Splash onNext={noop} /> },
  { id: '2', label: '2 · Song creation chat (LIVE — makes a real song)', node: <WChat /> },
  { id: '3', label: '3 · Capture email (no price — max emails)', node: <V3_CaptureEmail onBack={noop} onSubmit={noop} savedSong={SAMPLE_SONG} /> },
  { id: '4', label: '4 · Plan picker ($89.99/yr · $17.99/mo)', node: <V3_OrderAnnual99 onBack={noop} onOrder={noop} savedSong={SAMPLE_SONG} email="you@email.com" /> },
  { id: '5', label: '5 · Create account (song saves)', node: <V3_CreateAccount onNext={noop} onBack={noop} /> },
  { id: '6', label: '6 · Success (after RC checkout)', node: <StartSuccessView /> },
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
            {SCREENS.length} screens · landing → song chat → email → plans → account → success. Every screen is live.
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
