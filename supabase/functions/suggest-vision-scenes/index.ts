// Supabase Edge Function: suggest-vision-scenes
// ---------------------------------------------------------------------------
// Song-chat V2 — turns the visitor's OWN answers (their dream, the best version
// of themselves, why it matters) into 3 distinct, specific, cinematic vision
// scenes that show THEM living that exact dream. The chat shows these as the
// pickable options; the chosen one becomes the prompt for their vision image.
//
// This replaces the unreliable/generic suggest-comeback-ideas path — the whole
// point is that the scenes are grounded in what the person actually wrote.
//
// DEPLOY (the team owns this — reuses the SAME key as transcribe-audio):
//   supabase functions deploy suggest-vision-scenes --no-verify-jwt
//   supabase secrets set OPENAI_API_KEY=sk-...   (already set for transcription)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SYSTEM = `You help someone SEE themselves living their dream life so vividly they feel it's already real.
Given their own words, invent EXACTLY 3 distinct, specific, cinematic vision scenes that each show THEM inside this exact dream.
Rules:
- Each scene is one concrete visual MOMENT (a place, an action, a feeling) grounded in their actual words — never generic, never abstract.
- The 3 scenes should feel different from each other (different moment / setting / angle), not three versions of the same shot.
- For each scene return: a fitting emoji; a short, evocative title (3-6 words); and a vivid photorealistic image-generation prompt that puts THEM in the scene.
- The image prompt must describe a real, lifelike, cinematic photo. No "golden hour" cliche, no text, no watermark.
Return ONLY strict JSON: {"visions":[{"emoji":"","title":"","prompt":""},{"emoji":"","title":"","prompt":""},{"emoji":"","title":"","prompt":""}]}`;

async function suggest(dream: string, scene: string, why: string): Promise<unknown[]> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) throw new Error('OPENAI_API_KEY not set');
  const user = [
    dream && `My dream / the life I most want: ${dream}`,
    scene && `The best version of me — where I live, who's with me: ${scene}`,
    why && `Why it matters to me: ${why}`,
  ].filter(Boolean).join('\n') || 'My dream life.';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.9,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`openai ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(content);
  return Array.isArray(parsed?.visions) ? parsed.visions : [];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  try {
    const { dream = '', scene = '', why = '' } = await req.json();
    const visions = await suggest(String(dream), String(scene), String(why));
    return json({ visions });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
