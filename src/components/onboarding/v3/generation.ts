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

/** Email the visitor a copy of the song they just made (the /offer gate's
 * promise). Fire-and-forget: a delivery hiccup must never break the reveal.
 * The function only emails songs hosted on our own storage (see send-song-email). */
export async function sendSongEmail(req: { email: string; title: string; songUrl: string }): Promise<void> {
  if (!req.email || !req.songUrl) return;
  try {
    await authedFetch('send-song-email', { email: req.email, title: req.title, songUrl: req.songUrl });
  } catch {
    /* best-effort — the song still shows in the funnel regardless */
  }
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
  /** When set, sent verbatim as the user message instead of the default
   *  dream-intake build below — lets a funnel variant request a specific
   *  lyric structure (e.g. comeback1's pain→pleasure arc) without this
   *  shared layer knowing about it. Omitted → behavior unchanged. */
  promptOverride?: string;
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
  // Synthesize the "dream intake" as a single rich user message — unless the
  // caller supplied a full prompt of its own (promptOverride), which is sent
  // verbatim so a funnel variant can dictate the lyric structure.
  const userMessage = req.promptOverride ?? [
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

/** V2 vision brief — the song-chat V2 test.
 *
 * The whole point of the vision image is to let someone SEE themselves living
 * the exact dream they just described, so it has to be specific and theirs, not
 * a generic "happy, golden-hour" stock mood (the #1 reason v1 images fell flat).
 *
 * So this feeds the model the FULL story, not just the scene:
 *   • dream      — the specific, picked vision look (or their own words)
 *   • specifics  — the concrete details they typed ("dolphins jumping by my deck")
 *   • feeling    — WHY it matters, so the emotion + identity shows on their face
 * and deliberately drops "golden hour / vision-board" — the lighting should be
 * whatever is TRUE to that specific moment, not a preset. Face fidelity is hard
 * non-negotiable: this only lands if it's unmistakably them. */
export function buildVisionPromptV2(a: {
  songAbout?: string; scene?: string; detailText?: string; why?: string; visionScene?: string;
}): string {
  // Strip preset "golden hour" phrasing out of the picked look so it can't fight
  // the true-to-scene lighting we ask for below (some idea prompts bake it in).
  const clean = (s: string) => (s || '').replace(/\bgolden[\s-]?hour\b/gi, '').replace(/\bgolden light\b/gi, '').replace(/\s+/g, ' ').trim();
  const dream = clean(a.visionScene || a.scene || a.detailText || a.songAbout || 'living their dream life');
  const det = (a.detailText || '').trim();
  const specifics = det && clean(det) !== dream
    ? ` Specific details in their own words: ${det}.` : '';
  const feeling = (a.why || '').trim()
    ? ` Why this matters to them: ${(a.why || '').trim()} — let that emotion read on their face and in the mood of the shot.` : '';
  return [
    `Photorealistic, cinematic vertical (9:16) photograph of the exact person in the reference photo, fully living this dream: ${dream}.`,
    specifics,
    feeling,
    ` They are unmistakably the hero of the frame — present and immersed in the moment, living it rather than posing.`,
    ` Keep their face completely true to the reference photo: same identity, features, and age — it must clearly be them.`,
    ` Use real, true-to-scene natural lighting that fits this exact moment (NOT a golden-hour preset), with rich depth and lifelike detail.`,
    ` Immersive and emotional, like a still frame from a film of their life. Absolutely no text, captions, watermark, or logos.`,
  ].join('').replace(/\s+/g, ' ').trim();
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
  // True while `audio_url` is the (temporary) stream URL — the permanent file is
  // still rendering. Don't save a streaming song; wait for the permanent swap.
  streaming?: boolean;
}

export async function startSong(req: {
  lyrics: string; title: string; style: string; voice: string; model?: string;
}): Promise<string> {
  const vocalGender = /female|woman|she/i.test(req.voice) ? 'f' : /male|man|he/i.test(req.voice) ? 'm' : undefined;
  // `model` pins the song provider for THIS funnel (the /offer funnel passes
  // 'suno' = Kie.ai). The router honors it; omitting it keeps the app_settings
  // default (Mureka) for the live funnels untouched.
  const res = await authedFetch('generate-song-router', {
    lyrics: req.lyrics,
    title: req.title,
    style: req.style,
    vocalGender,
    ...(req.model ? { model: req.model } : {}),
  });
  if (!res.ok) throw new Error(`generate-song-router failed (${res.status})`);
  const data = await res.json();
  if (!data?.taskId) throw new Error('No taskId returned');
  return data.taskId as string;
}

/** Poll until the song is ready (or fails / times out). ~5 min max.
 *
 * The status request body MUST be `{ action: 'status', taskId }` (the router
 * 400s otherwise).
 *
 * A song is only "ready" once Mureka returns a PERMANENT `audio_url`. The
 * `stream_audio_url` (api.mureka.ai/v1/live/stream/…) appears first, while the
 * song is still rendering, and dies once the stream closes — staging it would
 * persist a dead URL into the library that 400s on playback. So we keep polling
 * on a stream-only result and only fall back to the stream URL as a last resort
 * if we reach a terminal status without ever getting a permanent file. */
export async function pollSong(
  taskId: string,
  onTick?: (status: string) => void,
  maxPolls = 90,
  intervalMs = 4000,
  model?: string,
  // Fired ONCE, the moment a playable stream URL exists (well before the
  // permanent file) so the reveal can start playing immediately — Suno-style.
  // The promise still resolves with the PERMANENT file (for saving), which the
  // caller hot-swaps in. The stream URL expires after rendering, so never save it.
  onStream?: (song: GeneratedSong) => void,
): Promise<GeneratedSong> {
  let streamFired = false;
  for (let i = 0; i < maxPolls; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    let res: Response;
    try {
      // `model` MUST match the provider that started the task — the router uses
      // it to route the status poll to the same provider (Suno tasks live in a
      // different store than Mureka's, so a mis-routed poll never resolves).
      res = await authedFetch('generate-song-router', { action: 'status', taskId, ...(model ? { model } : {}) });
    } catch {
      continue; // transient — keep polling
    }
    if (!res.ok) continue;
    const data = await res.json();
    const status = String(data?.status || '').toLowerCase();
    onTick?.(status || 'generating');

    const songs: any[] = Array.isArray(data?.songs) ? data.songs : [];

    // Instant reveal: as soon as a stream URL is available (before the permanent
    // file), surface it once so the user hears their song in ~15s, not ~60s.
    if (!streamFired && onStream) {
      const streaming = songs.find((s) => s?.stream_audio_url && !s?.audio_url);
      if (streaming) {
        streamFired = true;
        onStream({ ...streaming, audio_url: streaming.stream_audio_url, streaming: true } as GeneratedSong);
      }
    }

    // Resolve only on the PERMANENT file (it's what gets saved). A stream-only
    // result means the song is still rendering — keep polling.
    const ready = songs.find((s) => s?.audio_url);
    if (ready) {
      return { ...ready, audio_url: ready.audio_url } as GeneratedSong;
    }

    const terminal = ['complete', 'completed', 'ready', 'success', 'succeeded', 'done'].includes(status);
    // Terminal status but still no permanent file — last-resort fall back to the
    // stream URL so the user gets *a* song rather than a hard failure.
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

/** Generate TWO distinct songs for the same brief.
 *
 * The UI presents the user with two "versions" to choose between, so we kick
 * off two INDEPENDENT Mureka generations in parallel. Each `generate-song-router`
 * task renders one usable song, so two tasks → two genuinely different takes of
 * the same lyrics/style (not the same file shown twice).
 *
 * Resilient by design: if one of the two fails (or times out), we still return
 * the one that succeeded rather than failing the whole reveal. Only when BOTH
 * fail do we throw, so the caller can show the retry state. `onTick` reports the
 * combined status so the existing wait-copy keeps animating. */
export async function generateTwoSongs(
  req: { lyrics: string; title: string; style: string; voice: string; model?: string },
  onTick?: (status: string) => void,
  // Instant reveal: fired per take (slot 0/1) when its stream URL is ready, so
  // the caller can show + play it before the permanent files finish.
  onStream?: (slot: number, song: GeneratedSong) => void,
): Promise<GeneratedSong[]> {
  const one = async (slot: number): Promise<GeneratedSong> => {
    const taskId = await startSong(req);
    // Poll the SAME provider that started this task (req.model), else a Suno
    // task would be polled against Mureka's store and never resolve.
    return pollSong(taskId, onTick, undefined, undefined, req.model, onStream ? (s) => onStream(slot, s) : undefined);
  };
  const results = await Promise.allSettled([one(0), one(1)]);
  const songs = results
    .filter((r): r is PromiseFulfilledResult<GeneratedSong> => r.status === 'fulfilled')
    .map((r) => r.value);
  if (!songs.length) {
    // Both failed — surface the first rejection so the caller shows "try again".
    const firstError = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
    throw firstError?.reason instanceof Error ? firstError.reason : new Error('Song generation failed');
  }
  return songs;
}