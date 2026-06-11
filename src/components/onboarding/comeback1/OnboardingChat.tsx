// @ts-nocheck -- ported from the (non-strict) Lovify app repo; web2app funnel code
/* Lovify Onboarding v3 — the Song Chat.
 *
 * Replaces the old quiz screens (song-about → detail → scene → why → photo →
 * sound → voice → lyrics) with ONE conversational experience that feels like
 * the in-app Create chat: a warm assistant ("Lovify") asks one thing at a
 * time, mirrors the user's exact words back, and uses their first name.
 *
 * It's a SCRIPTED flow (fixed, conversion-friendly question order) with
 * lightweight AI-style mirroring done client-side, plus three real calls:
 *   • suggest-song-styles  → 4 sound options as chips
 *   • creative-assistant   → the lyrics (at the end)
 * The vision + song generation themselves are kicked off by the parent flow
 * (onPhoto pre-warms the vision; onComplete starts the song), then the reveal
 * screen shows the finished result.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { LOVIFY, SANS, SERIF } from '@/components/onboarding/v3/theme';
import { LovLogo } from '@/components/onboarding/v3/primitives';
import {
  suggestSoundStyles, buildStyleContext, generateLyrics, type SoundVibe,
} from '@/components/onboarding/v3/generation';
import type { GeneratedSong } from '@/components/onboarding/v3/generation';

type SlotState = 'idle' | 'working' | 'done' | 'failed';

type Phase =
  | 'name' | 'about' | 'detail' | 'scene' | 'why'
  | 'photo' | 'visionScene' | 'sound' | 'voice'
  | 'writing' | 'lyricsReview' | 'generating';

type InputMode =
  | 'busy' | 'text' | 'about' | 'photo' | 'visionScene' | 'visionText'
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

const ABOUT_OPTIONS = [
  { e: '🌟', l: 'Who I want to be' },
  { e: '✨', l: 'Something I want to experience' },
  { e: '💪', l: 'Overcoming a problem' },
  { e: '❤️', l: 'Someone I love' },
];

// Web funnel: warmer, improvement-framed labels for the first question. `key`
// maps back to the internal option above so all the downstream tailoring
// (reaction / detail question / idea banks) keeps working unchanged.
const ABOUT_OPTIONS_WEB = [
  { e: '🌟', l: "Becoming who I'm meant to be", key: 'Who I want to be' },
  { e: '💪', l: 'Overcoming a big problem', key: 'Overcoming a problem' },
  { e: '🎯', l: 'Achieving a big goal', key: 'Something I want to experience' },
  { e: '🧠', l: 'Improving my mindset', key: 'Improving my mindset' },
];

// The detail question is tailored to what they picked — exactly what the user
// asked for. {name} is filled with their first name.
const DETAIL_QUESTION: Record<string, string> = {
  'Who I want to be': 'Who do you want to be, {name}? Describe it in specific detail — like it\'s already you.',
  'Something I want to experience': 'What do you want to experience, {name}? Describe it in specific detail.',
  'Overcoming a problem': 'Imagine you\'ve already beaten it, {name} — what does the best-case version of your life look like now? Describe it in specific detail.',
  'Someone I love': 'Who\'s this song for — and what do you want them to feel, {name}? Describe it in specific detail.',
  'Improving my mindset': 'What\'s one thing about how you think or feel that you\'d love to change, {name}?',
};

const ABOUT_REACTION: Record<string, string> = {
  'Who I want to be': 'Ooh, I love this one.',
  'Something I want to experience': 'Yes — let\'s make it real.',
  'Overcoming a problem': 'I\'ve got you.',
  'Someone I love': 'That\'s beautiful.',
  'Improving my mindset': 'I hear you — that\'s a powerful place to start.',
};

// ── "Help me imagine" idea banks ──────────────────────────────────
// For users who are low, stuck, or just can't find the words. Tapping an
// idea sends it forward as their answer. The detail ideas are tailored to
// what they're making the song about; scene/why are warm, universal starters.
const DETAIL_IDEAS: Record<string, string[]> = {
  'Who I want to be': [
    'Someone calm and confident, who walks into any room feeling enough',
    'A strong, healthy version of me with energy for the people I love',
    'Financially free — not stressed about money anymore',
    'Someone who finally believes in themselves and goes for it',
    'A present, patient parent my kids feel safe with',
    'Disciplined and focused — the person who actually follows through',
  ],
  'Something I want to experience': [
    'Waking up in a home by the ocean with nowhere I have to be',
    'Traveling somewhere new, fully present, no guilt, no rush',
    'Standing on a stage doing the thing I always dreamed of',
    'Falling in love and feeling completely safe with someone',
    'Holding the life I built and realizing I actually made it',
    'A quiet morning where everything finally feels okay',
  ],
  'Overcoming a problem': [
    'Waking up free from the anxiety that\'s been following me',
    'Finally past the heartbreak — whole and at peace again',
    'Stronger than the habit that\'s been holding me back',
    'Out of debt, breathing easy, in control of my money',
    'Healed from what happened and proud of how far I\'ve come',
    'Confident in my body after everything it\'s been through',
  ],
  'Someone I love': [
    'My mom — I want her to know how much she means to me',
    'My partner — I want them to feel chosen, every day',
    'My kids — I want them to always feel how loved they are',
    'A friend going through it — I want them to feel less alone',
    'Someone I lost — a song to keep them close',
    'My younger self — everything I wish they\'d heard',
  ],
};
const DETAIL_IDEAS_DEFAULT = [
  'A version of me that feels calm, confident, and free',
  'Waking up genuinely excited about my life',
  'Feeling proud of who I\'ve become',
  'Surrounded by the people I love, fully present',
  'Strong, healthy, and full of energy',
  'Finally at peace with myself',
];
const SCENE_IDEAS = [
  'Golden morning light, coffee in my hands, total calm',
  'By the ocean — salt air, waves, nowhere I need to be',
  'Surrounded by the people I love, everyone laughing',
  'On a stage, lights up, the crowd on their feet',
  'In my own home that finally feels like mine',
  'Driving with the windows down, free and wide open',
];
const WHY_IDEAS = [
  'Because I\'ve felt small for too long and I\'m done',
  'Because the people I love deserve the best version of me',
  'Because I want to prove to myself that I can',
  'Because I\'m ready to feel alive again',
  'Because I\'ve worked so hard — I want to feel it',
  'Because I want to remember who I really am',
];

// Web funnel: shorter, multi-select idea chips (tap a few → Continue). Keyed by
// the same internal option keys as DETAIL_IDEAS so the selection still routes.
const DETAIL_IDEAS_WEB: Record<string, string[]> = {
  'Who I want to be': [
    'Calm and confident', 'Strong and healthy', 'Financially free',
    'I believe in myself', 'Present and patient', 'Disciplined and focused',
  ],
  'Something I want to experience': [
    'A home by the ocean', 'Travelling the world', 'On a stage, living my dream',
    'Deeply in love', 'Proud of what I built', 'Calm, peaceful mornings',
  ],
  'Overcoming a problem': [
    'Free from anxiety', 'Past the heartbreak', 'Stronger than my habits',
    'Out of debt', 'Healed and proud', 'Confident in my body',
  ],
  'Improving my mindset': [
    'Be kinder to myself', 'Worry & overthink less', 'Believe in myself more',
    'Stay calm under pressure', 'Stop comparing myself', 'Be more focused',
  ],
};
const DETAIL_IDEAS_DEFAULT_WEB = [
  'Calm and confident', 'Excited about life', 'Proud of who I am',
  'Present with loved ones', 'Strong and healthy', 'At peace with myself',
];
const SCENE_IDEAS_WEB = [
  'Golden morning calm', 'By the ocean', 'Surrounded by loved ones',
  'On a stage', 'In my dream home', 'Windows down, free',
];
const WHY_IDEAS_WEB = [
  "I've felt small too long", 'My loved ones deserve my best', 'To prove I can',
  'Ready to feel alive', "I've worked so hard for this", 'To remember who I am',
];

// Web-only overrides for the detail question — more accessible, concrete wording
// for the abstract paths (people have clarity on what to change / their goal,
// not on "who they're meant to be"). Falls back to the shared map when absent.
const DETAIL_QUESTION_WEB: Record<string, string> = {
  'Who I want to be': 'When you picture the best version of you, what\'s different about your life, {name}?',
  'Something I want to experience': 'What\'s the big goal or moment you\'re going for, {name}? Describe it like it\'s already happening.',
};

// ── Vision-scene ideas: concrete IMAGE looks the user can pick after adding
// their photo, so the generated picture is specific to them (not a generic
// Gemini guess). Tailored to what the song is about. {who} = "you" or "you
// and the people you added".
// Identity-statement vision looks — "the version of me" the user wants to SEE,
// phrased as who they're becoming (not abstract moods). Tailored to the goal.
const VISION_SCENE_IDEAS: Record<string, { e: string; t: string; prompt: string }[]> = {
  'Who I want to be': [
    { e: '🏆', t: 'The successful me', prompt: 'as a successful, accomplished version of myself at the peak of my goals, glowing with quiet pride, cinematic golden light' },
    { e: '👑', t: 'The confident me', prompt: 'as a radiantly confident version of myself, standing tall, walking into any room feeling enough, cinematic and majestic' },
    { e: '🌅', t: 'The calm, grounded me', prompt: 'as a calm, grounded version of myself at sunrise by the water, serene and quietly powerful' },
    { e: '🔥', t: 'The unstoppable me', prompt: 'as a fierce, unstoppable version of myself, glowing with energy and determination' },
  ],
  'Something I want to experience': [
    { e: '🏝️', t: 'Me, living the dream', prompt: 'as myself living the dream in a breathtaking destination, golden light, completely free' },
    { e: '🎉', t: 'Me at the moment I made it', prompt: 'as myself in the joyful moment I dreamed of, celebrating, radiant and alive' },
    { e: '✈️', t: 'Me, free & adventurous', prompt: 'as myself out in a stunning landscape, arms open, free and alive, cinematic travel vibe' },
    { e: '🌇', t: 'Me, blissful & at peace', prompt: 'as myself bathed in warm golden-hour light, peaceful and full of wonder' },
  ],
  'Overcoming a problem': [
    { e: '🚀', t: 'The thriving, successful me', prompt: 'as a thriving, successful version of myself in full control, glowing with accomplishment, cinematic' },
    { e: '💪', t: 'The me who beat it', prompt: 'as a strong, victorious version of myself having overcome it, breaking into the light, triumphant' },
    { e: '🕊️', t: 'The free, at-peace me', prompt: 'as a calm, at-peace version of myself, a weight finally lifted, soft warm light, serene' },
    { e: '🌄', t: 'Me, brand-new chapter', prompt: 'as myself at sunrise on a mountaintop, the hard part behind me, hopeful and renewed' },
  ],
  'Someone I love': [
    { e: '❤️', t: 'Us, together & glowing', prompt: 'together in a warm, intimate, loving moment, soft golden light, tender and beautiful' },
    { e: '🏡', t: 'Our happy life', prompt: 'cozy at home together, warm and happy, full of love and comfort' },
    { e: '🌅', t: 'A perfect day together', prompt: 'sharing a perfect golden-hour moment outdoors together, joyful and connected' },
    { e: '✨', t: 'A timeless portrait', prompt: 'a timeless, cinematic portrait together, glowing with love and meaning' },
  ],
};
const VISION_SCENE_DEFAULT = [
  { e: '🏆', t: 'The successful me', prompt: 'as a successful, accomplished version of myself, glowing with quiet pride, cinematic golden light' },
  { e: '👑', t: 'The confident me', prompt: 'as a bold, confident version of myself that radiates success' },
  { e: '🕊️', t: 'The calm, at-peace me', prompt: 'as a calm, serene, at-peace version of myself, soft natural light' },
  { e: '🎉', t: 'Me, celebrating life', prompt: 'as myself in a joyful, celebratory moment, radiant and alive' },
];

// Cycling status loaders — the waits should read as work happening.
const SOUND_LOADING_LINES = [
  'Loading styles…',
  'Listening to your story…',
  'Matching sounds to your story…',
  'Tuning the energy…',
];
const WRITING_LINES = [
  'Studying who you want to become…',
  'Finding the beliefs that set you free…',
  'Writing your new identity statements…',
  'Making your dream feel real — now…',
  'Choosing words that rewire your mind…',
  'Turning it all into your anthem…',
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

function fill(t: string, name: string): string {
  return t.replace(/\{name\}/g, name || 'friend');
}

// Tiny offline fallback so the song can still attempt if lyrics fail.
function fallbackLyrics(detail: string, why: string): string {
  const a = shortQuote(detail) || 'this life I see';
  const b = shortQuote(why) || 'everything I am';
  return `[Verse 1]\nI can see it clear as morning light\n${a}\nNo more standing still, no more doubt\nThis is the life I'm stepping into\n\n[Chorus]\nI'm coming alive, I feel it now\n${b}\nThis is who I'm meant to be`;
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
  genres, onPhoto, onComplete, onBack, persisted, onPersist,
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
  // Snapshots saved by the comeback-questions chat restore into phases that
  // don't exist in this flow — discard those and start fresh.
  if (persisted && ['pain', 'dream', 'actions'].includes(persisted.phase as string)) persisted = null;
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => persisted?.msgs ?? []);
  const [phase, setPhase] = useState<Phase>(() => persisted?.phase ?? 'name');
  const [mode, setMode] = useState<InputMode>(() => persisted?.mode ?? 'busy');
  const [draft, setDraft] = useState('');
  const [showIdeas, setShowIdeas] = useState(false);
  // Web "Help me imagine" is multi-select: tap several short ideas, then Continue.
  const [selectedIdeas, setSelectedIdeas] = useState<string[]>([]);
  const toggleIdea = (idea: string) =>
    setSelectedIdeas((s) => (s.includes(idea) ? s.filter((x) => x !== idea) : [...s, idea]));
  const [vibes, setVibes] = useState<SoundVibe[]>(() => persisted?.vibes ?? []);
  // True once lyrics are confirmed — the reveal (vision + songs) renders inline
  // at the bottom of the chat. Restored straight to revealed on back-nav.
  const [revealed, setRevealed] = useState(() => !!persisted?.done);

  // Collected answers (kept in a ref so async generation reads the latest).
  const data = useRef<ChatResult>(persisted?.data ?? {
    name: '', songAbout: '', detail: '', scene: '', why: '',
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
  // Collapse the auto-grown textarea back to one line once the draft is sent.
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (!draft && inputRef.current) inputRef.current.style.height = 'auto'; }, [draft]);
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
        web
          ? "Hey it's Lovify. It's time to become the person you were meant to be!"
          : "Hey! I'm going to help you make your very first song. 🎶",
        web ? "First, what's your name?" : "First — what should I call you?",
      ],
      'text',
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load AI sound styles when we enter the sound phase.
  useEffect(() => {
    if (mode !== 'soundLoading') return;
    const d = data.current;
    const ctx = buildStyleContext({
      songAbout: d.songAbout, detailText: d.detail, scene: d.scene, why: d.why, genres,
    });
    let cancelled = false;
    suggestSoundStyles(ctx, [], 0)
      .then((v) => { if (!cancelled) { setVibes(v); setMode('sound'); } })
      .catch(() => { if (!cancelled) { setVibes(FALLBACK_VIBES); setMode('sound'); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const name = data.current.name;

  // Ideas to show under "Help me imagine" for the current question.
  const currentIdeas = (): string[] => {
    if (phase === 'detail') return web
      ? (DETAIL_IDEAS_WEB[data.current.songAbout] || DETAIL_IDEAS_DEFAULT_WEB)
      : (DETAIL_IDEAS[data.current.songAbout] || DETAIL_IDEAS_DEFAULT);
    if (phase === 'scene') return web ? SCENE_IDEAS_WEB : SCENE_IDEAS;
    if (phase === 'why') return web ? WHY_IDEAS_WEB : WHY_IDEAS;
    return [];
  };

  // ── Text answers (name / detail / scene / why) ──
  // Accepts an explicit value so a tapped "imagine" idea can move forward too.
  const submitText = (override?: string) => {
    const value = (override ?? draft).trim();
    if (!value) return;
    setDraft('');
    setShowIdeas(false);
    setSelectedIdeas([]);
    pushUser(value);

    if (phase === 'name') {
      const fn = firstName(value);
      data.current.name = fn;
      setPhase('about');
      botSay(
        web
          ? [`Hi ${fn}. Nice to meet you.`, 'Tell me — what would make the biggest difference to creating a life that you love?']
          : [`Love that — hey ${fn}! 🧡`, 'So tell me… what should your first song be about?'],
        'about',
      );
    } else if (phase === 'detail') {
      data.current.detail = value;
      setPhase('scene');
      // The old clipped "quote-back" reads broken on a real, longer answer. On
      // web, warmly affirm it instead of parroting a fragment.
      const detailAck = web
        ? `I love that, ${name} — I can tell this really matters to you. 🔥`
        : `"${shortQuote(value)}" — I love that.`;
      botSay([
        detailAck,
        `Close your eyes for a second, ${name}. Picture it like it's already real… what do you see around you? Where are you?`,
      ], 'text');
    } else if (phase === 'scene') {
      data.current.scene = value;
      setPhase('why');
      botSay([`I can see it. 🌅`, `And why does this matter so much to you, ${name}?`], 'text');
    } else if (phase === 'why') {
      data.current.why = value;
      setPhase('photo');
      botSay([
        `That right there — that's the heart of your song.`,
        `Now add a photo of yourself, ${name} — and anyone else you want in the picture (partner, family, friends).`,
      ], 'photo');
    }
  };

  // ── Song-about chosen (chip) or free-typed. `bubble` is what we echo back as
  // the user's message; `key` selects the tailored reaction/detail question (a
  // free-typed answer falls back to the generic copy). ──
  const chooseAbout = (label: string, bubble?: string) => {
    data.current.songAbout = label;
    pushUser(bubble ?? label);
    setPhase('detail');
    const detailQ = (web && DETAIL_QUESTION_WEB[label]) || DETAIL_QUESTION[label] || 'Describe it in specific detail, {name}.';
    botSay([fill(ABOUT_REACTION[label] || 'Love it.', name), fill(detailQ, name)], 'text');
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
    const who = faces.length > 1 ? `you and your ${faces.length - 1=== 1 ? 'person' : 'people'}` : 'you';
    botSay([
      faces.length > 1 ? `Love it — all ${faces.length} of you. ✨` : `Perfect. That's going to look incredible. ✨`,
      `Now let's picture YOU in it, ${name}. Which version of you should we bring to life? (or tap "Describe my own" to say it your way)`,
    ], 'visionScene');
  };
  const skipPhoto = () => {
    pushUser('Maybe later');
    data.current.faces = [];
    data.current.face = null;
    setPhase('visionScene');
    botSay([`No worries — we can add it anytime.`, `Which version of you should we picture, ${name}? (or describe your own)`], 'visionScene');
  };

  // ── Vision-scene (image look) chosen → pre-warm the image, move to sound ──
  const visionSceneIdeas = () => VISION_SCENE_IDEAS[data.current.songAbout] || VISION_SCENE_DEFAULT;
  const chooseVisionScene = (idea: { t: string; prompt: string }) => {
    data.current.visionScene = idea.prompt;
    pushUser(idea.t);
    // Pre-warm the vision now that we know the look + have the face(s).
    onPhoto(data.current.face, {
      songAbout: data.current.songAbout, scene: data.current.scene,
      detail: data.current.detail, visionScene: idea.prompt,
    });
    setPhase('sound');
    botSay([`Beautiful choice. 🎨`, `Now let's make it sound like you. Which of these feels right, ${name}?`], 'soundLoading');
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
    botSay([`Love it — I can see it. 🎨`, `Now let's make it sound like you. Which of these feels right, ${name}?`], 'soundLoading');
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
    })
      .then((res) => {
        d.lyrics = res.content; d.title = res.title;
        if (res.style) d.soundStyle = res.style;
      })
      .catch(() => { d.lyrics = fallbackLyrics(d.detail, d.why); d.title = 'Your Song'; })
      .finally(() => {
        setLyricsDraft(d.lyrics);
        setPhase('lyricsReview');
        if (announce) {
          botSay([
            `Here's your song, ${name} — this is what we'll plant in your mind. 🧠`,
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
    if (mode === 'about') { setDraft(''); setShowIdeas(false); chooseAbout(value); return; }
    if (mode === 'sound') { setDraft(''); chooseVibeText(value); return; }
    if (mode === 'voice') { setDraft(''); chooseVoice(value); return; }
    if (mode === 'visionScene' || mode === 'visionText') { chooseVisionText(); return; }
    submitText();
  };

  // The bottom-right ↑ doubles as the "Continue" for multi-select ideas: if the
  // user has typed something, send that; otherwise submit their selected ideas.
  const sendActive = () => !!draft.trim() || selectedIdeas.length > 0;
  const sendOrContinue = () => {
    if (draft.trim()) { submitFreeText(); return; }
    if (selectedIdeas.length) submitText(selectedIdeas.join(', '));
  };

  // Steps where the bottom text bar is live. Chip steps (about/sound/voice/
  // visionScene) accept a typed answer too; pure loaders/photo do not.
  const textBarActive =
    mode === 'text' || mode === 'about' || mode === 'sound' ||
    mode === 'voice' || mode === 'visionScene' || mode === 'visionText';

  // Placeholder copy tuned to the step so typing feels intentional, not a fallback.
  const textBarPlaceholder =
    phase === 'name' ? 'Type your name…'
    : mode === 'about' ? 'Or type what it\'s about…'
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
    setShowIdeas(false);
    setVibes([]);
    setRevealed(false);
    setStagedFaces([]);
    setLyricsDraft('');
    data.current = {
      name: '', songAbout: '', detail: '', scene: '', why: '',
      soundStyle: '', voice: '', face: null, faces: [], visionScene: '',
      lyrics: '', title: '',
    };
    idRef.current = 0;
    doneRef.current = false;
    recoveredRef.current = false;
    onPersist?.({ msgs: [], phase: 'name', mode: 'busy', vibes: [], data: { ...data.current }, nextId: 0, done: false });
    botSay(
      [
        web
          ? "Hey it's Lovify. It's time to become the person you were meant to be!"
          : "Hey! I'm going to help you make your very first song. 🎶",
        web ? "First, what's your name?" : "First — what should I call you?",
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

        {/* "Help me imagine" lives right under the AI's question — a gentle hand
            for anyone who's stuck or low. Left-aligned like a bot affordance so
            it reads as part of the assistant's message. Hidden on the name step. */}
        {mode === 'text' && phase !== 'name' && (
          showIdeas ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
                <span style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: LOVIFY.orangeDeep }}>
                  {web ? 'Tap the ones that fit — or write your own' : 'Tap one that feels true — or write your own'}
                </span>
                <button onClick={() => { setShowIdeas(false); setSelectedIdeas([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: LOVIFY.sub }}>Close</button>
              </div>
              {currentIdeas().map((idea) => {
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
              {web && selectedIdeas.length > 0 && (
                <div style={{ alignSelf: 'flex-start', padding: '2px 4px 0', fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: LOVIFY.orangeDeep }}>
                  {selectedIdeas.length} selected — tap ↑ to continue
                </div>
              )}
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => setShowIdeas(true)}
              style={{
                alignSelf: 'flex-start', cursor: 'pointer', marginTop: 2,
                padding: '9px 15px', borderRadius: 20,
                background: LOVIFY.orangeGradientSoft, border: `1.5px solid ${LOVIFY.orange}`,
                fontFamily: SANS, fontSize: 13.5, fontWeight: 800, color: LOVIFY.orangeDeep,
                display: 'inline-flex', alignItems: 'center', gap: 7,
                boxShadow: '0 6px 16px -10px rgba(216,92,28,0.5)',
              }}
            >
              <span style={{ fontSize: 15 }}>✨</span> Help me imagine
            </motion.button>
          )
        )}

        {/* Tappable answers live in the transcript now (under the bot's question)
            so the bottom text bar can stay put on every step. They read as quick
            replies; the user can tap one OR type their own below. */}
        {mode === 'about' && (
          <>
            <ChoiceList hint={!web}>
              {web
                ? ABOUT_OPTIONS_WEB.map((o) => (
                    <Choice key={o.key} onClick={() => chooseAbout(o.key, `${o.e}  ${o.l}`)}>{o.e}  {o.l}</Choice>
                  ))
                : ABOUT_OPTIONS.map((o) => (
                    <Choice key={o.l} onClick={() => chooseAbout(o.l)}>{o.e}  {o.l}</Choice>
                  ))}
            </ChoiceList>
            {/* Web: a quiet nudge directly under the chips → the input below, so
                "type your own" reads as the conversation continuing toward the box. */}
            {web && (
              <div style={{ alignSelf: 'flex-start', padding: '4px 6px 0', fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: LOVIFY.subSoft }}>
                Or type your own in the box below 👇
              </div>
            )}
          </>
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
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 9 }}>
            {/* Auto-growing textarea: long answers wrap DOWN instead of
                scrolling out of view. Enter sends; Shift+Enter newlines. */}
            <textarea
              ref={inputRef}
              value={draft}
              rows={1}
              onChange={(e) => {
                setDraft(e.target.value);
                const el = e.target as HTMLTextAreaElement;
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 124)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  (e.target as HTMLTextAreaElement).style.height = 'auto';
                  submitFreeText();
                }
              }}
              autoFocus
              placeholder={textBarPlaceholder}
              style={{
                flex: 1, boxSizing: 'border-box', padding: '14px 16px', borderRadius: 22,
                background: 'rgba(255, 251, 244, 0.9)', border: `1.5px solid ${draft.trim() ? LOVIFY.orange : LOVIFY.line}`,
                fontFamily: SANS, fontSize: 15, lineHeight: 1.45, color: LOVIFY.ink, outline: 'none',
                resize: 'none', overflowY: 'auto', maxHeight: 124,
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
            onSkip={skipPhoto}
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

// Crisp SVG play/pause — the '▶' character renders as a blue emoji on iOS.
function PlayGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginLeft: 2 }} aria-hidden>
      <path d="M8 5.2v13.6c0 .9 1 1.5 1.8 1L20 13a1.2 1.2 0 0 0 0-2L9.8 4.2c-.8-.5-1.8.1-1.8 1z" fill="#fff" />
    </svg>
  );
}
function PauseGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <rect x="6" y="5" width="4.2" height="14" rx="1.4" fill="#fff" />
      <rect x="13.8" y="5" width="4.2" height="14" rx="1.4" fill="#fff" />
    </svg>
  );
}

// Animated equalizer for the song-generation wait.
function RevealEQ() {
  const bars = [14, 26, 18, 34, 22, 38, 20, 30, 16, 28, 19, 24];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 5, height: 46, padding: '2px 0 4px' }} aria-hidden>
      {bars.map((h, i) => (
        <motion.span
          key={i}
          style={{ width: 5, borderRadius: 3, background: LOVIFY.orangeGradient, display: 'block' }}
          animate={{ height: [h * 0.35, h, h * 0.5, h * 0.85, h * 0.35] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: i * 0.09 }}
        />
      ))}
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
    if (playing === n) { a.pause(); setPlaying(null); restoreRevealAmbient(); return; }
    duckRevealAmbient();
    // Optimistic: flip the UI immediately (iOS resolves play() late); retry
    // once via load() if refused.
    setPlaying(n);
    setPlayedAny(true);
    const p = a.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        try {
          a.load();
          a.play().catch(() => { setPlaying(null); restoreRevealAmbient(); });
        } catch { setPlaying(null); restoreRevealAmbient(); }
      });
    }
  };
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} style={{ alignSelf: 'stretch', width: '100%', display: 'flex', flexDirection: 'column', gap: 12, marginTop: 6, paddingBottom: 8 }}>
      <div style={{ textAlign: 'center', padding: '0 6px' }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 18, color: LOVIFY.ink }}>{headline}</div>
        <div style={{ marginTop: 4, fontFamily: SANS, fontSize: 13.5, fontWeight: songReady ? 700 : 500, color: songFailed ? LOVIFY.sub : songReady ? LOVIFY.orangeDeep : LOVIFY.sub }}>{sub}</div>
      </div>

      {/* Progress bar + live equalizer while the song is being created. */}
      {(songWorking || songReady) && <RevealProgress done={songReady} />}
      {songWorking && <RevealEQ />}

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
                {songWorking ? <RevealSpinner small /> : on ? <PauseGlyph /> : <PlayGlyph />}
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
        <audio ref={audioRef} src={song.audio_url} preload="auto" onEnded={() => { setPlaying(null); restoreRevealAmbient(); }} onError={() => { setPlaying(null); restoreRevealAmbient(); }} />
      )}

      <div style={{ textAlign: 'center', padding: '2px 8px 0', minHeight: 18 }}>
        <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: LOVIFY.sub }}>
          {songFailed ? '' : songWorking ? 'Hang tight — building your vision + song…' : 'Tap play to listen, then Save the one you love'}
        </span>
      </div>
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
function PhotoInput({
  faces, onAdd, onRemove, onDone, onSkip,
}: {
  faces: string[];
  onAdd: (face: string) => void;
  onRemove: (i: number) => void;
  onDone: () => void;
  onSkip: () => void;
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
          <input type="file" accept="image/*" multiple onChange={handle} style={{ display: 'none' }} />
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
  { name: 'Uplifting Pop Anthem', description: 'Soaring vocals over bright, modern production.', genre: 'pop', emoji: '👑' },
  { name: 'Soulful R&B Groove', description: 'Smooth keys, lush harmonies, a deep pocket.', genre: 'r-n-b', emoji: '🌙' },
  { name: 'Acoustic Folk Story', description: 'Honest lyrics over gentle, earthy instruments.', genre: 'acoustic-folk', emoji: '🪕' },
  { name: 'Cinematic Inspirational', description: 'Sweeping strings building to a triumphant swell.', genre: 'cinematic', emoji: '🎻' },
];