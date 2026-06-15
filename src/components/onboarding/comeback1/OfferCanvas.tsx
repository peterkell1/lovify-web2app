// @ts-nocheck -- preview/QA canvas (not part of the live funnel)
/* Lovify /offer funnel — review canvas ("v2").
 * Renders the WHOLE /offer v2 flow at once in labelled phone frames, in real
 * step order: landing → full persuasion arc (hook → proof → "turn anything into
 * a song") → make song → song chat (in-chat email + Suno) → save your song
 * (single offer) → account → success. Cuts the demo, the genre/time quiz, and
 * the old paywall stack. Preview/QA only — lives at /offer/canvas. */

import { useState } from 'react';
import type { ReactNode } from 'react';
import { LOVIFY, SANS } from '@/components/onboarding/v3/theme';
import {
  V3_DrugHook, V3_DrugReveal, V3_Discovery, V3_Science, V3_Achieve,
  V3_LovifyHelps, V3_05_Promise, V3_04_Story, V3_Referral, V3_Familiarity,
  V3_Proof1, V3_Proof2, V3_WhyBuilt, V3_SongIdeas, V3_MakeSong,
  V3_OrderAnnual99, V3_CreateAccount,
} from './screens';
import { V3_Chat } from './OnboardingChat';
import {
  generateVisionWithFace, buildVisionPrompt, startSong, pollSong, type GeneratedSong,
} from '@/components/onboarding/v3/generation';
import { StartSuccessView } from '@/components/funnel/StartSuccessPage';

const noop = () => {};

// Sample-state wrappers so the tap-to-answer screens render populated.
function WGoals() {
  const [v, setV] = useState<string[]>(['best-self', 'life-love']);
  return <V3_Achieve value={v} setValue={setV} onNext={noop} onBack={noop} />;
}
function WReferral() {
  const [v, setV] = useState('');
  return <V3_Referral value={v} setValue={setV} onNext={noop} onBack={noop} onSkip={noop} />;
}
function WFamiliarity() {
  const [v, setV] = useState('');
  return <V3_Familiarity value={v} setValue={setV} onNext={noop} onBack={noop} />;
}

// A finished song to populate the reward card on the save screens (mirrors what
// the real flow passes after the song reveal).
const SAMPLE_SONG = { cover: null, title: 'Peaceful and Energized' };

// The song-creation chat — the magic moment of the /offer funnel. Self-runs its
// intro; in the canvas it shows the opening state, and completing it fires a
// REAL song generation (same as the live funnel). Mirrors /comeback1/canvas.
function WChat({ collectEmail }: { collectEmail?: boolean }) {
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
      collectEmail={collectEmail}
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
  { id: '01', label: '01 · Hook (opener — loops benefits, music top-right, no back)', node: <V3_DrugHook opener sound onToggleSound={noop} onNext={noop} onBack={noop} onSkip={noop} /> },
  { id: '03', label: '03 · Reveal: it’s music', node: <V3_DrugReveal onNext={noop} onBack={noop} /> },
  { id: '04', label: '04 · Discovery', node: <V3_Discovery onNext={noop} onBack={noop} /> },
  { id: '05', label: '05 · Music changes who you become', node: <V3_Science onNext={noop} onBack={noop} /> },
  { id: '06', label: '06 · What would you like to achieve?', node: <WGoals /> },
  { id: '07', label: '07 · Lovify can help', node: <V3_LovifyHelps onNext={noop} onBack={noop} /> },
  { id: '08', label: '08 · Unlock personalized music', node: <V3_05_Promise onNext={noop} onBack={noop} /> },
  { id: '09', label: '09 · Founder story (trust)', node: <V3_04_Story onNext={noop} onBack={noop} /> },
  { id: '10', label: '10 · Did a pro refer you?', node: <WReferral /> },
  { id: '11', label: '11 · How aware of music’s impact?', node: <WFamiliarity /> },
  { id: '12', label: '12 · Proof: songs got more negative', node: <V3_Proof1 onNext={noop} onBack={noop} /> },
  { id: '13', label: '13 · Proof: saddest generation', node: <V3_Proof2 onNext={noop} onBack={noop} /> },
  { id: '14', label: '14 · The turn', node: <V3_WhyBuilt onNext={noop} onBack={noop} /> },
  { id: '15', label: '15 · Turn anything into a song', node: <V3_SongIdeas onNext={noop} onBack={noop} /> },
  { id: '16', label: '16 · Make your first song (lead-in)', node: <V3_MakeSong onNext={noop} onBack={noop} /> },
  { id: '17', label: '17 · Song chat — Q&A + email + reveal (LIVE)', node: <WChat collectEmail /> },
  { id: '18', label: '18 · Save your song ($99/yr · $17.99/mo)', node: <V3_OrderAnnual99 onBack={noop} onOrder={noop} savedSong={SAMPLE_SONG} email="you@email.com" /> },
  { id: '19', label: '19 · Create account (song saves)', node: <V3_CreateAccount onNext={noop} onBack={noop} /> },
  { id: '20', label: '20 · Success (after RC checkout)', node: <StartSuccessView membership /> },
];

export function OfferCanvas() {
  return (
    <div style={{ minHeight: '100dvh', background: '#EDE6DA', padding: '28px 20px 64px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 22, textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontFamily: SANS, fontWeight: 800, fontSize: 26, letterSpacing: -0.5, color: LOVIFY.ink }}>
            Lovify · /offer funnel (v2)
          </h1>
          <p style={{ margin: '6px 0 0', fontFamily: SANS, fontSize: 14, color: LOVIFY.sub }}>
            {SCREENS.length} screens · landing → persuasion arc → make song → song chat (email in-chat) → save your song → account → success.
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
