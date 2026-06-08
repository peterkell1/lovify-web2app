// @ts-nocheck -- ported from the (non-strict) Lovify app repo; web2app funnel code
/**
 * Onboarding v3 — real generation layer.
 *
 * Thin, typed wrappers around the SAME edge functions the live "Create"
 * section uses, so the onboarding magic-moment matches production exactly:
 *
 *   • suggest-song-styles      → 4 AI sound "vibes" from the user's answers
 *   • creative-assistant       → AI-written lyrics (show_lyrics tool)
 *   • generate-song-cover      → vision image w/ the user's face (Gemini / Nano Banana)
 *   • generate-song-router     → song via Mureka (+ polling)
 *
 * Auth: every call attaches the user's Supabase session JWT (falling back
 * to the anon key). NOTE: live calls require a REAL VITE_SUPABASE_PUBLISHABLE_KEY
 * in the env — the committed .env.local ships a placeholder, so until the real
 * key + a credited account are in place these calls will 401/402 and the
 * callers fall back to local templates.
 *
 * Credits: the server deducts (vision 40cr, song settles the 50cr session).
 * This module does not deduct directly — it relies on the edge functions'
 * own credit gates, exactly like the Create flow.
 */
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

async function authedFetch(fnName: string, body: unknown): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || ANON_KEY;
  // Retry once on 429 (rate limit) with a short backoff. Edge functions are
  // rate-limited per key; a brief wait clears transient bursts so real users
  // get their personalized result instead of the offline fallback.
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify(body),
    });
    if (res.status !== 429 || attempt === 1) return res;
    await new Promise((r) => setTimeout(r, 1500));
  }
  // Unreachable, but satisfies the type checker.
  throw new Error(`${fnName} failed`);
}

// ─── 1. Sound styles ────────────────────────────────────────────
// suggest-song-styles ← { conversationContext, previouslySuggestedVibes?, regenerateCount? }
//                     → { vibes: [{ name, description, genre, emoji }], source }

export interface SoundVibe {
  name: string;
  description: string;
  genre: string;
  emoji: string;
}

/** Build the conversation context the styles model reads, from onboarding answers. */
export function buildStyleContext(a: {
  songAbout: string; detailText: string; scene: string; why: string; genres: string[];
}): string {
  const parts = [
    a.songAbout && `The song is about: ${a.songAbout}.`,
    a.detailText && `In their words, picturing it in detail: ${a.detailText}`,
    a.scene && `The scene they imagine: ${a.scene}`,
    a.why && `Why it matters to them: ${a.why}`,
    a.genres?.length && `Genres they love: ${a.genres.join(', ')}.`,
  ].filter(Boolean);
  return parts.join('\n');
}

export async function suggestSoundStyles(
  conversationContext: string,
  previouslySuggestedVibes: string[] = [],
  regenerateCount = 0,
): Promise<SoundVibe[]> {
  const res = await authedFetch('suggest-song-styles', {
    conversationContext,
    previouslySuggestedVibes,
    regenerateCount,
  });
  if (!res.ok) throw new Error(`suggest-song-styles failed (${res.status})`);
  const data = await res.json();
  const vibes = Array.isArray(data?.vibes) ? data.vibes : [];
  if (!vibes.length) throw new Error('No vibes returned');
  return vibes as SoundVibe[];
}

// ─── 2. Lyrics ──────────────────────────────────────────────────
// `creative-assistant` is the SAME endpoint the Create tab uses. It's a
// streaming (SSE) tool-use chat with a phase machine. To make it write the
// lyrics in ONE turn (no back-and-forth), we hand it everything up front:
//   • preferences.preloadedStyle + preloadedStyleName  (the chosen sound)
//   • preferences.selectedVocalGender                  ('male' | 'female')
// With a preloaded style + a vocal gender, getConversationPhase() jumps
// straight to the 'lyrics' phase and the model calls the `show_lyrics` tool.
//
// We do NOT pass a sessionId, so no per-message billing happens here (the
// first onboarding song is free; the 50cr settles when the song generates).
//
// The response is text/event-stream: `data: {choices:[{delta:{...}}]}` lines.
// Lyrics arrive as a `show_lyrics` tool_call whose `function.arguments` is a
// JSON string `{ title, style, content, songType }`.
export interface GeneratedLyrics {
  title: string;
  style: string;
  content: string;
}

export interface LyricsRequest {
  songAbout: string; detailText: string; scene: string; why: string;
  style: string; voice?: string; genres?: string[];
  /** Streamed partial lyrics as they're written, for live typing in the UI. */
  onProgress?: (partialContent: string) => void;
}

/** Pull the (possibly unterminated) `content` value out of a streaming
 *  show_lyrics tool-call argument string, decoding JSON escapes as we go so
 *  the UI can type the lyrics in live before the full JSON has arrived. */
function extractPartialContent(args: string): string {
  const m = args.match(/"content"\s*:\s*"/);
  if (!m || m.index == null) return '';
  const raw = args.slice(m.index + m[0].length);
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '\\') {
      const nxt = raw[i + 1];
      if (nxt === undefined) break; // incomplete escape at the stream edge
      if (nxt === 'n') out += '\n';
      else if (nxt === 't') out += '\t';
      else if (nxt === 'r') out += '';
      else if (nxt === '"') out += '"';
      else if (nxt === '\\') out += '\\';
      else out += nxt;
      i++;
    } else if (ch === '"') {
      break; // closing quote — content complete
    } else {
      out += ch;
    }
  }
  return out;
}

export async function generateLyrics(req: LyricsRequest): Promise<GeneratedLyrics> {
  // Synthesize the "dream intake" as a single rich user message.
  const userMessage = [
    req.songAbout && `My song is about: ${req.songAbout}.`,
    req.detailText && `When I picture it in detail: ${req.detailText}`,
    req.scene && `The exact scene I imagine: ${req.scene}`,
    req.why && `Why this matters so much to me: ${req.why}`,
    `Please write my song now.`,
  ].filter(Boolean).join('\n');

  const vocalGender: 'male' | 'female' =
    /female|woman|she|her/i.test(req.voice || '') ? 'female' : 'male';

  const style = req.style || 'Uplifting modern pop, warm and hopeful';

  const res = await authedFetch('creative-assistant', {
    createMode: 'song',
    messages: [{ role: 'user', content: userMessage }],
    preferences: {
      musicGenres: req.genres || [],
      preloadedStyle: style,
      preloadedStyleName: style,
      selectedVocalGender: vocalGender,
    },
    flowState: { hasPreloadedStyle: true, voicePicked: true, genrePicked: true },
  });
  if (!res.ok) throw new Error(`creative-assistant failed (${res.status})`);
  if (!res.body) throw new Error('creative-assistant returned no stream');

  // ── Parse the SSE stream, accumulating the show_lyrics tool-call args. ──
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const toolArgs: Record<number, { name: string; args: string }> = {};

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (!payload || payload === '[DONE]') continue;
      let parsed: any;
      try { parsed = JSON.parse(payload); } catch { continue; }
      const calls = parsed?.choices?.[0]?.delta?.tool_calls;
      if (!Array.isArray(calls)) continue;
      for (const tc of calls) {
        const idx = tc.index ?? 0;
        if (!toolArgs[idx]) toolArgs[idx] = { name: '', args: '' };
        if (tc.function?.name) toolArgs[idx].name = tc.function.name;
        if (tc.function?.arguments) toolArgs[idx].args += tc.function.arguments;
      }
      // Stream partial lyrics to the UI as they arrive.
      if (req.onProgress) {
        const lc = Object.values(toolArgs).find((t) => t.name === 'show_lyrics' || t.args.includes('"content"'));
        if (lc) {
          const partial = extractPartialContent(lc.args);
          if (partial) req.onProgress(partial);
        }
      }
    }
  }

  // Find the show_lyrics call and parse its accumulated JSON arguments.
  const lyricsCall = Object.values(toolArgs).find((t) => t.name === 'show_lyrics');
  if (!lyricsCall) throw new Error('No show_lyrics tool call in stream');
  let args: any;
  try { args = JSON.parse(lyricsCall.args); } catch { throw new Error('Bad show_lyrics JSON'); }

  const content: string = args?.content || args?.lyrics || '';
  if (!content) throw new Error('show_lyrics returned empty content');
  return {
    title: args?.title || 'Your Song',
    style: args?.style || style,
    content,
  };
}

// ─── 3. Vision image with the user's face ───────────────────────
// SAME contract the Create tab's useVisionGeneration hook uses:
//   generate-song-cover (Gemini / Nano Banana Pro)
//     ← { title, style, userPhotoUrl, aspectRatio, sceneDescription }
//     → { imageUrl }
// `title` + `style` are REQUIRED (400 otherwise). `userPhotoUrl` is the face
// (a data URL works — the function reads it as a reference image). The model
// places that face into a scene described by `style` / `sceneDescription`.

export async function generateVisionWithFace(
  sceneDescription: string,
  facePhoto: string | null,
  title = 'Your Vision',
  aspectRatio: '9:16' | '16:9' | '1:1' = '9:16',
): Promise<string> {
  const res = await authedFetch('generate-song-cover', {
    title,
    // `style` is the visual brief for the cover/vision image.
    style: sceneDescription,
    sceneDescription,
    userPhotoUrl: facePhoto || undefined,
    aspectRatio,
  });
  if (!res.ok) throw new Error(`generate-song-cover failed (${res.status})`);
  const data = await res.json();
  const url = data?.imageUrl || data?.url || data?.image_url;
  if (!url) throw new Error('No vision image returned');
  return url;
}

/** A cinematic vision brief that drops the user into their dream scene. */
export function buildVisionPrompt(a: { songAbout: string; scene: string; detailText: string }): string {
  const scene = a.scene || a.detailText || a.songAbout || 'living their happiest life';
  return [
    `Photorealistic, cinematic vertical portrait of the person from the reference photo,`,
    `living this dream: ${scene}.`,
    `Keep their face true to the reference. Golden-hour light, shallow depth of field,`,
    `aspirational and warm, vision-board quality. No text, no watermark.`,
  ].join(' ');
}

// ─── 4. Song (Mureka via router) + polling ──────────────────────
// start:  generate-song-router ← { lyrics, title, style, vocalGender } → { taskId }
// poll:   generate-song-router ← { taskId } → { status, songs:[{title,audio_url,image_url,...}] }

export interface GeneratedSong {
  id?: string;
  title: string;
  audio_url: string;
  image_url?: string;
  lyrics?: string;
  style?: string;
}

export async function startSong(req: {
  lyrics: string; title: string; style: string; voice: string;
}): Promise<string> {
  const vocalGender = /female|woman|she/i.test(req.voice) ? 'f' : /male|man|he/i.test(req.voice) ? 'm' : undefined;
  const res = await authedFetch('generate-song-router', {
    lyrics: req.lyrics,
    title: req.title,
    style: req.style,
    vocalGender,
  });
  if (!res.ok) throw new Error(`generate-song-router failed (${res.status})`);
  const data = await res.json();
  if (!data?.taskId) throw new Error('No taskId returned');
  return data.taskId as string;
}

/** Poll until the song is ready (or fails / times out). ~5 min max.
 *
 * Mirrors useSongPolling exactly: the status request body MUST be
 * `{ action: 'status', taskId }` (the router 400s otherwise), and a song is
 * "ready" as soon as any returned song has a playable URL — we don't wait for
 * a specific terminal status string (the backend isn't always consistent). */
export async function pollSong(
  taskId: string,
  onTick?: (status: string) => void,
  maxPolls = 90,
  intervalMs = 4000,
): Promise<GeneratedSong> {
  for (let i = 0; i < maxPolls; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    let res: Response;
    try {
      res = await authedFetch('generate-song-router', { action: 'status', taskId });
    } catch {
      continue; // transient — keep polling
    }
    if (!res.ok) continue;
    const data = await res.json();
    const status = String(data?.status || '').toLowerCase();
    onTick?.(status || 'generating');

    const songs: any[] = Array.isArray(data?.songs) ? data.songs : [];
    const playable = songs.find((s) => s?.audio_url || s?.stream_audio_url);

    const terminal = ['complete', 'completed', 'ready', 'success', 'succeeded', 'done'].includes(status);
    // Return as soon as we have audio OR a terminal status with at least one song.
    if (playable) {
      return {
        ...playable,
        audio_url: playable.audio_url || playable.stream_audio_url,
      } as GeneratedSong;
    }
    if (terminal && songs.length) {
      const s = songs[0];
      return { ...s, audio_url: s.audio_url || s.stream_audio_url } as GeneratedSong;
    }
    if (status === 'failed' || status === 'error' || data?.error) {
      throw new Error(data?.error || 'Song generation failed');
    }
  }
  throw new Error('Song generation timed out');
}