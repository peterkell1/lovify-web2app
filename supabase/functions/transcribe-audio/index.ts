// Supabase Edge Function: transcribe-audio
// ---------------------------------------------------------------------------
// Server-side speech-to-text for the song-chat V2 voice-first capture. The web
// client (transcribeAudio() in generation.ts) records a clip with MediaRecorder
// and POSTs it here as a base64 data URL; we forward the audio to OpenAI Whisper
// and return { text }. Doing it server-side is what makes voice work inside the
// iOS Instagram/Facebook in-app webviews, where the on-device SpeechRecognition
// API is unavailable.
//
// DEPLOY (the team owns this — production infra + key + cost):
//   supabase functions deploy transcribe-audio --no-verify-jwt
//   supabase secrets set OPENAI_API_KEY=sk-...
// Cost: Whisper is ~$0.006 / minute of audio. Clips are capped at 90s client-side.
//
// Provider-agnostic: swap the OpenAI call for Deepgram/AssemblyAI by changing
// only the transcribe() body — the request/response contract stays the same.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Decode a base64 data URL ("data:audio/webm;base64,XXXX") into bytes + mime.
function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const comma = dataUrl.indexOf(',');
  const meta = dataUrl.slice(0, comma);
  const b64 = dataUrl.slice(comma + 1);
  const mime = (meta.match(/data:([^;]+)/)?.[1]) || 'audio/webm';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, mime };
}

function extFor(mime: string): string {
  if (mime.includes('mp4') || mime.includes('m4a')) return 'mp4';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('ogg')) return 'ogg';
  return 'webm';
}

async function transcribe(bytes: Uint8Array, mime: string): Promise<string> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) throw new Error('OPENAI_API_KEY not set');
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: mime }), `audio.${extFor(mime)}`);
  form.append('model', 'whisper-1');
  form.append('response_format', 'json');
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) throw new Error(`whisper ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return String(data?.text || '').trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  try {
    const { audio } = await req.json();
    if (!audio || typeof audio !== 'string') return json({ error: 'missing audio' }, 400);
    const { bytes, mime } = decodeDataUrl(audio);
    if (!bytes.length) return json({ error: 'empty audio' }, 400);
    // Guard against oversized uploads (~8MB of decoded audio is plenty for 90s).
    if (bytes.length > 8 * 1024 * 1024) return json({ error: 'audio too large' }, 413);
    const text = await transcribe(bytes, mime);
    return json({ text });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
