// @ts-nocheck -- ported preview/QA canvas (not part of the live funnel)
/* Lovify Onboarding v3 — review canvas.
 * Renders every screen at once in labelled phone frames so the whole flow
 * can be scanned at a glance. Mirrors the REAL flow order (incl. the Socratic
 * opener and the song chat). Preview/QA only — not part of the live funnel. */

import { useState } from 'react';
import type { ReactNode } from 'react';
import { LOVIFY, SANS } from '@/components/onboarding/v3/theme';
import {
  V3_01_Splash,
  V3_DrugHook, V3_DrugReveal, V3_Discovery, V3_Science, V3_Achieve, V3_LovifyHelps,
  V3_FeatureChat,
  V3_Familiarity, V3_Proof1, V3_Proof2, V3_WhyBuilt, V3_Referral,
  V3_04_Story, V3_05_Promise,
  V3_10_Deepen, V3_TimeReassurance,
  V3_11_LeanedOn, V3_Genres,
  V3_MakeSong,
} from './screens';
import { V3_Chat, type ChatPersist } from './OnboardingChat';
import { V3_22_Trial, V3_TrialOffer, V3_TrialReminder, V3_TrialPrice, V3_23_Paywall, V3_CreateAccount } from './screens';
import { StartSuccessView } from '@/components/funnel/StartSuccessPage';
import { PaymentSheet } from '@/components/onboarding/v3/PaymentSheet';

const noop = () => {};

// ── Sample-state wrappers so selection screens render populated ──
function WDeepen() {
  const [v, setV] = useState('Some, but I want more');
  return <V3_10_Deepen value={v} setValue={setV} onNext={noop} onBack={noop} />;
}
function WLeaned() {
  const [v, setV] = useState<string[]>(['Working out', 'Driving / commuting']);
  return <V3_11_LeanedOn value={v} setValue={setV} onNext={noop} onBack={noop} />;
}
function WGenres() {
  const [v, setV] = useState<string[]>(['Pop', 'R&B', 'Soul']);
  return <V3_Genres value={v} setValue={setV} onNext={noop} onBack={noop} />;
}
function WAchieve() {
  const [v, setV] = useState<string[]>(['best-self', 'life-love']);
  return <V3_Achieve value={v} setValue={setV} onNext={noop} onBack={noop} />;
}
function WFamiliarity() {
  const [v, setV] = useState('');
  return <V3_Familiarity value={v} setValue={setV} onNext={noop} onBack={noop} />;
}
function WReferral() {
  const [v, setV] = useState('');
  return <V3_Referral value={v} setValue={setV} onNext={noop} onBack={noop} onSkip={noop} />;
}
// The song chat self-runs its intro; in the canvas it shows the opening
// "what should I call you?" state — enough to preview the chat UI.
// Interactive paywall frames so the Apple-style payment sheet is testable
// right in the canvas (tap the CTA → the slide-up opens). The email step
// works; "Continue to payment" needs the create-web-payment-intent fn deployed.
function WTrialPrice() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <V3_TrialPrice onNext={noop} onBack={noop} onBuy={() => setOpen(true)} />
      <PaymentSheet open={open} planId="yearly_premium_trial" isTrial onClose={() => setOpen(false)} />
    </div>
  );
}
function WPaywallPlans() {
  const [sheet, setSheet] = useState<{ open: boolean; planId: string }>({ open: false, planId: '' });
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <V3_23_Paywall onNext={noop} onBack={noop} onBuy={(planId) => setSheet({ open: true, planId })} />
      <PaymentSheet open={sheet.open} planId={sheet.planId} isTrial={sheet.planId === 'yearly_premium_trial'} onClose={() => setSheet((s) => ({ ...s, open: false }))} />
    </div>
  );
}
function WChat() {
  return <V3_Chat web genres={['Pop', 'R&B', 'Soul']} onPhoto={noop} onComplete={noop} onBack={noop} />;
}
// The song chat in its finished, REVEALED state so the canvas shows the
// inline "wow moment" (vision + two songs + Save) that replaced the old
// separate reveal screen.
const REVEAL_PERSIST: ChatPersist = {
  msgs: [
    { id: 'm1', role: 'bot', kind: 'text', text: "Here's your song — this is what we'll plant in your mind. 🧠" },
    { id: 'm2', role: 'user', kind: 'text', text: 'Make my song 🎶' },
    { id: 'm3', role: 'bot', kind: 'text', text: "Let's make it real. 🎶" },
  ],
  phase: 'generating', mode: 'busy', vibes: [],
  data: {
    name: 'Alex', songAbout: 'Who I want to be', detail: '', scene: '', why: '',
    soundStyle: 'Empowering Pop Anthem', voice: 'Female voice',
    face: null, faces: [], visionScene: '', lyrics: '', title: 'Palace at Golden Hour',
  },
  nextId: 4, done: true,
};
function WChatReveal() {
  return (
    <V3_Chat
      web
      genres={['Pop']}
      persisted={REVEAL_PERSIST}
      onPhoto={noop}
      onComplete={noop}
      visionUrl={null}
      visionState="failed"
      song={{ title: 'Palace at Golden Hour', audio_url: 'preview' }}
      songState="done"
      songStatusLine=""
      onSave={noop}
      onBack={noop}
    />
  );
}
// The feature-demo chat self-runs; in the canvas it plays its scripted intro.
function WFeatureChat() {
  return <V3_FeatureChat onNext={noop} onBack={noop} />;
}

const SCREENS: { id: string; label: string; node: ReactNode }[] = [
  { id: '01', label: '01 · Home (CTA + sign-in)', node: <V3_01_Splash onNext={noop} onSkip={noop} /> },
  // ── "Imagine a drug → music" opener (02–07) ──
  { id: '02', label: '02 · Hook: imagine a drug', node: <V3_DrugHook onNext={noop} onBack={noop} onSkip={noop} /> },
  { id: '03', label: '03 · Reveal: the drug is music', node: <V3_DrugReveal onNext={noop} onBack={noop} /> },
  { id: '04', label: '04 · Discovery (remarkable)', node: <V3_Discovery onNext={noop} onBack={noop} /> },
  { id: '05', label: '05 · Music changes who you become', node: <V3_Science onNext={noop} onBack={noop} /> },
  { id: '06', label: '06 · What would you like to achieve?', node: <WAchieve /> },
  { id: '07', label: '07 · Lovify can help you with that', node: <V3_LovifyHelps onNext={noop} onBack={noop} /> },
  // ── Promise → founder → social-proof referral ──
  { id: '08', label: '08 · Unlock personalized music', node: <V3_05_Promise onNext={noop} onBack={noop} /> },
  { id: '09', label: '09 · Founder (credibility)', node: <V3_04_Story onNext={noop} onBack={noop} /> },
  { id: '10', label: '10 · Did a professional refer you?', node: <WReferral /> },
  // ── Familiarity → proof (cited charts) → the turn ──
  { id: '11', label: '11 · How aware of music’s impact?', node: <WFamiliarity /> },
  { id: '12', label: '12 · Proof: 20k songs got more negative', node: <V3_Proof1 onNext={noop} onBack={noop} /> },
  { id: '13', label: '13 · Proof: saddest generation yet', node: <V3_Proof2 onNext={noop} onBack={noop} /> },
  { id: '14', label: '14 · The loop runs both ways (turn)', node: <V3_WhyBuilt onNext={noop} onBack={noop} /> },
  // ── Roleplay demo chat ──
  { id: '15', label: '15 · How it works (roleplay demo)', node: <WFeatureChat /> },
  // ── Quiz (trimmed) ──
  { id: '16', label: '16 · Time', node: <WDeepen /> },
  { id: '17', label: '17 · Music reassurance', node: <V3_TimeReassurance onNext={noop} onBack={noop} /> },
  { id: '18', label: '18 · When you listen to music', node: <WLeaned /> },
  { id: '19', label: '19 · Favorite genres', node: <WGenres /> },
  { id: '20', label: '20 · Make your first song', node: <V3_MakeSong onNext={noop} onBack={noop} /> },
  // ── Song chat (intro) + the inline reveal it now ends with ──
  { id: '21', label: '21 · Song chat (personalized)', node: <WChat /> },
  { id: '22', label: '22 · Song chat → your song (reveal)', node: <WChatReveal /> },
  // ── Paywall ──
  { id: '23', label: '23 · Paywall: get full access', node: <V3_22_Trial onNext={noop} onBack={noop} /> },
  { id: '24', label: '24 · Paywall: $1 first week', node: <V3_TrialOffer onNext={noop} onBack={noop} /> },
  { id: '25', label: '25 · Paywall: we’ll remind you', node: <V3_TrialReminder onNext={noop} onBack={noop} /> },
  { id: '26', label: '26 · Paywall: $1 first week (price) · tap to test 💳', node: <WTrialPrice /> },
  { id: '27', label: '27 · Paywall: choose your plan · tap to test 💳', node: <WPaywallPlans /> },
  // ── Required account creation (song gets saved), then into the app ──
  { id: '28', label: '28 · Create a Lovify account', node: <V3_CreateAccount onNext={noop} onBack={noop} /> },
  // ── Web funnel only: after account → download page (/start/success) ──
  { id: '29', label: '29 · Download the app (web funnel)', node: <StartSuccessView /> },
];

const FRAME_W = 340;
const FRAME_H = 736;

export function OnboardingComeback1Canvas() {
  return (
    <div style={{ minHeight: '100dvh', background: '#EDE6DA', padding: '28px 20px 64px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 22, textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontFamily: SANS, fontWeight: 800, fontSize: 26, letterSpacing: -0.5, color: LOVIFY.ink }}>
            Lovify · Onboarding flow
          </h1>
          <p style={{ margin: '6px 0 0', fontFamily: SANS, fontSize: 14, color: LOVIFY.sub }}>
            {SCREENS.length} screens. Every screen is live — tap to try selections.
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
