// @ts-nocheck -- ported from the (non-strict) Lovify app repo; web2app funnel code
/* Lovify Onboarding v3 — flow controller.
 * Drives the 27-screen click-through: step navigation, per-screen
 * selection state, and slide transitions. Self-contained preview build;
 * no auth / persistence wired yet (that's for the live integration). */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LOVIFY } from '@/components/onboarding/v3/theme';
const ambientLoop = '/assets/onboarding/v3/ambient-loop.mp3';
import {
  V3_01_Splash,
  V3_DrugHook, V3_DrugReveal, V3_Discovery, V3_Science, V3_Achieve, V3_LovifyHelps,
  V3_FeatureChat,
  V3_Familiarity, V3_Proof1, V3_Proof2, V3_WhyBuilt, V3_SongIdeas, V3_ComebackMethod, V3_Tracking, V3_Review, V3_Referral,
  V3_04_Story, V3_05_Promise,
  V3_10_Deepen, V3_TimeReassurance,
  V3_11_LeanedOn, V3_Genres, V3_14_Source, V3_16_Nudge,
  V3_MakeSong,
  V3_22_Trial, V3_TrialOffer, V3_TrialReminder, V3_TrialPrice, V3_23_Paywall,
  V3_CreateAccount,
  ONBOARDING_PRELOAD_IMAGES,
} from './screens';
import { V3_Chat, type ChatPersist } from './OnboardingChat';
import {
  generateVisionWithFace, buildVisionPrompt, startSong as startSongApi, pollSong,
  type GeneratedSong,
} from '@/components/onboarding/v3/generation';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { capturePostHogEvent, initPostHog, registerAdAttribution } from '@/lib/posthog';
import { trackPaywallShown, trackPaywallCompleted } from '@/lib/track';
import { purchaseViaIAP } from '@/lib/iapFlow';
import { PaymentSheet } from '@/components/onboarding/v3/PaymentSheet';
import { HeadingScaleContext } from '@/components/onboarding/v3/primitives';
import {
  loadSnapshot, saveSnapshot, clearSnapshot,
  ensureSession, saveSessionProgress, stageSong, clearStoredSessionId, saveSessionAttribution,
} from './session';
import { stashOnboardingSessionId, claimOnboardingSession } from '@/lib/onboardingClaim';
import { buildRcCheckoutUrl } from '@/lib/rcCheckout';
import { initMetaPixel, trackPixel } from '@/lib/metaPixel';

// Funnel step ids (one per screen, in flow order) so PostHog can show
// drop-off per screen. Keep in sync with the switch() below. This is the
// FULL iOS-app flow (31 screens). The web funnel (/start) renders a trimmed
// subset — WEB_OMIT below removes the app-store-only / web-irrelevant screens
// (ATT prompt, App Store review, paid-traffic attribution, daily nudge).
const APP_STEP_IDS = [
  'home', 'hook_imagine_drug', 'reveal_music', 'discovery', 'science', 'goals',
  'lovify_helps', 'promise', 'founder_story', 'referral', 'familiarity',
  'proof_music_negative', 'proof_more_depressed', 'the_turn',
  'song_ideas', 'comeback_method', 'demo_chat',
  'att_tracking', 'review_prompt', 'time', 'time_reassurance', 'when_you_listen',
  'genres', 'attribution', 'daily_nudge', 'make_first_song', 'song_chat',
  'paywall_benefits', 'paywall_7days_free', 'paywall_reminder', 'paywall_price',
  'paywall_plans', 'create_account',
] as const;

// Screens shown only in the native iOS app, omitted from the web funnel:
//  • att_tracking — Apple's App Tracking Transparency prompt (IDFA; iOS-only)
//  • review_prompt — App Store rating prompt (iOS-only)
//  • attribution  — "where did you hear about us" (paid-web traffic is already
//                   attributed via the Meta pixel / CAPI, so it's noise on web)
//  • daily_nudge  — push-notification opt-in (web has no push here)
const WEB_OMIT = new Set<string>(['att_tracking', 'review_prompt', 'attribution', 'daily_nudge']);

type GenSlot = 'idle' | 'working' | 'done' | 'failed';

interface FlowState {
  achieve: string[];    // "what would you like to achieve?" goals from the opener (multi)
  familiarity: string;  // how familiar are you with personalized music? (single)
  referral: string;     // did a professional refer you? (single)
  joy: string;          // joy baseline (single)
  goals: string[];      // what can we help with (multi, max 3)
  time: string;         // how much time to create more joy (single)
  pressPlay: string[];  // when do you usually listen to music (multi)
  genres: string[];     // favorite genres of sound (multi)
  source: string;       // attribution
  name: string;         // their first name, captured in the song chat
  // The three comeback answers (song chat) — the raw material for the song.
  pain: string;         // Q1: the life they hate right now (vented, free text)
  actions: string;      // Q2: the action steps they'd give someone they love
  dream: string;        // Q3: the amazing life on the other side
  // Legacy fields, kept populated via mapping for analytics/plumbing compat.
  songAbout: string;    // 'My comeback'
  detailText: string;   // = actions
  scene: string;        // = dream
  why: string;          // = pain
  soundStyle: string;   // what your song should sound like (single + free type)
  voice: string;        // who should sing your anthem (single)
  photos: (string | null)[]; // [you, +3 others] as data URLs — face feeds the vision generator
  lyrics: string;       // AI-written (or edited) lyrics, fed to Mureka
  lyricsTitle: string;  // AI-written song title
  savedVersion: number | null; // which song version they tapped Save on (0/1)
}

const initialState: FlowState = {
  achieve: [], familiarity: '', referral: '',
  joy: '', goals: [], time: '', pressPlay: [], genres: [], source: '', name: '',
  pain: '', actions: '', dream: '',
  songAbout: '', detailText: '', scene: '', why: '', soundStyle: '', voice: '',
  photos: [null, null, null, null],
  lyrics: '', lyricsTitle: '',
  savedVersion: null,
};

// App flow = 31 screens, web flow = 27 (the 4 WEB_OMIT screens dropped). The
// switch() below renders by step id (not numeric index) so the two flows share
// one renderer while differing only in which ids appear in the active list.
// app order: home → drug→music opener (1–6) → promise → founder → referral →
// familiarity → 2-beat proof → "personalized music" turn → demo CHAT → ATT →
// review → quiz (time, reassurance, listening, genres, attribution, nudge) →
// make-song → song chat → paywall (benefits → 7-days-free → reminder → price →
// plans) → create account.

export function OnboardingComeback1Flow({ mode = 'app', startAt }: { mode?: 'app' | 'web'; startAt?: string } = {}) {
  // Active step list for this surface: the full app flow, or the trimmed web
  // funnel. TOTAL + the switch() both key off this, so adding/removing a screen
  // is a one-line change to APP_STEP_IDS / WEB_OMIT.
  const stepIds = useMemo(
    () => (mode === 'web' ? APP_STEP_IDS.filter((id) => !WEB_OMIT.has(id)) : (APP_STEP_IDS as readonly string[])),
    [mode],
  );
  const TOTAL = stepIds.length;

  // ── Meta Pixel + PostHog boot WITH the funnel (web) ──
  // Without this, fbq doesn't exist until /start/success (PageView /
  // ViewContent / Lead silently no-op and the _fbp cookie is never set,
  // degrading the server-side CAPI Purchase match), and every
  // capturePostHogEvent() in the funnel no-ops behind initPostHog's guard.
  // registerAdAttribution stamps fbclid/utm_* on every PostHog event so the
  // funnel can be broken down per ad; funnel_landed is the campaign-side
  // anchor event for the conversion funnel.
  const landedRef = useRef(false);
  useEffect(() => {
    if (mode !== 'web') return;
    initMetaPixel();
    initPostHog();
    registerAdAttribution();
    if (!landedRef.current) {
      landedRef.current = true;
      capturePostHogEvent('funnel_landed', { flow: 'onboarding_comeback1' });
    }
  }, [mode]);

  // ── Eagerly preload every illustration on mount (web) ──
  // On a phone over cellular, fetching each hero only when its screen mounts
  // causes a visible pop-in. Kick off all downloads immediately and decode()
  // them so they're painted-ready by the time the user swipes there. Native
  // bundles its assets locally (already instant), so this is web-only.
  useEffect(() => {
    if (mode !== 'web') return;
    ONBOARDING_PRELOAD_IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
      // decode() warms the image so the first paint is instant; ignore failures
      // (unsupported / already-cached) — the .src assignment alone still caches.
      img.decode?.().catch(() => {});
    });
  }, [mode]);

  // ── Restore a saved run (Phase 1: step persistence) ──
  // A refresh or return-to-tab resumes exactly where the user left off — same
  // step, same answers, same chat transcript — on web AND in the iOS app.
  const restored = useMemo(() => loadSnapshot<Partial<FlowState>, ChatPersist>(mode), [mode]);

  // Deep-link entry (e.g. /song → startAt="song_chat"): start the run at that
  // step. A saved run still resumes, but never BEFORE the deep-linked step —
  // a share link should always land its recipient at the intended screen.
  const [step, setStep] = useState(() => {
    const startIndex = startAt ? Math.max(0, stepIds.indexOf(startAt)) : 0;
    return Math.max(restored?.step ?? 0, startIndex);
  }); // 0-based index into the screens
  const [dir, setDir] = useState(1); // 1 forward, -1 back
  // Merge over initialState so fields dropped from the snapshot (photos) are
  // present, and a future-added field defaults sanely on an older snapshot.
  const [state, setState] = useState<FlowState>(() => ({ ...initialState, ...(restored?.state ?? {}) }));

  // ── Ambient soundtrack — owned here so it plays continuously across every
  // step (not just the landing). Autoplay is usually blocked until a gesture,
  // so we also kick it off on the first interaction anywhere in the flow.
  // `sound` is the user's *intent* (do they want music?). `playing` mirrors the
  // <audio> element's real state — browsers block autoplay until a gesture, so
  // on first load `sound` can be true while nothing is actually playing. The
  // toggle icon must reflect `playing`, not `sound`, or it lies (shows "on"
  // while silent until the first tap unblocks playback).
  const [sound, setSound] = useState(true);
  const [playing, setPlaying] = useState(false);
  // Web-funnel payment sheet (Apple Pay / card slide-up).
  const [paySheet, setPaySheet] = useState<{ open: boolean; planId: string }>({ open: false, planId: '' });
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = 0.4;
    // Keep `playing` honest by mirroring the element's own play/pause events.
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    const tryPlay = () => { if (sound) a.play().catch(() => {}); };
    tryPlay();
    // Autoplay is usually blocked until a gesture, so retry on the first
    // interaction anywhere in the flow (Continue, the toggle, etc.).
    const onFirst = () => { tryPlay(); window.removeEventListener('pointerdown', onFirst); };
    window.addEventListener('pointerdown', onFirst);
    return () => {
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      window.removeEventListener('pointerdown', onFirst);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (sound) a.play().catch(() => {}); else a.pause();
  }, [sound]);

  const _router = useRouter(); const navigate = (to: string) => _router.push(to);
  const { signInWithApple, signUpWithEmail, signInWithEmail } = useAuth();

  // ── PostHog funnel instrumentation ──
  // Fire flow_started once, then step_viewed on every screen so PostHog can
  // chart drop-off from first open all the way to account creation. Milestone
  // events (paywall_shown) get their own names for a clean headline funnel.
  // All no-op until PostHog is initialised (real token in production).
  const surface = mode === 'web' ? 'web' : 'app';
  const flowStartedRef = useRef(false);
  useEffect(() => {
    if (!flowStartedRef.current) {
      flowStartedRef.current = true;
      capturePostHogEvent('onboarding_flow_started', { flow: 'onboarding_comeback1', surface, total_steps: TOTAL });
    }
    const stepId = stepIds[step] ?? `step_${step}`;
    capturePostHogEvent('onboarding_step_viewed', {
      flow: 'onboarding_comeback1', surface, step_id: stepId, step_index: step, total_steps: TOTAL,
    });
    if (stepId === 'paywall_benefits') {
      // Fires PostHog paywall_shown + native FB/AppsFlyer (app side).
      trackPaywallShown({ source: 'onboarding_trial' });
      // Web funnel: the native FB SDK no-ops on web, so fire the browser pixel
      // ViewContent directly for go.trylovify.com ad optimisation.
      trackPixel('ViewContent', { content_name: 'paywall', content_category: 'subscription' });
      // Canonical funnel-step name the ads dashboard builds its funnel on.
      capturePostHogEvent('paywall_viewed', { flow: 'onboarding_comeback1', surface });
    }
  }, [step]);

  const set = useCallback(<K extends keyof FlowState>(key: K, value: FlowState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
  }, []);

  // Latest answers, read by the per-step server-progress effect without making
  // `state` a dependency (we only want to push on step change, not keystroke).
  const stateRef = useRef(state);
  stateRef.current = state;

  // ── Magic-moment generation, PRE-WARMED and persisted here in the parent ──
  // Lives above the screens so it survives back/forward navigation and never
  // restarts or loses a finished song. Vision starts after the photo step;
  // the song starts the moment lyrics are ready.
  const [visionUrl, setVisionUrl] = useState<string | null>(null);
  const [visionState, setVisionState] = useState<GenSlot>('idle');
  const [song, setSong] = useState<GeneratedSong | null>(null);
  const [songState, setSongState] = useState<GenSlot>('idle');
  const [songStatusLine, setSongStatusLine] = useState('Composing your melody…');
  // Guards keyed by input so we only generate once per distinct request.
  const visionKeyRef = useRef<string | null>(null);
  const songKeyRef = useRef<string | null>(null);
  // Saved chat transcript/answers so the song chat resumes where the user left
  // off if they navigate back into it from the reveal. Seeded from the restored
  // snapshot so a refresh keeps the conversation intact too.
  const chatRef = useRef<ChatPersist | null>(restored?.chat ?? null);
  // Force a re-render after the chat ref mutates (so the snapshot effect and
  // song-staging see the latest transcript). chatRef stays the source of truth.
  const [chatTick, setChatTick] = useState(0);

  // ── Server-side session linkage (Phase 2/4) ──
  // One anonymous funnel_session id threads the whole run: progress, the staged
  // song, and — at /signup — the account that claims it. Created once on mount
  // (reusing the stored id on a refresh), held in a ref so handlers read it
  // without re-rendering. Null when the backend is unreachable (preview builds),
  // in which case the flow degrades to local-only persistence.
  const sessionIdRef = useRef<string | null>(restored?.sessionId ?? null);
  const [sessionId, setSessionId] = useState<string | null>(restored?.sessionId ?? null);
  useEffect(() => {
    let cancelled = false;
    ensureSession(surface).then((id) => {
      if (cancelled || !id) return;
      sessionIdRef.current = id;
      setSessionId(id);
    });
    return () => { cancelled = true; };
    // surface is stable for the component's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist the run locally on every change (Phase 1) ──
  // Debounced so rapid taps don't thrash localStorage. `chatTick` is in the dep
  // list so a chat-transcript mutation (which lives in chatRef) re-saves too.
  // `photos` are dropped from BOTH persistence paths — base64 data URLs are
  // multi-MB (they'd blow the localStorage quota and bloat the session jsonb)
  // and aren't needed to resume; the chat re-collects the photo if revisited.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const { photos: _photos, ...persistable } = state;
      saveSnapshot<Partial<FlowState>, ChatPersist>(mode, {
        step, state: persistable, chat: chatRef.current, sessionId: sessionIdRef.current,
      });
    }, 250);
    return () => window.clearTimeout(t);
  }, [step, state, chatTick, sessionId, mode]);

  // ── Mirror progress to the server session (Phase 2) ──
  // Fire-and-forget per step so the funnel session records where the user is and
  // the answers they've given (for analytics + abandonment). Local persistence
  // already covers resume, so a failure here is harmless. Photos are excluded
  // (data URLs don't belong in the session jsonb).
  useEffect(() => {
    if (!sessionId) return;
    const stepId = stepIds[step] ?? `step_${step}`;
    const { photos: _photos, ...answers } = stateRef.current;
    saveSessionProgress(sessionId, stepId, answers as unknown as Record<string, unknown>);
  }, [step, sessionId]);

  const startVisionGen = useCallback((face: string | null, songAbout: string, scene: string, detailText: string, visionScene?: string) => {
    const key = `${songAbout}|${scene}|${detailText}|${visionScene || ''}|${face ? 'face' : 'noface'}`;
    if (visionKeyRef.current === key && visionState !== 'failed') return;
    visionKeyRef.current = key;
    setVisionUrl(null);
    setVisionState('working');
    // Prefer the user's explicitly-chosen image look; fall back to their
    // free-text scene. This makes the picture specific instead of a guess.
    const prompt = visionScene
      ? buildVisionPrompt({ songAbout, scene: visionScene, detailText })
      : buildVisionPrompt({ songAbout, scene, detailText });
    generateVisionWithFace(prompt, face, songAbout || 'Your Vision', '9:16')
      .then((url) => { setVisionUrl(url); setVisionState('done'); })
      .catch(() => setVisionState('failed'));
  }, [visionState]);

  const startSongGen = useCallback((lyrics: string, title: string, style: string, voice: string) => {
    const key = `${title}|${lyrics.slice(0, 80)}`;
    if (songKeyRef.current === key && songState !== 'failed') return; // already generating/done for these lyrics
    songKeyRef.current = key;
    setSong(null);
    setSongState('working');
    setSongStatusLine('Composing your melody…');
    startSongApi({ lyrics, title, style, voice })
      .then((taskId) => pollSong(taskId, (s) => {
        if (s === 'tuning') setSongStatusLine('Tuning every word to you…');
        else if (s === 'streaming') setSongStatusLine('Almost ready…');
        else setSongStatusLine('Composing your melody…');
      }))
      .then((finished) => { setSong(finished); setSongState('done'); })
      .catch(() => setSongState('failed'));
  }, [songState]);

  // ── Stage the finished song against the session (Phase 2/4) ──
  // Once the song is ready, write it (plus the vision) to the funnel session so
  // the account created at /signup can claim it. Guarded so it stages once per
  // distinct audio url, even if the vision finishes later or the effect re-runs.
  const stagedAudioRef = useRef<string | null>(null);
  useEffect(() => {
    if (songState !== 'done' || !song?.audio_url || !sessionId) return;
    if (stagedAudioRef.current === song.audio_url) return;
    stagedAudioRef.current = song.audio_url;
    stageSong(sessionId, {
      title: state.lyricsTitle || song.title || 'Your Song',
      lyrics: state.lyrics || song.lyrics || '',
      style: state.soundStyle || song.style || '',
      voice: state.voice || '',
      audioUrl: song.audio_url,
      imageUrl: song.image_url ?? null,
      visionUrl,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songState, song, visionUrl, sessionId]);

  const next = useCallback(() => {
    setDir(1);
    setStep((s) => Math.min(TOTAL - 1, s + 1));
  }, [TOTAL]);
  const back = useCallback(() => {
    setDir(-1);
    setStep((s) => Math.max(0, s - 1));
  }, []);
  // Skip on optional questions just advances without recording an answer.
  const skip = next;

  // Run an Apple IAP purchase via RevenueCat. On success, jump straight to
  // account creation (last step). The FB StartTrial/Purchase pixel + credit
  // grant happen server-side via the RevenueCat webhook → grant-iap-purchase
  // → pending_fb_events pipeline that purchaseViaIAP already kicks off.
  // On a non-iOS / web preview device purchaseViaIAP returns {handled:false},
  // so we just advance and the click-through preview still flows.
  const buyPlan = useCallback(async (planId: string) => {
    // Web funnel (web-to-app): redirect to Stripe Checkout (Stripe-first, no
    // account yet). On success Stripe sends the user to /start/success.
    if (mode === 'web') {
      capturePostHogEvent('web_checkout_started', { surface: 'web', plan_id: planId });
      // Canonical funnel-step name the ads dashboard builds its funnel on.
      capturePostHogEvent('checkout_started', { surface: 'web', plan_id: planId });
      trackPaywallCompleted({ source: 'web_funnel_trial', planId });
      // Lead = strongest on-domain intent we can fire before the off-domain RC
      // checkout (email is entered on pay.rev.cat, which we can't pixel).
      trackPixel('Lead');
      // Persist fbc/fbp/event_id server-side now (the _fbp cookie is set by now)
      // so the webhook can fire the deduped Meta CAPI Purchase. Fire-and-forget.
      void saveSessionAttribution(sessionIdRef.current);
      // Stash the onboarding session id so it survives the full-page redirect —
      // it rides into checkout as the RC App User ID so the webhook claims the
      // staged song + provisions the account for this buyer.
      stashOnboardingSessionId(sessionIdRef.current);
      // Preferred: hand off to RevenueCat's hosted Web Billing checkout (the $1
      // intro lives there). Falls back to the in-page Stripe sheet until the RC
      // purchase-link token (VITE_RC_PURCHASE_LINK_TOKEN) is configured.
      const rcUrl = buildRcCheckoutUrl({
        appUserId: sessionIdRef.current,
        planId,
        redirectUrl: `${window.location.origin}/start/success`,
      });
      if (rcUrl) {
        // Open RC's hosted checkout in a new tab: its X/close calls
        // window.close(), which only works on a script-opened window — a
        // same-tab redirect makes the X a no-op (it "spins"). New tab → X
        // closes it → user is back on the funnel. Popup blocked → same tab.
        const w = window.open(rcUrl, '_blank');
        if (!w) window.location.href = rcUrl;
        return;
      }
      setPaySheet({ open: true, planId });
      return;
    }
    // In-app: Apple IAP via RevenueCat.
    let result: { handled: boolean; success?: boolean; cancelled?: boolean };
    try { result = await purchaseViaIAP(planId); }
    catch { result = { handled: false }; }
    if (result.handled && result.success) {
      trackPaywallCompleted({ source: 'onboarding_trial', planId });
      setDir(1);
      setStep(TOTAL - 1); // → Create account
    } else if (result.handled && result.cancelled) {
      // User dismissed the StoreKit sheet — stay on the paywall.
    } else if (!result.handled) {
      next(); // non-iOS / preview — continue the flow
    }
  }, [next, mode, TOTAL]);

  const screen = useMemo(() => {
    // Render by step id (not numeric index) so the app + web flows share one
    // renderer and differ only in which ids are present in `stepIds`.
    switch (stepIds[step]) {
      // Home — Moongate-style landing with a Continue CTA (no auto-advance,
      // no tracking prompt). The "Sign in" link is app-only (returning users);
      // the web funnel passes no onSignIn so the link is hidden.
      case 'home': return <V3_01_Splash onNext={next} onSignIn={mode === 'web' ? undefined : () => navigate('/login')} sound={playing} onToggleSound={() => setSound((s) => !s)} />;
      // "Imagine a drug → music" opener — make the claim feel like a discovery,
      // then flip to the user's own goals before pitching.
      case 'hook_imagine_drug': return <V3_DrugHook onNext={next} onBack={back} onSkip={skip} autoAdvanceOnly={mode === 'web'} />;
      case 'reveal_music': return <V3_DrugReveal onNext={next} onBack={back} />;
      case 'discovery': return <V3_Discovery onNext={next} onBack={back} web={mode === 'web'} />;
      case 'science': return <V3_Science onNext={next} onBack={back} web={mode === 'web'} />;
      case 'goals': return <V3_Achieve value={state.achieve} setValue={(v) => set('achieve', v)} onNext={next} onBack={back} />;
      case 'lovify_helps': return <V3_LovifyHelps onNext={next} onBack={back} web={mode === 'web'} />;
      // Promise → founder story → social-proof referral, THEN the familiarity
      // quiz → 2-beat proof → "that's why we built Lovify" → feature walkthrough.
      case 'promise': return <V3_05_Promise onNext={next} onBack={back} web={mode === 'web'} />;
      case 'founder_story': return <V3_04_Story onNext={next} onBack={back} />;
      case 'referral': return <V3_Referral value={state.referral} setValue={(v) => set('referral', v)} onNext={next} onBack={back} onSkip={skip} />;
      case 'familiarity': return <V3_Familiarity value={state.familiarity} setValue={(v) => set('familiarity', v)} onNext={next} onBack={back} />;
      case 'proof_music_negative': return <V3_Proof1 onNext={next} onBack={back} web={mode === 'web'} />;
      case 'proof_more_depressed': return <V3_Proof2 onNext={next} onBack={back} web={mode === 'web'} />;
      case 'the_turn': return <V3_WhyBuilt onNext={next} onBack={back} web={mode === 'web'} />;
      // Breadth ("you can make a song about anything"), then the comeback
      // method — the heads-up that makes the demo's venting question land as
      // step 1 of a known process instead of an ambush.
      case 'song_ideas': return <V3_SongIdeas onNext={next} onBack={back} web={mode === 'web'} />;
      case 'comeback_method': return <V3_ComebackMethod onNext={next} onBack={back} web={mode === 'web'} />;
      // Roleplay demo CHAT (the turn promised "show me the demo").
      case 'demo_chat': return <V3_FeatureChat onNext={next} onBack={back} web={mode === 'web'} playing={playing} onToggleSound={() => setSound((s) => !s)} />;
      // App-only (omitted on web): ATT pre-prompt right after the demo, then the
      // App Store review prompt.
      case 'att_tracking': return <V3_Tracking onNext={next} onBack={back} />;
      case 'review_prompt': return <V3_Review onNext={next} onBack={back} />;
      // Quiz: time → reassurance → listening habits → genres.
      case 'time': return <V3_10_Deepen value={state.time} setValue={(v) => set('time', v)} onNext={next} onBack={back} />;
      case 'time_reassurance': return <V3_TimeReassurance onNext={next} onBack={back} web={mode === 'web'} />;
      case 'when_you_listen': return <V3_11_LeanedOn value={state.pressPlay} setValue={(v) => set('pressPlay', v)} onNext={next} onBack={back} />;
      case 'genres': return <V3_Genres value={state.genres} setValue={(v) => set('genres', v)} onNext={next} onBack={back} />;
      // App-only (omitted on web): attribution ("where did you hear about us")
      // then the daily push-notification nudge.
      case 'attribution': return <V3_14_Source value={state.source} setValue={(v) => set('source', v)} onNext={next} onBack={back} onSkip={skip} />;
      case 'daily_nudge': return <V3_16_Nudge onNext={next} onBack={back} />;
      case 'make_first_song': return <V3_MakeSong onNext={next} onBack={back} />;
      // Song chat — now culminates with the reveal (vision + songs + Save)
      // INLINE, so the whole "wow" happens in one continuous chat experience.
      case 'song_chat': return <V3_Chat
        web={mode === 'web'}
        playing={playing}
        onToggleSound={() => setSound((s) => !s)}
        genres={state.genres}
        persisted={chatRef.current}
        onPersist={(s) => { chatRef.current = s; setChatTick((t) => t + 1); }}
        visionUrl={visionUrl} visionState={visionState}
        song={song} songState={songState} songStatusLine={songStatusLine}
        onPhoto={(face, ctx) => {
          set('photos', [face, null, null, null]);
          // Pre-warm the vision once they've picked their image look, using the
          // chosen visual scene — so it's (often) done by the reveal.
          startVisionGen(face, ctx.songAbout, ctx.scene, ctx.detail, ctx.visionScene);
        }}
        onComplete={(r) => {
          // Persist everything the chat collected and start the song. The reveal
          // now renders inside the chat itself (no separate screen).
          set('name', r.name);
          set('pain', r.pain);
          set('actions', r.actions);
          set('dream', r.dream);
          set('songAbout', r.songAbout);
          set('detailText', r.detail);
          set('scene', r.scene);
          set('why', r.why);
          set('soundStyle', r.soundStyle);
          set('voice', r.voice);
          set('lyrics', r.lyrics);
          set('lyricsTitle', r.title);
          startSongGen(r.lyrics, r.title, r.soundStyle, r.voice);
        }}
        onSave={(n) => {
          // Remember which version they saved so the paywall keeps showing THEIR
          // song + vision (it shouldn't vanish the moment they leave the chat).
          set('savedVersion', typeof n === 'number' ? n : 0);
          capturePostHogEvent('onboarding_song_created', { flow: 'onboarding_comeback1' });
          next();
        }}
        onBack={back}
      />;
      // Paywall sequence (Moongate-style): benefits → 7-days-free → reminder →
      // price → plan picker.
      case 'paywall_benefits': return <V3_22_Trial
        onNext={next} onBack={back}
        savedSong={(song || visionUrl) ? {
          cover: visionUrl || song?.image_url || null,
          title: song?.title || state.lyricsTitle || 'Your song',
          version: state.savedVersion,
        } : null}
      />;
      case 'paywall_7days_free': return <V3_TrialOffer onNext={next} onBack={back} />;
      case 'paywall_reminder': return <V3_TrialReminder onNext={next} onBack={back} />;
      case 'paywall_price': return <V3_TrialPrice onNext={next} onBack={back} onBuy={buyPlan} />;
      case 'paywall_plans': return <V3_23_Paywall onNext={next} onBack={back} onBuy={buyPlan} />;
      // Required account creation so the song saves; then straight into the app.
      // Wired to the app's real Supabase auth (useAuth). The signup/signin
      // analytics (login_completed / signup_completed) fire centrally from
      // AuthContext's onAuthStateChange, so here we only log the funnel
      // milestone and route once auth succeeds.
      case 'create_account': return <V3_CreateAccount
        onApple={() => {
          // Web Apple OAuth bounces the page, so route the return through
          // /signup?fs=<sessionId> (carrying + stashing the session id) — that
          // page claims the staged song and routes on, exactly like the email
          // hand-off. Without this the bounce lands on "/" (the brief flash) and
          // the song is orphaned. Native sign-in ignores redirectTo entirely.
          capturePostHogEvent('onboarding_apple_handoff', { flow: 'onboarding_comeback1', surface });
          const sid = sessionIdRef.current;
          stashOnboardingSessionId(sid);
          clearSnapshot(mode);
          return signInWithApple(`/signup${sid ? `?fs=${encodeURIComponent(sid)}` : ''}`);
        }}
        onEmailSignup={signUpWithEmail}
        onEmailLogin={signInWithEmail}
        onContinueWithEmail={() => {
          // Hand off to the app's real /signup, carrying the onboarding session
          // id (?fs=). The account created there claims the staged song. Clear
          // the local snapshot so a back-button return doesn't replay onboarding.
          capturePostHogEvent('onboarding_email_handoff', { flow: 'onboarding_comeback1', surface });
          const sid = sessionIdRef.current;
          clearSnapshot(mode);
          navigate(`/signup${sid ? `?fs=${encodeURIComponent(sid)}` : ''}`);
        }}
        onNext={async () => {
          capturePostHogEvent('onboarding_account_completed', { flow: 'onboarding_comeback1', surface });
          // Canonical funnel-step name the ads dashboard builds its funnel on.
          capturePostHogEvent('account_created', { flow: 'onboarding_comeback1', surface });
          // This path fires only when the account was created in-place (native
          // Apple/email sign-in, which return a session here instead of
          // bouncing the page). Claim the staged song into the new account
          // before routing — the web OAuth/email paths claim via /signup, but
          // this in-app path never visits it. Idempotent + best-effort.
          await claimOnboardingSession(sessionIdRef.current);
          // Account is created — the run is done, so drop the saved snapshot.
          clearSnapshot(mode);
          clearStoredSessionId();
          // Web funnel: after the account step, send them to the download page
          // (sign into the app with this email → their song is waiting). In-app
          // onboarding lands the now-authenticated user in the app home; the
          // router handles any remaining post-signup steps.
          if (mode === 'web') navigate('/start/success');
          else navigate('/');
        }}
        onBack={back}
      />;
      default: return null;
    }
  }, [stepIds, step, state, next, back, skip, buyPlan, set, startVisionGen, startSongGen, visionUrl, visionState, song, songState, songStatusLine, playing, navigate, mode, surface]);

  return (
    <div
      style={{
        // Fill the container (the review page caps this to a phone frame; the
        // standalone page gives it 100dvh). Avoid hard-coding 100dvh here so the
        // flow never overflows a smaller framed container and clips its footer.
        height: '100%',
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: LOVIFY.bg,
      }}
    >
      {/* Phone-shaped column — looks like the iOS app on any viewport. */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 430,
          height: '100%',
          overflow: 'hidden',
          background: LOVIFY.bg,
        }}
      >
        {/* Persistent ambient soundtrack — survives every step change.
            data-ambient lets the demo song cards duck it while a song plays. */}
        <audio ref={audioRef} src={ambientLoop} loop preload="auto" data-ambient />

        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -48 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'absolute', inset: 0 }}
          >
            {/* Web funnel: nudge headlines ~10% larger for phone readability.
                App stays at scale 1 (unchanged). */}
            <HeadingScaleContext.Provider value={mode === 'web' ? 1.1 : 1}>
              {screen}
            </HeadingScaleContext.Provider>
          </motion.div>
        </AnimatePresence>

        {/* Persistent music toggle — top-right on every screen after the
            landing (the landing renders its own toggle in the same spot). On the
            web demo chat the toggle lives in that screen's header instead, so
            suppress this floating one there to avoid an overlapping double. */}
        {step > 0 && !(mode === 'web' && (stepIds[step] === 'demo_chat' || stepIds[step] === 'song_chat')) && (
          <button
            onClick={() => setSound((s) => !s)}
            aria-label={playing ? 'Mute sound' : 'Play sound'}
            style={{
              position: 'absolute', top: 56, right: 16, zIndex: 40,
              width: 40, height: 40, borderRadius: 20, cursor: 'pointer', padding: 0,
              background: 'transparent', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 4px rgba(58,30,16,0.25))' }}>
              <path d="M4 9v6h4l5 4V5L8 9H4z" fill={LOVIFY.ink} />
              {playing ? (
                <>
                  <path d="M16 8.5a4 4 0 0 1 0 7" stroke={LOVIFY.ink} strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M18.5 6a7 7 0 0 1 0 12" stroke={LOVIFY.ink} strokeWidth="1.8" strokeLinecap="round" />
                </>
              ) : (
                <path d="M17 9l5 6M22 9l-5 6" stroke={LOVIFY.ink} strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
          </button>
        )}

        {/* Web-funnel payment sheet — Apple Pay / card slide-up over the phone column.
            Pre-arm the Stripe intent while the user is on the paywall screens
            (price / plan picker) so checkout is already loaded when they tap. */}
        <PaymentSheet
          open={paySheet.open}
          planId={paySheet.planId}
          isTrial={paySheet.planId === 'yearly_premium_trial'}
          armPlanId={mode === 'web' && (stepIds[step] === 'paywall_price' || stepIds[step] === 'paywall_plans') ? 'yearly_premium_trial' : undefined}
          onClose={() => setPaySheet((s) => ({ ...s, open: false }))}
        />
      </div>
    </div>
  );
}