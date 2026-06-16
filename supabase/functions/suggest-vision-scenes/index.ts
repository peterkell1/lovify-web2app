// Supabase Edge Function: suggest-vision-scenes
// ---------------------------------------------------------------------------
// Song-chat V2 — turns the visitor's OWN answers (their dream, the best version
// of themselves, why it matters) into 3 distinct, specific, cinematic vision
// scenes that show THEM living that exact dream. The chat shows these as the
// pickable options; the chosen one becomes the prompt for their vision image.
//
// Runs on Claude Sonnet via Kie.ai (same provider as the Suno song generation).
// DEPLOY:
//   supabase functions deploy suggest-vision-scenes --no-verify-jwt
//   supabase secrets set KIE_AI_API_KEY=...   (already set for the other fns)

const KIE_MODEL = 'claude-sonnet-4-5';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function callClaude(system: string, user: string, maxTokens: number): Promise<string> {
  const key = Deno.env.get('KIE_AI_API_KEY');
  if (!key) throw new Error('KIE_AI_API_KEY not set');
  const res = await fetch('https://api.kie.ai/claude/v1/messages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: KIE_MODEL,
      max_tokens: maxTokens,
      stream: false,
      messages: [{ role: 'user', content: `${system}\n\n---\n\n${user}` }],
    }),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`kie ${res.status}: ${raw.slice(0, 500)}`);
  let data: any;
  try { data = JSON.parse(raw); } catch { throw new Error(`kie non-JSON: ${raw.slice(0, 500)}`); }
  const content = data?.content || data?.data?.content || data?.message?.content || data?.result?.content;
  if (!Array.isArray(content)) throw new Error(`kie unexpected shape: ${JSON.stringify(data).slice(0, 500)}`);
  return content.filter((b: { type?: string }) => b?.type === 'text').map((b: { text?: string }) => b.text || '').join('').trim();
}

function extractJson(text: string): Record<string, unknown> {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  if (!t.startsWith('{')) {
    const s = t.indexOf('{'); const e = t.lastIndexOf('}');
    if (s >= 0 && e > s) t = t.slice(s, e + 1);
  }
  return JSON.parse(t);
}

const SYSTEM = `You help someone SEE themselves living their dream life so vividly they feel it's already real.
Given their own words, invent EXACTLY 3 distinct, specific, cinematic vision scenes that each show THEM inside this exact dream.
Rules:
- Each scene is one concrete visual MOMENT (a place, an action, a feeling) grounded in their actual words — never generic, never abstract.
- The 3 scenes should feel different from each other (different moment / setting / angle), not three versions of the same shot.
- For each scene return: a fitting emoji; a short, evocative title (3-6 words); and a vivid photorealistic image-generation prompt that puts THEM in the scene.
- The image prompt must describe a real, lifelike, cinematic photo. No "golden hour" cliche, no text, no watermark.
Return ONLY strict JSON: {"visions":[{"emoji":"","title":"","prompt":""},{"emoji":"","title":"","prompt":""},{"emoji":"","title":"","prompt":""}]}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  try {
    const { dream = '', scene = '', why = '' } = await req.json();
    const user = [
      dream && `My dream / the life I most want: ${dream}`,
      scene && `The best version of me — where I live, who's with me: ${scene}`,
      why && `Why it matters to me: ${why}`,
    ].filter(Boolean).join('\n') || 'My dream life.';
    const text = await callClaude(SYSTEM, user, 1500);
    const parsed = extractJson(text);
    const visions = Array.isArray(parsed?.visions) ? parsed.visions : [];
    return json({ visions });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
