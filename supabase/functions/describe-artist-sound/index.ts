// Supabase Edge Function: describe-artist-sound
// ---------------------------------------------------------------------------
// Song-chat V2 — the optional "a song you'd love this to sound like?" question.
// Reverse-engineers a reference (artist or song) into a name/voice-free
// production blueprint + lyric-writing rulebook, so the music engine and the
// songwriter can both adopt the STYLE without ever naming or quoting the artist.
//
// Returns JSON: { styleDescription, lyricalFormula, structuralDynamics,
//                 styleSpecificTraps[] }  OR  { notFound, suggestion }.
//
// DEPLOY (reuses the SAME OPENAI_API_KEY as the other functions):
//   supabase functions deploy describe-artist-sound --no-verify-jwt
// Model: gpt-4o-mini by default — bump MODEL to 'gpt-4o' for higher fidelity.

const MODEL = 'gpt-4o-mini';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SYSTEM = `You are a world-class music producer and lyric analyst. Your job is to reverse-engineer the SONIC STYLE and LYRIC-WRITING TECHNIQUE of a given artist or song.

Your output will be used by two systems:
- An AI music generator (needs sonic control signals)
- An AI songwriter (needs lyric construction rules)

LEGAL RULES:
- NEVER include the artist's name, band name, or song title in output
- NEVER reference specific copyrighted lyrics or melodies
- Describe ONLY sonic qualities, production techniques, and lyric-construction behaviors
- If you cannot confidently identify the artist/song, return: {"notFound": true, "suggestion": "Please describe what you like about this song's sound and writing style, or share a link."}

QUALITY STANDARD:
Your output must be specific enough that two different songwriters given your formula would produce lyrics with recognizably similar STRUCTURE and RHYTHM — even on completely different topics.
If your description could apply to 10+ different artists, it is too vague. Rewrite with more precise behavioral rules.

OUTPUT FORMAT — Return valid JSON with exactly these fields:

1. "styleDescription" (max 1000 characters)
A production-ready prompt for an AI music generator. Every word must be a CONTROL SIGNAL — no filler.
REQUIRED ELEMENTS (in priority order if space is tight): Genre/subgenre as tags; Exact BPM; Vocal style with physical descriptors (breathy, falsetto, clipped — NOT "emotional" or "powerful"); Key instruments with their CHARACTER ("warm analog synth pads" not just "synth pads"); Drum/rhythm texture; Production qualities (reverb type, compression style, stereo width); Energy arc if space allows.
FORMAT RULES: Use comma-separated descriptive tags, not flowing sentences. NO filler phrases ("creating a sense of", "evoking the feeling of", "reminiscent of"). NO abstract mood words without sonic anchors ("dreamy" fails — "dreamy: heavy hall reverb, slow-attack pads, half-tempo drums" works). Front-load the most distinctive sonic elements first. TEST each phrase: could a sound engineer turn this into a specific knob position or instrument choice? "Euphoric" fails. "Major key, high-pass filter sweep into chorus drop" passes.

2. "lyricalFormula" (600-1200 characters)
Actionable writing RULES, not descriptions. A ghostwriter should be able to follow these on any topic and produce something structurally recognizable.
Cover these as specific behavioral rules: LINE CONSTRUCTION (typical word count per line; complete sentences or fragments; how lines begin — pronouns, conjunctions, imperatives); RHYME BEHAVIOR (perfect, slant, or internal; every line, every other, or irregular; end-of-line only or mid-line too); VERSE vs CHORUS CONTRAST (how sentence structure, line length and vocabulary physically shift between sections); REPETITION MECHANICS (what exactly repeats — single words, full phrases; how many times; identical or varied); SIGNATURE QUIRKS (what this artist does with line construction that most artists do NOT).
DO NOT suggest topics, metaphors, or subject matter — the user provides their own. DO describe the artist's image-building TECHNIQUE — how they structurally build imagery.

3. "structuralDynamics" (200-400 characters)
How lyrics and production INTERACT. How do line density, phrasing, and breathing room respond to energy shifts in the production? Where do lyrics lead vs where does production carry and lyrics get sparse?

4. "styleSpecificTraps" (array of exactly 3 short strings, each under 140 characters)
The 3 BIGGEST mistakes a ghostwriter would make trying to imitate THIS artist's lyrical signature — specific to this artist, not generic songwriting advice. These will be fed back into the lyric generator as style-specific banned behaviors. Do NOT repeat generic clichés (rise above, shining light, etc.) — name traps SPECIFIC to writing in THIS style.

Output ONLY the JSON object. No explanation, no markdown formatting.`;

const userMsg = (ref: string) =>
  `Reverse-engineer "${ref}". For styleDescription: what are the exact sonic control signals a producer would need? For lyricalFormula: what are the specific line-construction RULES a ghostwriter would follow to write new lyrics that feel structurally identical — on any topic? For structuralDynamics: how do the lyrics and production push and pull against each other? For styleSpecificTraps: what are the 3 biggest mistakes a ghostwriter would make trying to imitate THIS artist's lyric style?`;

async function describe(ref: string): Promise<unknown> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) throw new Error('OPENAI_API_KEY not set');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: userMsg(ref) }],
    }),
  });
  if (!res.ok) throw new Error(`openai ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data?.choices?.[0]?.message?.content || '{}');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  try {
    const { artistOrSong = '' } = await req.json();
    if (!String(artistOrSong).trim()) return json({ error: 'missing artistOrSong' }, 400);
    const out = await describe(String(artistOrSong).trim());
    return json(out);
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
