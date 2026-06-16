// @ts-nocheck -- preview/QA storyboard (not part of the live funnel)
/* Lovify /offer — Song-Chat storyboard.
 * A single scrollable "vision" of the song-creation chat: every question, the
 * bot prompt before/after, what each step captures, and the 4 AI generation
 * prompts behind the scenes (lyrics / image / sound / song). A design + QA
 * reference for optimizing the chat. Lives at /offer/song-canvas — NOT the
 * live funnel (that's /offer). Source of truth is OnboardingChat.tsx +
 * v3/generation.ts; keep in sync when the chat changes. */

import { LOVIFY, SANS } from '@/components/onboarding/v3/theme';

// ── The conversation, step by step (from OnboardingChat.tsx) ──
const STEPS = [
  {
    n: 1, phase: 'name', captures: 'name',
    bot: ['Hey it’s Lovify. It’s time to become the person you were meant to be!', 'First, what’s your name?'],
    input: 'Free text', chips: null,
  },
  {
    n: 2, phase: 'detail', captures: 'detail (the dream / the vent)',
    bot: ['Hi {name}. Let’s help you create a life you love. ✨', 'Do you already have a vision of your dream — or is something bothering you we can solve? Either way, tell me everything.'],
    input: 'Free text', chips: null,
  },
  {
    n: 3, phase: 'scene', captures: 'scene (specific life moments)',
    bot: ['(AI reflects a warm flip of their answer back to them)', 'Now we’re going to create a song that helps you bring this vision to life. 🎶 Tell me what’s in that life — where you are, who’s there, what people are saying. Type it in your own words, or tap ✨ Help me imagine for ideas 👇'],
    input: 'Free text', chips: '✨ Help me imagine → 6 scene ideas (AI or static bank)',
  },
  {
    n: 4, phase: 'why', captures: 'why (identity / reason)',
    bot: ['I can SEE it. 🌟', 'Last one — why would that be so important to you, {name}?'],
    input: 'Free text', chips: '✨ Help me imagine → 6 “why” ideas',
  },
  {
    n: 5, phase: 'photo', captures: 'photos (you + up to 4 others)',
    bot: ['That’s the real you talking — and that’s the heart of your song.', 'Now add a photo of yourself, {name} — and anyone else you want in the picture (partner, family, friends).'],
    input: 'Photo upload (skippable: “Maybe later”)', chips: null,
  },
  {
    n: 6, phase: 'visionScene', captures: 'visionScene (which version of you)',
    bot: ['Perfect. That’s going to look incredible. ✨', 'Now let’s picture YOU in it, {name}. Which version of you should we bring to life? (or tap “Describe my own”)'],
    input: '4 preset cards or free text', chips: '🏆 successful · 👑 confident · 🌅 calm · 🔥 unstoppable',
  },
  {
    n: 7, phase: 'sound', captures: 'soundStyle',
    bot: ['(loads styles for ~2s)', 'Now let’s make it sound like you. Which of these feels right, {name}?'],
    input: '4 AI-suggested vibe cards or free text', chips: 'Picked BLIND — no audio preview',
  },
  {
    n: 8, phase: 'voice', captures: 'voice',
    bot: ['{vibe} — gorgeous choice.', 'Last thing: who should sing it?'],
    input: '2 options or free text', chips: '👩‍🎤 Female voice · 👨‍🎤 Male voice',
  },
  {
    n: 9, phase: 'lyricsReview', captures: 'lyrics (editable)',
    bot: ['(writes lyrics — ~loading)', 'Here’s your song, {name} — this is what we’ll plant in your mind. 🧠', 'Read it over. Tweak anything that isn’t quite you, then make it real.'],
    input: 'Editable lyrics textarea → “Make my song 🎶”', chips: null,
  },
  {
    n: 10, phase: 'email', captures: 'email', tag: '/offer only',
    bot: ['Love it, {name}. One last thing before I make it —', 'what’s your email? I’ll create your song now and send you a copy to keep. 🎶'],
    input: 'Email input', chips: null,
  },
  {
    n: 11, phase: 'generating', captures: '—',
    bot: ['Let’s make it real. 🎶', '→ REVEAL: 2 song versions + vision image + “Save song”'],
    input: 'Play / pick a version → Save', chips: null,
  },
];

// ── The 4 AI generation steps (from v3/generation.ts + edge functions) ──
const GENERATION = [
  {
    title: '① LYRICS', model: 'creative-assistant edge fn · Claude (SSE stream)',
    inputs: 'songAbout, detail, scene, why (+ style, voice, genres via flow state)',
    prompt: 'My song is about: {songAbout}.\nWhen I picture it in detail: {detail}\nThe exact scene I imagine: {scene}\nWhy this matters so much to me: {why}\nPlease write my song now.',
    warn: 'songAbout is HARDCODED to “My dream life” for everyone. The deepest lyric instruction (verse/chorus system prompt) lives in the creative-assistant edge function in the lovifymusic repo — not here.',
  },
  {
    title: '② IMAGE / vision board', model: 'generate-song-cover · Gemini / Nano-Banana · 9:16',
    inputs: 'scene (or visionScene), detail, the user’s face photo',
    prompt: 'Photorealistic, cinematic vertical portrait of the person from the reference photo, living this dream: {scene}. Keep their face true to the reference. Golden-hour light, shallow depth of field, aspirational and warm, vision-board quality. No text, no watermark.',
    warn: 'Only uses {scene} + “golden-hour” — generic template, no “pick from a few,” quality rides entirely on the model.',
  },
  {
    title: '③ SOUND STYLE', model: 'suggest-song-styles edge fn',
    inputs: 'songAbout, detail, scene, why, genres',
    prompt: 'The song is about: {songAbout}.\nIn their words, picturing it in detail: {detail}\nThe scene they imagine: {scene}\nWhy it matters to them: {why}\nGenres they love: {genres}.\n→ returns 4 vibe cards the user picks from.',
    warn: 'User picks a vibe BLIND (no audio sample) before the song is made.',
  },
  {
    title: '④ SONG', model: 'generate-song-router → Suno (Kie.ai) · polls ~4s',
    inputs: 'lyrics, title, style (chosen vibe), voice',
    prompt: '→ generates 2 versions. User plays both and taps Save on one.',
    warn: 'Pick-one-of-two, no regenerate and no nudge. Streams a preview URL, hot-swaps to the permanent file.',
  },
];

const card = { background: '#fff', border: `1px solid ${LOVIFY.line}`, borderRadius: 16, padding: '14px 16px', boxShadow: '0 6px 18px -12px rgba(58,42,34,0.35)' };

export function SongCanvas() {
  return (
    <div style={{ minHeight: '100dvh', background: LOVIFY.bg, fontFamily: SANS, color: LOVIFY.ink, padding: '32px 18px 80px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, color: LOVIFY.orangeDeep, textTransform: 'uppercase' }}>Song Chat · Storyboard</div>
        <h1 style={{ margin: '6px 0 4px', fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>What the song-creation chat looks like</h1>
        <p style={{ margin: '0 0 24px', fontSize: 15, lineHeight: 1.5, color: LOVIFY.sub }}>
          9 questions + a photo + a lyrics edit → 4 AI generations → reveal. Reference for optimizing the flow.
          The live funnel is at <strong>/offer</strong>. Source: OnboardingChat.tsx + v3/generation.ts.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 800, margin: '8px 0 12px' }}>The conversation</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {STEPS.map((s) => (
            <div key={s.n} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ width: 26, height: 26, borderRadius: 13, flexShrink: 0, background: LOVIFY.orangeGradient, color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.n}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: LOVIFY.sub, fontFamily: 'monospace' }}>phase: {s.phase}</span>
                {s.tag && <span style={{ fontSize: 11, fontWeight: 800, color: LOVIFY.orangeDeep, background: 'rgba(237,122,42,0.12)', borderRadius: 999, padding: '2px 8px' }}>{s.tag}</span>}
                <span style={{ marginLeft: 'auto', fontSize: 12, color: LOVIFY.subSoft }}>captures: <strong style={{ color: LOVIFY.ink }}>{s.captures}</strong></span>
              </div>
              {s.bot.map((line, i) => (
                <div key={i} style={{ fontSize: 14.5, lineHeight: 1.5, color: line.startsWith('(') || line.startsWith('→') ? LOVIFY.subSoft : LOVIFY.ink, fontStyle: line.startsWith('(') ? 'italic' : 'normal', marginBottom: 3 }}>
                  {line.startsWith('(') || line.startsWith('→') ? line : `“${line}”`}
                </div>
              ))}
              <div style={{ marginTop: 8, fontSize: 12.5, color: LOVIFY.sub }}>
                <span style={{ fontWeight: 700 }}>Input:</span> {s.input}{s.chips ? <> · <span style={{ color: LOVIFY.subSoft }}>{s.chips}</span></> : null}
              </div>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 800, margin: '28px 0 4px' }}>Behind the scenes — the 4 AI generations</h2>
        <p style={{ margin: '0 0 12px', fontSize: 13.5, color: LOVIFY.sub }}>The actual prompts sent to the models. These are your quality levers.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {GENERATION.map((g) => (
            <div key={g.title} style={{ ...card, borderLeft: `4px solid ${LOVIFY.orange}` }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15.5, fontWeight: 800 }}>{g.title}</span>
                <span style={{ fontSize: 11.5, color: LOVIFY.subSoft, fontFamily: 'monospace' }}>{g.model}</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 12.5, color: LOVIFY.sub }}><span style={{ fontWeight: 700 }}>Inputs:</span> {g.inputs}</div>
              <pre style={{ margin: '8px 0 0', padding: '10px 12px', background: 'rgba(166,109,56,0.07)', borderRadius: 10, fontSize: 12.5, lineHeight: 1.5, color: LOVIFY.ink, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, monospace' }}>{g.prompt}</pre>
              <div style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.45, color: '#9a4a1e' }}>⚠️ {g.warn}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
