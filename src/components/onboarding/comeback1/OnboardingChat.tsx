// @ts-nocheck -- ported from the (non-strict) Lovify app repo; web2app funnel code
/* Lovify comeback1 — the Comeback Song Chat.
 *
 * ONE song for everybody: their comeback song. Three questions collect all the
 * raw material — the life they hate (pain), the action steps they'd give
 * someone they love (advice-to-other unlocks specificity even when stuck), and
 * the amazing life on the other side (dream). The formula's remaining beats —
 * ROOT CAUSE ("you lost who you used to be") and TURNING POINT ("you found
 * Lovify; press play every morning") — are delivered by the bot's
 * acknowledgments BETWEEN the questions, so the chat itself walks the user
 * through the pain→pleasure arc their song will follow.
 *
 * It's a SCRIPTED flow (fixed, conversion-friendly question order) with
 * lightweight AI-style mirroring done client-side, plus three real calls:
 *   • suggest-song-styles  → 4 sound options as chips
 *   • creative-assistant   → the lyrics (via a comeback-structured prompt)
 * The vision + song generation themselves are kicked off by the parent flow
 * (onPhoto pre-warms the vision; onComplete starts the song), then the reveal
 * renders inline with the daily-ritual / "chapter one" retention framing.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { LOVIFY, SANS, SERIF } from '@/components/onboarding/v3/theme';
import { LovLogo } from '@/components/onboarding/v3/primitives';
import {
  suggestSoundStyles, generateLyrics, type SoundVibe,
} from '@/components/onboarding/v3/generation';
import type { GeneratedSong } from '@/components/onboarding/v3/generation';
import { publicEnv } from '@/lib/env';

type SlotState = 'idle' | 'working' | 'done' | 'failed';

type Phase =
  | 'name' | 'pain' | 'dream' | 'actions'
  | 'photo' | 'visionScene' | 'sound' | 'voice'
  | 'writing' | 'lyricsReview' | 'generating';

type InputMode =
  | 'busy' | 'text' | 'photo' | 'visionScene' | 'visionText'
  | 'soundLoading' | 'sound' | 'voice' | 'writing' | 'lyricsReview';

interface ChatMsg {
  id: string;
  role: 'bot' | 'user';
  kind: 'text' | 'typing' | 'photo' | 'photoset';
  text?: string;
  photo?: string;
  photos?: string[]; // for a multi-photo user message
}

export interface ChatResult {
  name: string;
  // The three comeback answers — the raw material for the song.
  pain: string;               // Q1: the life they hate right now
  actions: string;            // Q2: the advice/action steps they'd give someone they love
  dream: string;              // Q3: the amazing life on the other side
  // Legacy fields, filled by mapping (songAbout='My comeback', detail=actions,
  // scene=dream, why=pain) so parent plumbing — vision pre-warm, FlowState,
  // session analytics, stageSong — keeps working unchanged.
  songAbout: string;
  detail: string;
  scene: string;
  why: string;
  soundStyle: string;
  voice: string;
  face: string | null;        // primary face (drives the vision generator)
  faces: string[];            // all uploaded people (you + gf/family)
  visionScene: string;        // the chosen look for the image
  lyrics: string;
  title: string;
}

// ── The three comeback questions ──────────────────────────────────
// Every song is a comeback song — no topic picker. The bot's acknowledgments
// between these carry the formula's ROOT CAUSE and TURNING POINT beats, so
// the conversation itself walks the user through the arc of their song.

// ── "Help me…" ideas (Q2/Q3 only — Q1 venting gets NO crutch on purpose:
// people are good at naming their pain; we want their own words). The live
// ideas are AI-generated from what the user just vented (see the suggest
// helpers below); these banks are the offline/failure fallbacks.
export interface IdeaSection { title?: string; ideas: string[] }
// Q2 fallback — legitimate, doable actions, grouped so the user can scan
// categories and tap the ones that fit.
const FALLBACK_ACTION_SECTIONS: IdeaSection[] = [
  { title: 'Body & energy', ideas: ['Get back in the gym', 'Walk every morning', 'Eat like I respect myself'] },
  { title: 'Mind & peace', ideas: ['Wake up before my alarm, make time for me', 'Journal what I want, every morning', 'Cut the doom-scrolling at night'] },
  { title: 'People & life', ideas: ['Say yes — to the date, the invite, the chance', 'Reconnect with a friend every week', 'Plan the life I want on Sunday nights'] },
];
// Q3 fallback — best-case-scenario moments.
const FALLBACK_DREAM_IDEAS: IdeaSection[] = [
  { ideas: [
    'I wake up excited, before the alarm',
    "I'm proud of what I see in the mirror",
    'My family says I seem happier — and I am',
    'Someone tells me "you\'re glowing"',
    'I love the work I do all day',
    'Not just surviving — living a life I choose',
  ] },
];

// ── Vision options: SPECIFIC future scenes the user can see themselves in
// ("What vision of the future do you want to see yourself in?"). Always the
// dream side of the comeback — concrete moments, not abstract moods.
const COMEBACK_VISION_IDEAS: { e: string; t: string; prompt: string }[] = [
  { e: '🌅', t: 'Coffee on my porch at sunrise, at peace', prompt: 'as the comeback version of myself at golden-hour sunrise, coffee in hand on a beautiful porch, calm, glowing and at peace, planning the life I want, cinematic warm light' },
  { e: '💪', t: 'Fit & glowing after a morning workout', prompt: 'as a fit, glowing version of myself right after a morning workout, strong and energized, sunrise light, cinematic' },
  { e: '🎉', t: 'Celebrating a big win with people I love', prompt: 'as myself celebrating a big win surrounded by the people I love, joyful golden light, radiant and alive, cinematic' },
  { e: '🏔️', t: 'On a mountaintop — strong & free', prompt: 'as myself standing on a mountaintop at sunrise, arms open, strong and free, the hard chapter behind me, cinematic and triumphant' },
];

// ── Engaging loaders: cycling status lines so waits feel like work happening,
// not a stalled spinner. One set for the style suggestions, one for lyrics.
const SOUND_LOADING_LINES = [
  'Loading styles…',
  'Listening to your story…',
  'Matching sounds to your comeback…',
  'Tuning the energy…',
];
const IDEA_LOADING_LINES = [
  'Brainstorming ideas from your story…',
  'Reading what you wrote…',
  'Picturing your best-case moments…',
];
const WRITING_LINES = [
  'Reading your story…',
  'Finding your comeback arc…',
  'Creating your affirmations…',
  'Installing the new beliefs…',
  'Writing your action verses…',
  'Polishing your chorus…',
  'Making your comeback song…',
];

function LoaderLine({ lines, centered }: { lines: string[]; centered?: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % lines.length), 1900);
    return () => clearInterval(t);
  }, [lines.length]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: centered ? 'center' : 'flex-start', gap: 10, padding: centered ? '14px 0' : '6px 2px' }}>
      <svg width="18" height="18" viewBox="0 0 50 50" style={{ flexShrink: 0 }}>
        <circle cx="25" cy="25" r="20" fill="none" stroke={LOVIFY.orange} strokeWidth="5" strokeLinecap="round" strokeDasharray="80 50">
          <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.9s" repeatCount="indefinite" />
        </circle>
      </svg>
      <motion.span
        key={i}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ fontFamily: SANS, fontSize: centered ? 14.5 : 13.5, fontWeight: 700, color: LOVIFY.orangeDeep }}
      >
        {lines[i]}
      </motion.span>
    </div>
  );
}

function firstName(raw: string): string {
  const n = (raw || '').trim().split(/\s+/)[0] || '';
  // Title-case the first name.
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : '';
}

function shortQuote(s: string): string {
  const w = (s || '').trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  const clip = w.slice(0, 9).join(' ').replace(/[.,;:!?]+$/, '');
  return clip + (w.length > 9 ? '…' : '');
}

// Offline fallback so the song can still attempt if lyrics generation fails.
// This is also what renders in preview/no-credit environments, so it follows
// the full comeback arc (pain → root cause → turning point → actions → amazing
// life → joy), weaving in the user's own words.
function fallbackLyrics(pain: string, actions: string, dream: string): string {
  const p = shortQuote(pain) || 'Another day that wears me down';
  const a = shortQuote(actions) || 'Showing up for me, one step at a time';
  const d = shortQuote(dream) || 'The life I choose, finally mine';
  return `[Verse 1]
${p}
Caught my reflection, didn't know that face
Just getting through, day after day

[Verse 2]
I forgot who I was — gave it all away
There's nothing left of me at the end of the day
God, I miss who I used to be

[Pre-Chorus]
Then I made this song about who I'm becoming
Press play every morning, rewiring my mind

[Chorus]
${a}
Little steps, but I feel the change
I'm coming back to life

[Bridge]
${d}
It's closer than it's ever been

[Final Chorus]
I'm not just surviving — I'm living the life I choose
This is my comeback, and I'm never looking back

[Outro]
Tomorrow when my alarm goes off — press play
Every morning, 'til every line comes true
This is only chapter one… who will I become next?`;
}

// The comeback songwriting formula, sent verbatim to creative-assistant via
// generateLyrics({ promptOverride }). The user answers 3 questions; this brief
// supplies the rest: the narrative arc (root cause, turning point, becoming),
// the earworm craft rules, and the ritual outro (never an ad-style CTA).
function buildComebackLyricsPrompt(a: { name: string; pain: string; actions: string; dream: string }): string {
  return [
    "Write my COMEBACK SONG — a radio-grade story song about my life turning around, written the way Taylor Swift writes: a narrative songwriter telling MY story with concrete little details, conversational lines and real emotional turns. Never generic self-help, never an ad.",
    '',
    'MY RAW MATERIAL (weave my exact words and images in):',
    `• The life I hate right now: ${a.pain}`,
    `• My way out — the actions I'd take: ${a.actions}`,
    `• The life I'm walking into: ${a.dream}`,
    a.name ? `• My name: ${a.name}` : '',
    '',
    'STORY ARC — in this exact order:',
    '[Verse 1] THE LIFE I HATE — open mid-scene in a real moment, physical details from my own words (like "microwaved dinner, ate it standing up").',
    "[Pre-Chorus] THE ROOT CAUSE — I lost who I used to be; I forgot who I am. Make it ache in two or three lines.",
    "[Chorus] THE TURNING POINT — I made a song about who I'm becoming, and I press play every morning, rewiring my mind. This chorus carries THE HOOK.",
    '[Verse 2] THE ACTION STEPS — show me DOING my plan as vivid mini-scenes (mornings, sweat, small wins), pulled from my own words.',
    '[Bridge] BECOMING — the lift. The moment I catch myself already changed, and someone close to me notices.',
    "[Final Chorus] THE AMAZING LIFE — the same hook, but now it's TRUE: shift to present tense, full joy, living the life I choose.",
    "[Outro] THE RITUAL + WHAT'S NEXT — never a call-to-action. Instead: tomorrow when my alarm goes off I press play again — this song, every morning, until every line of it is true. Close with a warm wondering of who I'll become next… this song is only chapter one.",
    '',
    'EARWORM RULES — make it stick:',
    '• ONE short title hook (2–5 words) repeated at least 4 times across the choruses and outro; it is also the song title.',
    '• One singalong non-lexical hook (like "whoa-oh-oh") introduced in the first chorus and reused later.',
    '• Choruses repeat with small escalations — promise tense early, present tense by the final chorus.',
    '• Concrete nouns over abstractions. Short conversational lines a person could sing in the car. Internal rhyme that feels effortless, never forced.',
    '• First person all the way through, in my voice.',
    '',
    'LENGTH DISCIPLINE — tight like a hit, not a journal:',
    '• HARD LIMIT: the entire lyric under 230 words. Great comeback songs run ~235 words — match that.',
    '• Verses and pre-chorus: exactly 4 short bars each. Chorus: 6 lines max. Bridge: 4 lines. Outro: 4 lines.',
    '• Every line must earn its bar — cut anything that repeats an idea without raising it.',
    '',
    'Never include "download", app-store language, or advertising of any kind — this is MY song.',
    'Output ONLY the song sections and lyrics — no production notes, no commentary.',
    'Please write my song now.',
  ].filter((l, i) => l !== '' || i > 0).join('\n');
}

// ── AI idea suggestions (Q2 actions / Q3 dreams) ──────────────────
// Personalized to what the user just vented, via the `suggest-comeback-ideas`
// edge function (source ships in this repo: docs/edge-functions/, deploy with
// `supabase functions deploy suggest-comeback-ideas --project-ref <ref>`).
// Pre-warmed the moment the previous answer lands so ideas are usually ready
// by the time the user taps for help. Until the function is deployed — or on
// any failure — the static banks above fill in silently.
async function suggestIdeas(body: { kind: 'actions' | 'dreams' | 'visions'; pain: string; actions?: string; dream?: string }): Promise<unknown> {
  const res = await fetch(`${publicEnv.supabaseUrl}/functions/v1/suggest-comeback-ideas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${publicEnv.supabaseAnonKey}`,
      apikey: publicEnv.supabaseAnonKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`suggest-comeback-ideas ${res.status}`);
  return res.json();
}

const clip = (s: unknown) => String(s ?? '').trim().slice(0, 60);

/** Concrete action ideas bridging THEIR pain to THEIR dream, grouped in
 *  categories named after their struggles. (Asked third, after the dream.) */
async function suggestActionSections(pain: string, dream: string): Promise<IdeaSection[]> {
  const j = (await suggestIdeas({ kind: 'actions', pain, dream })) as {
    categories?: { title?: string; ideas?: unknown[] }[];
  };
  const sections = (j.categories || [])
    .slice(0, 3)
    .map((c) => ({ title: clip(c.title), ideas: (c.ideas || []).map(clip).filter(Boolean).slice(0, 4) }))
    .filter((c) => c.ideas.length);
  if (!sections.length) throw new Error('empty categories');
  return sections;
}

/** Personalized reflection (the "I heard you" ack) + vivid best-case-scenario
 *  moments from their vent. (Asked second, right after the pain.) */
async function suggestDreamSections(pain: string): Promise<{ reflection: string; sections: IdeaSection[] }> {
  const j = (await suggestIdeas({ kind: 'dreams', pain })) as { reflection?: string; ideas?: unknown[] };
  const ideas = (j.ideas || []).map(clip).filter(Boolean).slice(0, 7);
  if (!ideas.length) throw new Error('empty ideas');
  return { reflection: String(j.reflection || '').trim().slice(0, 400), sections: [{ ideas }] };
}

/** Personalized vision-image options of THEIR dream future (image step). */
async function suggestVisionIdeas(pain: string, actions: string, dream: string): Promise<{ e: string; t: string; prompt: string }[]> {
  const j = (await suggestIdeas({ kind: 'visions', pain, actions, dream })) as {
    visions?: { emoji?: string; title?: string; prompt?: string }[];
  };
  const v = (j.visions || [])
    .map((x) => ({ e: String(x.emoji || '✨').slice(0, 4), t: clip(x.title), prompt: String(x.prompt || '').trim().slice(0, 500) }))
    .filter((x) => x.t && x.prompt)
    .slice(0, 4);
  if (!v.length) throw new Error('empty visions');
  return v;
}

// Everything needed to restore the chat exactly where the user left off when
// they navigate back into it from the reveal. Owned by the parent flow so it
// survives this component unmounting.
export interface ChatPersist {
  msgs: ChatMsg[];
  phase: Phase;
  mode: InputMode;
  vibes: SoundVibe[];
  data: ChatResult;
  nextId: number;
  done: boolean; // true once lyrics finished and we handed off to the reveal
}

export function V3_Chat({
  genres, onPhoto, onComplete, onBack, persisted: persistedRaw, onPersist,
  visionUrl, visionState, song, songState, songStatusLine, onSave, web, playing, onToggleSound,
}: {
  genres: string[];
  // Web funnel surface — lets the chat use funnel-specific copy + a header
  // music toggle (the floating one is suppressed on this step on web).
  web?: boolean;
  playing?: boolean;
  onToggleSound?: () => void;
  // Called once the user picks their image look, with the primary face + the
  // chosen visual scene, so the parent can pre-warm the vision image while the
  // rest of the chat (sound/voice/lyrics) continues.
  onPhoto: (face: string | null, ctx: { songAbout: string; scene: string; detail: string; visionScene: string }) => void;
  // Called once lyrics are written — parent persists everything and starts the
  // song. The reveal now happens INLINE in this chat (no separate screen).
  onComplete: (r: ChatResult) => void;
  onBack?: () => void;
  // Persistence: parent passes the last saved snapshot (or null) + a setter so
  // the conversation resumes instead of restarting on back-navigation.
  persisted?: ChatPersist | null;
  onPersist?: (s: ChatPersist) => void;
  // Live generation state (owned + pre-warmed by the parent flow) so the chat
  // can reveal the vision + song right here once they're ready.
  visionUrl?: string | null;
  visionState?: SlotState;
  song?: GeneratedSong | null;
  songState?: SlotState;
  songStatusLine?: string;
  // The user saves the take they love → advances to the paywall.
  onSave?: (version?: number) => void;
}) {
  // Snapshots saved by the pre-comeback chat restore into phases that no
  // longer exist — discard those and start the comeback chat fresh.
  const persisted = ['about', 'detail', 'scene', 'why'].includes(persistedRaw?.phase as string)
    ? null
    : persistedRaw;
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => persisted?.msgs ?? []);
  const [phase, setPhase] = useState<Phase>(() => persisted?.phase ?? 'name');
  const [mode, setMode] = useState<InputMode>(() => persisted?.mode ?? 'busy');
  const [draft, setDraft] = useState('');
  // Web "Help me…" is multi-select: tap several short ideas, then Continue.
  const [selectedIdeas, setSelectedIdeas] = useState<string[]>([]);
  const toggleIdea = (idea: string) =>
    setSelectedIdeas((s) => (s.includes(idea) ? s.filter((x) => x !== idea) : [...s, idea]));
  // AI-personalized idea sections (Q2 actions / Q3 dreams) — pre-warmed the
  // moment the previous answer lands; the static banks fill in until/if the
  // AI replies. Guarded so each is requested once per run.
  const [actionIdeas, setActionIdeas] = useState<IdeaSection[] | null>(null);
  const [dreamIdeas, setDreamIdeas] = useState<IdeaSection[] | null>(null);
  const [visionIdeas, setVisionIdeas] = useState<{ e: string; t: string; prompt: string }[] | null>(null);
  const actionReqRef = useRef(false);
  const dreamReqRef = useRef(false);
  const visionReqRef = useRef(false);
  const [vibes, setVibes] = useState<SoundVibe[]>(() => persisted?.vibes ?? []);
  // True once lyrics are confirmed — the reveal (vision + songs) renders inline
  // at the bottom of the chat. Restored straight to revealed on back-nav.
  const [revealed, setRevealed] = useState(() => !!persisted?.done);

  // Collected answers (kept in a ref so async generation reads the latest).
  const data = useRef<ChatResult>(persisted?.data ?? {
    name: '', pain: '', actions: '', dream: '',
    songAbout: '', detail: '', scene: '', why: '',
    soundStyle: '', voice: '', face: null, faces: [], visionScene: '',
    lyrics: '', title: '',
  });
  // Photos staged during the multi-photo step before the user taps "Done".
  const [stagedFaces, setStagedFaces] = useState<string[]>(() => persisted?.data?.faces ?? []);
  // Editable lyrics shown in the review step. Seed from the persisted answers so
  // a refresh on the review step keeps the generated lyrics in the textarea
  // (data.lyrics is persisted; this local draft state otherwise starts empty).
  const [lyricsDraft, setLyricsDraft] = useState(() => persisted?.data?.lyrics ?? '');

  const idRef = useRef(persisted?.nextId ?? 0);
  const doneRef = useRef(persisted?.done ?? false);
  const nid = () => `m${idRef.current++}`;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest message (and to the reveal once it appears).
  const scrollToEnd = () => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; };
  useEffect(() => {
    scrollToEnd();
    const r = requestAnimationFrame(scrollToEnd);
    const t = setTimeout(scrollToEnd, 120);
    return () => { cancelAnimationFrame(r); clearTimeout(t); };
  }, [msgs, mode, revealed, songState, visionUrl]);

  // Persist a snapshot up to the parent whenever the conversation changes, so
  // a back-then-forward round trip resumes exactly here.
  useEffect(() => {
    onPersist?.({ msgs, phase, mode, vibes, data: data.current, nextId: idRef.current, done: doneRef.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs, phase, mode, vibes]);

  // ── Bot speech with a typing indicator, revealing lines one at a time. ──
  const botSay = (lines: string[], thenMode: InputMode) => {
    setMode('busy');
    let i = 0;
    const showNext = () => {
      const line = lines[i];
      // typing bubble
      setMsgs((m) => [...m, { id: nid(), role: 'bot', kind: 'typing' }]);
      const typingFor = Math.min(1100, 350 + line.length * 12);
      window.setTimeout(() => {
        setMsgs((m) => {
          const copy = [...m];
          for (let j = copy.length - 1; j >= 0; j--) {
            if (copy[j].kind === 'typing') { copy[j] = { id: nid(), role: 'bot', kind: 'text', text: line }; break; }
          }
          return copy;
        });
        i += 1;
        if (i < lines.length) window.setTimeout(showNext, 320);
        else setMode(thenMode);
      }, typingFor);
    };
    showNext();
  };

  const pushUser = (text: string) => setMsgs((m) => [...m, { id: nid(), role: 'user', kind: 'text', text }]);
  const pushUserPhotos = (photos: string[]) => setMsgs((m) => [...m, { id: nid(), role: 'user', kind: 'photoset', photos }]);

  // ── Kick off the conversation once — but ONLY on a fresh start. When we're
  // restoring a saved conversation, skip the intro so we don't replay it. ──
  // The ref guard makes the intro fire exactly once even under React
  // StrictMode's intentional double-mount in dev (otherwise the seed messages
  // get appended twice).
  const seededRef = useRef(false);
  useEffect(() => {
    if (persisted && persisted.msgs.length) return; // resuming — keep transcript as-is
    if (seededRef.current) return; // already seeded (StrictMode remount) — don't replay
    seededRef.current = true;
    botSay(
      [
        "Hey, it's Lovify. Let's make your comeback song. 🖤",
        "First, what's your name?",
      ],
      'text',
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load AI sound styles when we enter the sound phase. The context is built
  // here (not via buildStyleContext) so it frames the song as a comeback
  // anthem — pain, plan, and destination all inform the suggested vibes.
  useEffect(() => {
    if (mode !== 'soundLoading') return;
    const d = data.current;
    const ctx = [
      'The song is a comeback anthem — the story of someone turning their life around, from the life they hate to the life they love.',
      d.pain && `What they're escaping: ${d.pain}`,
      d.actions && `The comeback plan (their own action steps): ${d.actions}`,
      d.dream && `The amazing life they're heading to: ${d.dream}`,
      genres?.length && `Genres they love: ${genres.join(', ')}.`,
    ].filter(Boolean).join('\n');
    let cancelled = false;
    suggestSoundStyles(ctx, [], 0)
      .then((v) => { if (!cancelled) { setVibes(v); setMode('sound'); } })
      .catch(() => { if (!cancelled) { setVibes(FALLBACK_VIBES); setMode('sound'); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const name = data.current.name;

  // Idea sections for the current question — the AI-personalized set once it
  // arrives, the static bank otherwise. NO ideas on the pain question: people
  // are good at naming their pain; we want their own words, not a crutch.
  const currentIdeaSections = (): IdeaSection[] => {
    if (phase === 'actions') return actionIdeas ?? FALLBACK_ACTION_SECTIONS;
    if (phase === 'dream') return dreamIdeas ?? FALLBACK_DREAM_IDEAS;
    return [];
  };
  // Ideas may still be generating when a question lands (the actions call
  // fires at the dream answer) — show a brainstorming loader briefly, then
  // fall back to the static bank so the list always appears.
  const [ideasTimedOut, setIdeasTimedOut] = useState(false);
  useEffect(() => {
    const waiting = (phase === 'actions' && !actionIdeas) || (phase === 'dream' && !dreamIdeas);
    if (!waiting) return;
    setIdeasTimedOut(false);
    const t = window.setTimeout(() => setIdeasTimedOut(true), 9000);
    return () => window.clearTimeout(t);
  }, [phase, actionIdeas, dreamIdeas]);
  const ideasPending = !ideasTimedOut
    && ((phase === 'actions' && !actionIdeas) || (phase === 'dream' && !dreamIdeas));
  // Categorized lists (actions) render as a compact accordion: tap a category
  // to open its ideas — far less overwhelming than 9 buttons at once.
  const [openSection, setOpenSection] = useState<number | null>(null);
  useEffect(() => { setOpenSection(null); }, [phase]);

  // ── Text answers (name / pain / actions / dream) ──
  // Accepts an explicit value so tapped "Help me…" ideas can move forward too.
  // The acks between questions deliver the formula beats the user doesn't
  // answer: ROOT CAUSE after the pain, TURNING POINT after the plan.
  const submitText = (override?: string) => {
    const value = (override ?? draft).trim();
    if (!value) return;
    setDraft('');
    setSelectedIdeas([]);
    pushUser(value);

    if (phase === 'name') {
      const fn = firstName(value);
      data.current.name = fn;
      setPhase('pain');
      // The method was already taught on the "comeback song" screen — dive in.
      botSay([
        `Nice to meet you, ${fn}.`,
        `Let's start by getting it out 😤 What are 4 things you hate about your life right now? Tell me in specific detail`,
      ], 'text');
    } else if (phase === 'pain') {
      // Pain → DREAM next (best case first — it's lighter, and the steps feel
      // easier once they can already see where they're going).
      data.current.pain = value;
      data.current.why = value; // legacy mapping for parent plumbing/analytics
      setPhase('dream');
      // The ack must prove we HEARD them — AI-written from their exact words
      // (the same call also brings the personalized dream moments). Typing
      // dots run while it thinks; if it's slow/fails we ack claim-safe.
      dreamReqRef.current = true;
      const req = suggestDreamSections(value)
        .then((r) => { setDreamIdeas(r.sections); return r; })
        .catch(() => null);
      setMode('busy');
      const tid = nid();
      setMsgs((m) => [...m, { id: tid, role: 'bot', kind: 'typing' }]);
      const timeout = new Promise<null>((res) => { window.setTimeout(() => res(null), 9000); });
      Promise.race([req, timeout]).then((r) => {
        setMsgs((m) => m.filter((x) => x.id !== tid));
        botSay([
          (r && r.reflection) || `Thank you for being real with me, ${name}. Getting it all out is the first step.`,
          `Now flip it: imagine every bit of that is behind you. What's the most amazing life you can picture, ${name}?`,
          `Select a few below, or type your own 👇`,
        ], 'text');
      });
    } else if (phase === 'dream') {
      data.current.dream = value;
      data.current.scene = value;             // legacy: the scene the vision falls back to
      data.current.songAbout = 'My comeback'; // legacy label for plumbing/analytics
      // Pre-warm the personalized action ideas bridging their pain → dream.
      if (!actionReqRef.current) {
        actionReqRef.current = true;
        suggestActionSections(data.current.pain, value).then(setActionIdeas).catch(() => { /* fallback bank covers it */ });
      }
      setPhase('actions');
      botSay([
        `Now THAT's a life worth fighting for. 🔥`,
        `So how do we get you there? If the best version of you took over tomorrow morning, what would they do — day by day?`,
        `Open a category below for ideas, or type your own 👇`,
      ], 'text');
    } else if (phase === 'actions') {
      data.current.actions = value;
      data.current.detail = value; // legacy mapping
      // Pre-warm the personalized VISION options (shown after the photo) from
      // everything they've told us — so the image choices depict THEIR dream.
      if (!visionReqRef.current) {
        visionReqRef.current = true;
        suggestVisionIdeas(data.current.pain, value, data.current.dream)
          .then(setVisionIdeas)
          .catch(() => { /* static vision set covers it */ });
      }
      setPhase('photo');
      botSay([
        `That's the comeback plan — you already know the way back. 💪 Your song is going to plant it in your mind, every time you press play.`,
        `Add a photo of yourself so you can SEE the you you're coming back to. (Add anyone else you want in the picture too.)`,
      ], 'photo');
    }
  };

  // ── Photos: stage one at a time, then confirm the whole set ──
  const addStagedFace = (face: string) => setStagedFaces((f) => [...f, face]);
  const removeStagedFace = (i: number) => setStagedFaces((f) => f.filter((_, idx) => idx !== i));

  const confirmPhotos = () => {
    const faces = stagedFaces;
    data.current.faces = faces;
    data.current.face = faces[0] ?? null;
    if (faces.length) pushUserPhotos(faces);
    setPhase('visionScene');
    botSay([
      faces.length > 1 ? `Love it — all ${faces.length} of you. ✨` : `Perfect. That's who we're fighting for. ✨`,
      `What vision of the future do you want to see yourself in, ${name}?`,
    ], 'visionScene');
  };
  // No skip on the photo step — seeing THEMSELF in the vision is the payoff,
  // and the very next step picks the future scene they'll appear in.

  // ── Vision-scene (image look) chosen → pre-warm the image, move to sound ──
  // AI-personalized options of THEIR dream future (pre-warmed at the dream
  // answer); the static comeback set covers failures/slow networks.
  const visionSceneIdeas = () => visionIdeas ?? COMEBACK_VISION_IDEAS;
  const chooseVisionScene = (idea: { t: string; prompt: string }) => {
    data.current.visionScene = idea.prompt;
    pushUser(idea.t);
    // Pre-warm the vision now that we know the look + have the face(s).
    onPhoto(data.current.face, {
      songAbout: data.current.songAbout, scene: data.current.scene,
      detail: data.current.detail, visionScene: idea.prompt,
    });
    setPhase('sound');
    botSay([`Beautiful choice. 🎨`, `Now — what do you want your comeback song to sound like, ${name}?`], 'soundLoading');
  };
  // Free-typed vision — the user describes exactly how they want to look.
  const chooseVisionText = (override?: string) => {
    const value = (override ?? draft).trim();
    if (!value) return;
    setDraft('');
    data.current.visionScene = value;
    pushUser(value);
    onPhoto(data.current.face, {
      songAbout: data.current.songAbout, scene: data.current.scene,
      detail: data.current.detail, visionScene: value,
    });
    setPhase('sound');
    botSay([`Love it — I can see it. 🎨`, `Now — what do you want your comeback song to sound like, ${name}?`], 'soundLoading');
  };

  // ── Sound vibe chosen (chip) or free-typed style ──
  const chooseVibe = (v: SoundVibe) => {
    data.current.soundStyle = v.description ? `${v.name} — ${v.description}` : v.name;
    pushUser(v.name);
    setPhase('voice');
    botSay([`${v.name} — gorgeous choice.`, 'Last thing: who should sing it?'], 'voice');
  };
  const chooseVibeText = (value: string) => {
    data.current.soundStyle = value;
    pushUser(value);
    setPhase('voice');
    botSay([`Love that sound. 🎶`, 'Last thing: who should sing it?'], 'voice');
  };

  // ── Write the lyrics (live loader), then SHOW them for review/edit. Shared by
  //    the voice step AND the refresh-recovery effect below, so a reload during
  //    generation re-runs it instead of hanging on the spinner forever. ──
  const writeLyrics = (announce: boolean) => {
    const d = data.current;
    generateLyrics({
      songAbout: d.songAbout, detailText: d.detail, scene: d.scene, why: d.why,
      style: d.soundStyle, voice: d.voice, genres,
      // The comeback arc, sent verbatim — pain → root cause → turning point →
      // action steps → best self → amazing life → joy.
      promptOverride: buildComebackLyricsPrompt({
        name: d.name, pain: d.pain, actions: d.actions, dream: d.dream,
      }),
    })
      .then((res) => {
        // Strip any trailing production-note/commentary block — Mureka would
        // sing it as lyrics otherwise. (The prompt forbids it too; belt+braces.)
        d.lyrics = (res.content || '').replace(/\n\[(?:production|note|style note)[^\]]*\][\s\S]*$/i, '').trim();
        d.title = res.title;
        if (res.style) d.soundStyle = res.style;
      })
      .catch(() => { d.lyrics = fallbackLyrics(d.pain, d.actions, d.dream); d.title = 'My Comeback'; })
      .finally(() => {
        setLyricsDraft(d.lyrics);
        setPhase('lyricsReview');
        if (announce) {
          botSay([
            `Here's your comeback song, ${name} — this is what we'll plant in your mind. 🧠`,
            `Read it over. Tweak anything that isn't quite you, then make it real.`,
          ], 'lyricsReview');
        } else {
          // Recovered after a refresh — don't replay the bot lines, just show
          // the textarea so the user can keep going.
          setMode('lyricsReview');
        }
      });
  };

  // ── Voice chosen → write lyrics (with a live loader), then SHOW them for
  //    review/edit before we make the song. ──
  const chooseVoice = (v: string) => {
    data.current.voice = v;
    pushUser(v);
    setPhase('writing');
    setMode('writing'); // persistent animated loader (doesn't just sit there)
    writeLyrics(true);
  };

  // ── Refresh recovery ──
  // The lyrics generation is an in-flight promise that's lost on reload. If we
  // restore into the 'writing' phase, the spinner would hang forever, so:
  //   • lyrics already arrived before the refresh → jump to review;
  //   • lyrics not done → re-run generation from the persisted answers.
  const recoveredRef = useRef(false);
  useEffect(() => {
    if (recoveredRef.current) return;
    if (!(persisted && persisted.msgs.length)) return; // fresh start, nothing to recover
    if (phase !== 'writing') return;
    recoveredRef.current = true;
    if (data.current.lyrics) {
      setLyricsDraft(data.current.lyrics);
      setPhase('lyricsReview');
      setMode('lyricsReview');
    } else {
      writeLyrics(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── The bottom text bar is now ALWAYS available, even on the chip steps, so
  // the chat input never disappears. This routes whatever the user types to the
  // right handler for the current step (the chips above are just shortcuts). ──
  const submitFreeText = () => {
    const value = draft.trim();
    if (!value) return;
    if (mode === 'sound') { setDraft(''); chooseVibeText(value); return; }
    if (mode === 'voice') { setDraft(''); chooseVoice(value); return; }
    if (mode === 'visionScene' || mode === 'visionText') { chooseVisionText(); return; }
    submitText();
  };

  // The bottom-right ↑ doubles as the "Continue" for multi-select ideas. If
  // the user selected ideas AND typed their own, BOTH go into the answer —
  // everything they gave us counts.
  const sendActive = () => !!draft.trim() || selectedIdeas.length > 0;
  const sendOrContinue = () => {
    const typed = draft.trim();
    if (mode === 'text' && selectedIdeas.length) {
      submitText([...selectedIdeas, typed].filter(Boolean).join('. '));
      return;
    }
    if (typed) submitFreeText();
  };

  // Steps where the bottom text bar is live. Chip steps (sound/voice/
  // visionScene) accept a typed answer too; pure loaders/photo do not.
  const textBarActive =
    mode === 'text' || mode === 'sound' ||
    mode === 'voice' || mode === 'visionScene' || mode === 'visionText';

  // Placeholder copy tuned to the step so typing feels intentional, not a fallback.
  const textBarPlaceholder =
    phase === 'name' ? 'Type your name…'
    : phase === 'pain' ? 'Vent it all — or tap 🎤 to speak…'
    : mode === 'sound' ? 'Or describe the sound you want…'
    : mode === 'voice' ? 'Or describe the voice you want…'
    : mode === 'visionScene' || mode === 'visionText' ? 'Or describe how you want to look…'
    : 'Type or tap 🎤 to speak…';

  // ── Lyrics confirmed (possibly edited) → start the song + reveal INLINE ──
  const confirmLyrics = () => {
    const d = data.current;
    d.lyrics = lyricsDraft.trim() || d.lyrics;
    pushUser('Make my song 🎶');
    setPhase('generating');
    setMode('busy');
    botSay([`Let's make it real. 🎶`], 'busy');
    doneRef.current = true;
    onPersist?.({ msgs, phase: 'generating', mode: 'busy', vibes, data: { ...d }, nextId: idRef.current, done: true });
    // Kick off the song in the parent, then reveal the vision + songs right here.
    onComplete({ ...d });
    window.setTimeout(() => setRevealed(true), 900);
  };

  // Wipe the whole conversation and replay the opening — a dev/iteration aid so
  // you can run the chat from scratch over and over without reloading or
  // resuming a stale saved run. Clears the persisted snapshot too.
  const resetChat = () => {
    setMsgs([]);
    setPhase('name');
    setDraft('');
    setSelectedIdeas([]);
    // Clear the AI-personalized ideas + their request guards — otherwise a
    // replay shows the PREVIOUS run's suggestions for the new run's answers.
    setActionIdeas(null);
    setDreamIdeas(null);
    setVisionIdeas(null);
    setIdeasTimedOut(false);
    setOpenSection(null);
    actionReqRef.current = false;
    dreamReqRef.current = false;
    visionReqRef.current = false;
    setVibes([]);
    setRevealed(false);
    setStagedFaces([]);
    setLyricsDraft('');
    data.current = {
      name: '', pain: '', actions: '', dream: '',
      songAbout: '', detail: '', scene: '', why: '',
      soundStyle: '', voice: '', face: null, faces: [], visionScene: '',
      lyrics: '', title: '',
    };
    idRef.current = 0;
    doneRef.current = false;
    recoveredRef.current = false;
    onPersist?.({ msgs: [], phase: 'name', mode: 'busy', vibes: [], data: { ...data.current }, nextId: 0, done: false });
    botSay(
      [
        "Hey, it's Lovify. Let's make your comeback song. 🖤",
        "First, what's your name?",
      ],
      'text',
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: LOVIFY.bg }}>
      {/* Header — assistant identity, like a real chat thread. */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px 12px', borderBottom: `1px solid ${LOVIFY.line}` }}>
        <button onClick={onBack} aria-label="Back" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: LOVIFY.ink, fontSize: 22, lineHeight: 1 }}>‹</button>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
          <LovLogo size={28} />
        </div>
        <div>
          <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 800, color: LOVIFY.ink, letterSpacing: 0.2 }}>Lovify</div>
          <div style={{ fontFamily: SANS, fontSize: 12, color: LOVIFY.sub, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: '#34c759', display: 'inline-block' }} /> Online
          </div>
        </div>
        {/* Web: reset + music toggle in the header (the floating one is
            suppressed here). The reset replays the chat from scratch — a build
            aid for iterating on the conversation. */}
        {web && (
          <div style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={resetChat}
              aria-label="Reset chat"
              title="Reset chat"
              style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 17, cursor: 'pointer', padding: 0, background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" stroke={LOVIFY.ink} strokeWidth="1.9" strokeLinecap="round" fill="none" />
                <path d="M3 4.5V9h4.5" stroke={LOVIFY.ink} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </button>
            {onToggleSound && (
              <button
                onClick={onToggleSound}
                aria-label={playing ? 'Mute sound' : 'Play sound'}
                style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 17, cursor: 'pointer', padding: 0, background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
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
          </div>
        )}
      </div>

      {/* Transcript */}
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 16px 8px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {msgs.map((m) => (
          <Bubble key={m.id} msg={m} />
        ))}

        {/* The brainstorm ideas — Q2/Q3 only (the pain question gets no crutch:
            we want their own words). Shown AUTOMATICALLY under the question:
            AI-personalized to what they vented, grouped in tappable
            multi-select categories. Tapping a few AND typing combine into one
            answer when they hit ↑. */}
        {mode === 'text' && (phase === 'actions' || phase === 'dream') && (
          ideasPending ? (
            <div style={{ alignSelf: 'flex-start' }}>
              <LoaderLine lines={IDEA_LOADING_LINES} />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}
            >
              {currentIdeaSections().map((sec, si) => (
                <div key={sec.title || si} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sec.title && (
                    <button
                      onClick={() => setOpenSection(openSection === si ? null : si)}
                      style={{
                        textAlign: 'left', cursor: 'pointer', width: '100%',
                        padding: '12px 15px', borderRadius: 16,
                        background: openSection === si ? LOVIFY.orangeGradientSoft : 'rgba(255, 251, 244, 0.95)',
                        border: `1.5px solid ${openSection === si ? LOVIFY.orange : LOVIFY.line}`,
                        fontFamily: SANS, fontSize: 13.5, fontWeight: 800, color: LOVIFY.ink,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        boxShadow: '0 6px 16px -10px rgba(216,92,28,0.4)',
                      }}
                    >
                      <span>{sec.title}</span>
                      <span style={{ color: LOVIFY.orangeDeep }}>{openSection === si ? '▴' : '▾'}</span>
                    </button>
                  )}
                  {(!sec.title || openSection === si) && sec.ideas.map((idea) => {
                    const sel = web && selectedIdeas.includes(idea);
                    return (
                      <button
                        key={idea}
                        onClick={() => (web ? toggleIdea(idea) : submitText(idea))}
                        style={{
                          textAlign: 'left', cursor: 'pointer', width: '100%',
                          padding: '12px 15px', borderRadius: 16,
                          background: sel ? LOVIFY.orangeGradientSoft : 'rgba(255, 251, 244, 0.95)',
                          border: `1.5px solid ${sel ? LOVIFY.orange : LOVIFY.line}`,
                          fontFamily: SANS, fontSize: 14, lineHeight: 1.4, color: LOVIFY.ink, fontWeight: sel ? 700 : 400,
                          display: 'flex', gap: 9, alignItems: 'center',
                          boxShadow: '0 6px 16px -10px rgba(216,92,28,0.4)',
                        }}
                      >
                        <span style={{ color: LOVIFY.orangeDeep, fontWeight: 800, flexShrink: 0 }}>{sel ? '✓' : '+'}</span>
                        <span>{idea}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
              {web && selectedIdeas.length > 0 && (
                <div style={{ alignSelf: 'flex-start', padding: '2px 4px 0', fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: LOVIFY.orangeDeep }}>
                  {selectedIdeas.length} selected — add your own below, then tap ↑
                </div>
              )}
            </motion.div>
          )
        )}

        {mode === 'soundLoading' && (
          <div style={{ alignSelf: 'flex-start' }}>
            <LoaderLine lines={SOUND_LOADING_LINES} />
          </div>
        )}

        {mode === 'sound' && (
          <ChoiceList hint>
            {vibes.map((v) => (
              <Choice key={v.name} onClick={() => chooseVibe(v)} sub={v.description}>{v.emoji}  {v.name}</Choice>
            ))}
          </ChoiceList>
        )}

        {mode === 'voice' && (
          <ChoiceList hint>
            <Choice onClick={() => chooseVoice('Female voice')}>👩‍🎤  Female voice</Choice>
            <Choice onClick={() => chooseVoice('Male voice')}>👨‍🎤  Male voice</Choice>
          </ChoiceList>
        )}

        {(mode === 'visionScene' || mode === 'visionText') && (
          <ChoiceList hint>
            {visionSceneIdeas().map((idea) => (
              <Choice key={idea.t} onClick={() => chooseVisionScene(idea)}>{idea.e}  {idea.t}</Choice>
            ))}
          </ChoiceList>
        )}

        {/* The "wow" moment — vision + songs revealed right inside the chat. */}
        {revealed && (
          <ChatReveal
            title={song?.title || data.current.title}
            soundStyle={data.current.soundStyle}
            voice={data.current.voice}
            visionUrl={visionUrl ?? null}
            visionState={visionState ?? 'working'}
            song={song ?? null}
            songState={songState ?? 'working'}
            statusLine={songStatusLine ?? 'Composing your melody…'}
            onSave={onSave}
            onMedia={scrollToEnd}
            web={web}
          />
        )}
      </div>

      {/* Input zone — changes by mode (hidden once the song is revealed).
          While the bot is typing (`busy`), we keep a disabled placeholder bar
          in the SAME footprint as the text input so the bottom never collapses
          and reappears between turns — the chat bar stays put the whole way. */}
      <div style={{ flexShrink: 0, padding: revealed ? 0 : '8px 14px 18px' }}>
        {/* While the bot is typing (`busy`) or loading sounds (`soundLoading`),
            keep a disabled placeholder bar in the SAME footprint as the live
            text input so the bottom never collapses between turns. */}
        {!revealed && (mode === 'busy' || mode === 'soundLoading') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div
              aria-hidden
              style={{
                flex: 1, boxSizing: 'border-box', padding: '14px 16px', borderRadius: 22,
                background: 'rgba(255, 251, 244, 0.6)', border: `1.5px solid ${LOVIFY.line}`,
                fontFamily: SANS, fontSize: 15, color: LOVIFY.subSoft, opacity: 0.7,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {mode === 'soundLoading' ? 'Loading styles…' : 'Lovify is typing…'}
            </div>
            <button
              disabled
              aria-hidden
              style={{
                width: 46, height: 46, borderRadius: 23, border: 'none', flexShrink: 0,
                cursor: 'default', background: 'rgba(166,109,56,0.2)',
                color: '#fff', fontSize: 19, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >↑</button>
          </div>
        )}

        {/* The one, persistent chat input — live on the text step AND the chip
            steps (about/sound/voice/vision), so the bar never disappears. Typing
            routes to the right handler for the current step via submitFreeText;
            the chips above are shortcuts. */}
        {!revealed && textBarActive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitFreeText(); }}
              autoFocus
              placeholder={textBarPlaceholder}
              style={{
                flex: 1, boxSizing: 'border-box', padding: '14px 16px', borderRadius: 22,
                background: 'rgba(255, 251, 244, 0.9)', border: `1.5px solid ${draft.trim() ? LOVIFY.orange : LOVIFY.line}`,
                fontFamily: SANS, fontSize: 15, color: LOVIFY.ink, outline: 'none',
              }}
            />
            {phase !== 'name' && <MicButton onResult={(t) => setDraft((d) => (d.trim() ? d.trim() + ' ' : '') + t)} />}
            <button
              onClick={sendOrContinue}
              disabled={!sendActive()}
              aria-label={!draft.trim() && selectedIdeas.length > 0 ? 'Continue' : 'Send'}
              style={{
                width: 46, height: 46, borderRadius: 23, border: 'none', flexShrink: 0,
                cursor: sendActive() ? 'pointer' : 'default',
                background: sendActive() ? LOVIFY.orangeGradient : 'rgba(166,109,56,0.2)',
                color: '#fff', fontSize: 19, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >↑</button>
          </div>
        )}

        {mode === 'photo' && (
          <PhotoInput
            faces={stagedFaces}
            onAdd={addStagedFace}
            onRemove={removeStagedFace}
            onDone={confirmPhotos}
          />
        )}

        {mode === 'writing' && <LoaderLine lines={WRITING_LINES} centered />}

        {mode === 'lyricsReview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <textarea
              value={lyricsDraft}
              onChange={(e) => setLyricsDraft(e.target.value)}
              rows={9}
              style={{
                width: '100%', boxSizing: 'border-box', resize: 'none',
                padding: '14px 16px', borderRadius: 18,
                background: 'rgba(255, 251, 244, 0.95)', border: `1.5px solid ${LOVIFY.line}`,
                fontFamily: SANS, fontSize: 14, lineHeight: 1.6, color: LOVIFY.ink, outline: 'none',
                maxHeight: 260,
              }}
            />
            <button
              onClick={confirmLyrics}
              disabled={!lyricsDraft.trim()}
              style={{
                width: '100%', padding: '16px', borderRadius: 999, border: 'none',
                cursor: lyricsDraft.trim() ? 'pointer' : 'default',
                background: lyricsDraft.trim() ? LOVIFY.orangeGradient : 'rgba(166,109,56,0.2)', color: '#fff',
                fontFamily: SANS, fontSize: 15.5, fontWeight: 800,
                boxShadow: '0 12px 26px -12px rgba(216,92,28,0.6)',
              }}
            >
              Make my song 🎶
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Push-to-talk mic (Web Speech API) ──
// Lets people just TALK their answer instead of typing — great for getting
// specific detail quickly. Renders nothing where speech isn't supported
// (some embedded/older browsers); the native app uses its own voice pipeline.
function MicButton({ onResult, disabled }: { onResult: (t: string) => void; disabled?: boolean }) {
  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SR = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;
  useEffect(() => () => { try { recRef.current?.stop?.(); } catch { /* ignore */ } }, []);
  if (!SR) return null;
  const toggle = () => {
    if (listening) { try { recRef.current?.stop?.(); } catch { /* ignore */ } setListening(false); return; }
    try {
      const rec = new SR();
      rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1; rec.continuous = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (e: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const t = Array.from(e.results).map((r: any) => r[0]?.transcript || '').join(' ').trim();
        if (t) onResult(t);
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch { setListening(false); }
  };
  return (
    <button
      onClick={toggle}
      disabled={disabled}
      aria-label={listening ? 'Stop recording' : 'Speak your answer'}
      style={{
        width: 46, height: 46, borderRadius: 23, flexShrink: 0, cursor: 'pointer',
        border: `1.5px solid ${listening ? LOVIFY.orange : LOVIFY.line}`,
        background: listening ? LOVIFY.orangeGradientSoft : 'rgba(255,251,244,0.9)',
        color: listening ? LOVIFY.orangeDeep : LOVIFY.sub,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: listening ? 'lovPulse 1.1s ease-in-out infinite' : 'none',
      }}
    >
      <span style={{ fontSize: 18 }}>{listening ? '⏹' : '🎤'}</span>
    </button>
  );
}

// ── Message bubble ──
function Bubble({ msg }: { msg: ChatMsg }) {
  const isBot = msg.role === 'bot';
  if (msg.kind === 'typing') {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ alignSelf: 'flex-start' }}>
        <div style={{ ...bubbleBase, background: 'rgba(120,110,100,0.12)', color: LOVIFY.ink, display: 'flex', gap: 4, padding: '14px 16px' }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 7, height: 7, borderRadius: 4, background: 'rgba(80,70,60,0.45)', display: 'inline-block', animation: 'lovPulse 1s ease-in-out infinite', animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
      </motion.div>
    );
  }
  if (msg.kind === 'photo') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ alignSelf: 'flex-end' }}>
        <img src={msg.photo} alt="You" style={{ width: 110, height: 110, objectFit: 'cover', borderRadius: 18, border: `2px solid ${LOVIFY.orange}` }} />
      </motion.div>
    );
  }
  if (msg.kind === 'photoset') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ alignSelf: 'flex-end', display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '82%' }}>
        {(msg.photos || []).map((p, i) => (
          <img key={i} src={p} alt={`Person ${i + 1}`} style={{ width: 78, height: 78, objectFit: 'cover', borderRadius: 14, border: `2px solid ${LOVIFY.orange}` }} />
        ))}
      </motion.div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} style={{ alignSelf: isBot ? 'flex-start' : 'flex-end', maxWidth: '82%' }}>
      <div style={{
        ...bubbleBase,
        background: isBot ? 'rgba(120,110,100,0.12)' : LOVIFY.orangeGradient,
        color: isBot ? LOVIFY.ink : '#fff',
        borderBottomLeftRadius: isBot ? 6 : 20,
        borderBottomRightRadius: isBot ? 20 : 6,
      }}>
        {msg.text}
      </div>
    </motion.div>
  );
}

const bubbleBase: React.CSSProperties = {
  padding: '12px 16px', borderRadius: 20,
  fontFamily: SANS, fontSize: 15, lineHeight: 1.4, fontWeight: 500,
  boxShadow: '0 2px 8px -4px rgba(58,42,34,0.2)',
};

// ── The reveal (merged in from the old Magic Moment screen) ──
// Renders inline at the end of the chat: the vision on top, then two song
// version rows with play/pause + an animated waveform while playing, each with
// its own Save. Ducks the ambient soundtrack while a song plays.
let revealAmbientWasPlaying = false;
function duckRevealAmbient() {
  const a = document.querySelector('audio[data-ambient]') as HTMLAudioElement | null;
  if (a && !a.paused) { revealAmbientWasPlaying = true; a.pause(); }
}
function restoreRevealAmbient() {
  const a = document.querySelector('audio[data-ambient]') as HTMLAudioElement | null;
  if (a && revealAmbientWasPlaying) { a.play().catch(() => {}); }
  revealAmbientWasPlaying = false;
}

function RevealWave() {
  const bars = [11, 17, 9, 18, 13, 16, 10];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 18, marginTop: 3 }} aria-hidden>
      {bars.map((h, i) => (
        <motion.span
          key={i}
          style={{ width: 3, borderRadius: 2, background: LOVIFY.orange, display: 'block' }}
          animate={{ height: [h * 0.4, h, h * 0.55, h * 0.9, h * 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: i * 0.08 }}
        />
      ))}
    </div>
  );
}

// Determinate-feeling progress bar: creeps to ~92% over the typical generation
// time (~75s for a song), then snaps to 100% the moment the song is ready.
function RevealProgress({ done }: { done: boolean }) {
  return (
    <div style={{ height: 8, borderRadius: 999, background: 'rgba(166,109,56,0.16)', overflow: 'hidden', margin: '2px 8px 2px' }}>
      <motion.div
        style={{ height: '100%', borderRadius: 999, background: LOVIFY.orangeGradient }}
        initial={{ width: '8%' }}
        animate={{ width: done ? '100%' : '92%' }}
        transition={{ duration: done ? 0.5 : 75, ease: done ? 'easeOut' : 'easeInOut' }}
      />
    </div>
  );
}

function RevealSpinner({ small = false }: { small?: boolean }) {
  const size = small ? 18 : 30;
  return (
    <svg width={size} height={size} viewBox="0 0 50 50">
      <circle cx="25" cy="25" r="20" fill="none" stroke={small ? '#fff' : 'rgba(255,255,255,0.85)'} strokeWidth="5" strokeLinecap="round" strokeDasharray="80 50">
        <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.9s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function ChatReveal({
  title, soundStyle, voice, visionUrl, visionState, song, songState, statusLine, onSave, onMedia, web,
}: {
  title: string; soundStyle: string; voice: string;
  visionUrl: string | null; visionState: SlotState;
  song: GeneratedSong | null; songState: SlotState; statusLine: string;
  onSave?: (version?: number) => void; onMedia?: () => void; web?: boolean;
}) {
  const [playing, setPlaying] = useState<number | null>(null);
  // Web: pulse the play buttons until the user plays a version, then calm down.
  const [playedAny, setPlayedAny] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => () => {
    const a = audioRef.current;
    if (a && !a.paused) { a.pause(); restoreRevealAmbient(); }
  }, []);
  const songReady = songState === 'done' && !!song?.audio_url;
  const songWorking = songState === 'working' || songState === 'idle';
  const songFailed = songState === 'failed';
  const heroGradient = 'linear-gradient(160deg, #f6c79b 0%, #e88f4e 55%, #c25c22 100%)';
  const styleLabel = soundStyle ? soundStyle.split(' — ')[0] : 'Your custom sound';
  const voiceLabel = voice || 'Your voice';
  const headline = songFailed ? 'Almost — let\'s try that again' : songReady ? 'Your song is ready!' : 'Creating your song…';
  const sub = songFailed
    ? 'We couldn\'t reach the studio. Check your connection and try again.'
    : songReady ? (title || 'Press play and picture it — this is you, living it.') : statusLine;
  const toggle = (n: number) => {
    const a = audioRef.current;
    if (!a || !songReady) return;
    if (playing === n) { a.pause(); setPlaying(null); restoreRevealAmbient(); }
    else { duckRevealAmbient(); a.play().then(() => { setPlaying(n); setPlayedAny(true); }).catch(() => {}); }
  };
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} style={{ alignSelf: 'stretch', width: '100%', display: 'flex', flexDirection: 'column', gap: 12, marginTop: 6, paddingBottom: 8 }}>
      <div style={{ textAlign: 'center', padding: '0 6px' }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 18, color: LOVIFY.ink }}>{headline}</div>
        <div style={{ marginTop: 4, fontFamily: SANS, fontSize: 13.5, fontWeight: songReady ? 700 : 500, color: songFailed ? LOVIFY.sub : songReady ? LOVIFY.orangeDeep : LOVIFY.sub }}>{sub}</div>
      </div>

      {/* Progress bar while the song + vision are being created. */}
      {(songWorking || songReady) && <RevealProgress done={songReady} />}

      {/* Vision on top — magical reveal on web once the image arrives. */}
      <div style={{ position: 'relative' }}>
        {web && visionUrl && (
          <motion.div
            aria-hidden
            style={{ position: 'absolute', inset: -12, borderRadius: 30, background: 'radial-gradient(circle at 50% 42%, rgba(245,183,61,0.55), rgba(237,122,42,0.16) 55%, transparent 75%)', filter: 'blur(14px)', zIndex: 0 }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: [0, 1, 0.6], scale: [0.9, 1.06, 1] }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        )}
        <div style={{ position: 'relative', zIndex: 1, borderRadius: 22, overflow: 'hidden', aspectRatio: '4 / 3', background: heroGradient, boxShadow: '0 18px 40px -20px rgba(58,42,34,0.6)', border: `1px solid ${LOVIFY.line}` }}>
          {visionUrl ? (
            web ? (
              <>
                <motion.img
                  src={visionUrl} alt="Your vision" onLoad={onMedia}
                  initial={{ opacity: 0, scale: 1.04, filter: 'blur(16px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <motion.div
                  aria-hidden
                  style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.5) 50%, transparent 65%)' }}
                  initial={{ x: '-130%' }} animate={{ x: '130%' }} transition={{ duration: 1.1, ease: 'easeInOut', delay: 0.5 }}
                />
              </>
            ) : (
              <img src={visionUrl} alt="Your vision" onLoad={onMedia} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            )
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              {visionState === 'failed'
                ? <span style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>you, living it</span>
                : <><RevealSpinner /><span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.95)', textShadow: '0 1px 6px rgba(0,0,0,0.3)' }}>Painting your vision…</span></>}
            </div>
          )}
        </div>
        {web && visionUrl && [
          { x: '5%', y: '10%', d: 0.3, s: 16 }, { x: '90%', y: '8%', d: 0.6, s: 19 },
          { x: '93%', y: '66%', d: 0.9, s: 14 }, { x: '4%', y: '72%', d: 0.5, s: 15 },
        ].map((sp, i) => (
          <motion.span
            key={i} aria-hidden
            style={{ position: 'absolute', left: sp.x, top: sp.y, fontSize: sp.s, zIndex: 2, pointerEvents: 'none' }}
            initial={{ opacity: 0, scale: 0.4, y: 6 }}
            animate={{ opacity: [0, 1, 0], scale: [0.4, 1.1, 0.6], y: [6, -10, -18] }}
            transition={{ duration: 1.6, ease: 'easeOut', delay: sp.d, repeat: Infinity, repeatDelay: 1.8 }}
          >
            ✨
          </motion.span>
        ))}
      </div>

      {/* Two song version rows */}
      {[0, 1].map((n) => {
        const on = playing === n;
        // Web: draw attention to play until a version is played.
        const pulse = !!web && songReady && !playedAny && !on;
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 16, background: 'rgba(255,251,244,0.97)', border: `1px solid ${LOVIFY.line}`, boxShadow: '0 10px 24px -16px rgba(58,42,34,0.5)' }}>
            <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
              {pulse && (
                <motion.span
                  aria-hidden
                  style={{ position: 'absolute', inset: 0, borderRadius: 24, background: LOVIFY.orange }}
                  animate={{ scale: [1, 1.7], opacity: [0.55, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
              <motion.button
                onClick={songReady ? () => toggle(n) : undefined}
                disabled={!songReady}
                aria-label={on ? 'Pause' : 'Play'}
                animate={pulse ? { scale: [1, 1.09, 1] } : { scale: 1 }}
                transition={{ duration: 1.5, repeat: pulse ? Infinity : 0, ease: 'easeInOut' }}
                style={{ position: 'relative', width: 48, height: 48, borderRadius: 24, border: 'none', cursor: songReady ? 'pointer' : 'default', background: songWorking ? 'rgba(166,109,56,0.18)' : LOVIFY.orangeGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: songReady ? '0 8px 20px -8px rgba(216,92,28,0.65)' : 'none' }}
              >
                {songWorking ? <RevealSpinner small /> : <span style={{ color: '#fff', fontSize: 18, marginLeft: on ? 0 : 2 }}>{on ? '⏸' : '▶'}</span>}
              </motion.button>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 800, color: LOVIFY.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(song?.title || title || 'Your song')} · Version {n + 1}</div>
              {on
                ? <RevealWave />
                : <div style={{ fontFamily: SANS, fontSize: 12.5, color: LOVIFY.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{songWorking ? 'Producing your song…' : `${styleLabel} · ${voiceLabel}`}</div>}
            </div>
            <button
              onClick={() => onSave?.(n)}
              disabled={!songReady}
              style={{ flexShrink: 0, padding: '9px 16px', borderRadius: 999, border: 'none', cursor: songReady ? 'pointer' : 'default', background: songReady ? LOVIFY.orangeGradient : 'rgba(166,109,56,0.18)', color: songReady ? '#fff' : LOVIFY.subSoft, fontFamily: SANS, fontSize: 13.5, fontWeight: 800 }}
            >
              Save
            </button>
          </div>
        );
      })}

      {song?.audio_url && (
        <audio ref={audioRef} src={song.audio_url} preload="auto" onEnded={() => { setPlaying(null); restoreRevealAmbient(); }} />
      )}

      <div style={{ textAlign: 'center', padding: '2px 8px 0', minHeight: 18 }}>
        <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: LOVIFY.sub }}>
          {songFailed ? '' : songWorking ? 'Hang tight — building your vision + song…' : 'Tap ▶ to listen, then Save the one you love'}
        </span>
      </div>

      {/* Retention — the daily ritual + "chapter one" framing, right where the
          song lands. The first song is the start of the story, not the end. */}
      {songReady && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}
          style={{ padding: '12px 15px', borderRadius: 16, background: LOVIFY.orangeGradientSoft, border: `1.5px solid ${LOVIFY.line}`, display: 'flex', flexDirection: 'column', gap: 7 }}
        >
          <span style={{ fontFamily: SANS, fontSize: 13.5, color: LOVIFY.ink, lineHeight: 1.5 }}>
            <strong>🌅 Your ritual:</strong> tomorrow, when your alarm goes off — press play. Every morning. That&apos;s how you rewire.
          </span>
          <span style={{ fontFamily: SANS, fontSize: 13.5, color: LOVIFY.ink, lineHeight: 1.5 }}>
            This is <strong>chapter one</strong> of your comeback. When you&apos;re ready for the next chapter, come back and tell me what you&apos;re changing next — we&apos;ll write that song too.
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Choice list (tappable quick-reply answers) ──
// Lives inside the scrolling transcript, so it flows naturally (no nested
// scroll/clamp) and the transcript itself handles overflow.
function ChoiceList({ children, hint }: { children: React.ReactNode; hint?: boolean }) {
  return (
    <div style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8, marginTop: 2 }}>
      {hint && <div style={{ fontFamily: SANS, fontSize: 12, color: LOVIFY.subSoft, marginBottom: 2 }}>Tap one — or type your own below</div>}
      {children}
    </div>
  );
}

function Choice({ children, onClick, sub }: { children: React.ReactNode; onClick: () => void; sub?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left', cursor: 'pointer', width: '100%',
        padding: sub ? '12px 16px' : '14px 16px', borderRadius: 18,
        background: 'rgba(255, 251, 244, 0.95)', border: `1.5px solid ${LOVIFY.line}`,
        fontFamily: SANS, fontSize: 15, fontWeight: 700, color: LOVIFY.ink,
        boxShadow: '0 6px 16px -10px rgba(216,92,28,0.4)',
        transition: 'all 140ms ease',
      }}
    >
      <span>{children}</span>
      {sub && <span style={{ display: 'block', marginTop: 3, fontFamily: SANS, fontSize: 12.5, fontWeight: 400, color: LOVIFY.sub, lineHeight: 1.35 }}>{sub}</span>}
    </button>
  );
}

// ── Inline multi-photo picker (you + partner / family / friends) ──
// No skip: the photo is required — the next step puts THEM in their vision.
function PhotoInput({
  faces, onAdd, onRemove, onDone,
}: {
  faces: string[];
  onAdd: (face: string) => void;
  onRemove: (i: number) => void;
  onDone: () => void;
}) {
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => onAdd(reader.result as string);
      reader.readAsDataURL(file);
    });
  };
  const MAX = 5;
  const canAddMore = faces.length < MAX;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Thumbnails of everyone added so far */}
      {faces.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {faces.map((f, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <img src={f} alt={`Person ${i + 1}`} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 14, border: `2px solid ${LOVIFY.orange}` }} />
              <button
                onClick={() => onRemove(i)}
                aria-label="Remove"
                style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', cursor: 'pointer', fontSize: 13, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
              >×</button>
              {i === 0 && (
                <span style={{ position: 'absolute', bottom: 2, left: 4, fontFamily: SANS, fontSize: 9.5, fontWeight: 800, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>You</span>
              )}
            </div>
          ))}
        </div>
      )}

      {canAddMore && (
        <label style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer',
          padding: '14px', borderRadius: 18,
          background: faces.length ? 'rgba(255,251,244,0.95)' : LOVIFY.orangeGradient,
          color: faces.length ? LOVIFY.orangeDeep : '#fff',
          border: faces.length ? `1.5px solid ${LOVIFY.orange}` : 'none',
          fontFamily: SANS, fontSize: 15, fontWeight: 800,
          boxShadow: faces.length ? 'none' : '0 12px 26px -12px rgba(216,92,28,0.6)',
        }}>
          <input type="file" accept="image/*" multiple {...(faces.length === 0 ? { capture: 'user' as const } : {})} onChange={handle} style={{ display: 'none' }} />
          <span style={{ fontSize: 18 }}>📷</span> {faces.length === 0 ? 'Add my photo' : 'Add someone else'}
        </label>
      )}

      {faces.length > 0 && (
        <button
          onClick={onDone}
          style={{
            width: '100%', padding: '15px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: LOVIFY.orangeGradient, color: '#fff',
            fontFamily: SANS, fontSize: 15.5, fontWeight: 800, boxShadow: '0 12px 26px -12px rgba(216,92,28,0.6)',
          }}
        >
          Continue{faces.length > 1 ? ` with all ${faces.length}` : ''} →
        </button>
      )}
    </div>
  );
}

// Offline fallback vibes (only used if suggest-song-styles can't run).
const FALLBACK_VIBES: SoundVibe[] = [
  { name: 'Comeback Anthem', description: 'Starts low and quiet, builds to a triumphant, fists-up chorus.', genre: 'pop', emoji: '🔥' },
  { name: 'Rise-Up Pop', description: 'Bright, driving production with soaring, hopeful vocals.', genre: 'pop', emoji: '👑' },
  { name: 'Soulful Redemption', description: 'Smooth keys and lush harmonies that turn pain into power.', genre: 'r-n-b', emoji: '🌙' },
  { name: 'Cinematic Comeback', description: 'Sweeping strings building from darkness to a triumphant swell.', genre: 'cinematic', emoji: '🎻' },
];