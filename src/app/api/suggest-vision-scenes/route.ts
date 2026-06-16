// In-app API route — song-chat V2 vision scenes. Turns the visitor's own answers
// into 3 distinct, specific, cinematic scenes of them living that dream, via
// Claude Sonnet. Server-side, so it deploys with the app.
import { NextRequest, NextResponse } from "next/server";
import { callClaude, extractJson } from "@/lib/anthropic";

export const maxDuration = 60;

const SYSTEM = `You help someone SEE themselves living their dream life so vividly they feel it's already real.
Given their own words, invent EXACTLY 3 distinct, specific, cinematic vision scenes that each show THEM inside this exact dream.
Rules:
- Each scene is one concrete visual MOMENT (a place, an action, a feeling) grounded in their actual words — never generic, never abstract.
- The 3 scenes should feel different from each other (different moment / setting / angle), not three versions of the same shot.
- For each scene return: a fitting emoji; a short, evocative title (3-6 words); and a vivid photorealistic image-generation prompt that puts THEM in the scene.
- The image prompt must describe a real, lifelike, cinematic photo. No "golden hour" cliche, no text, no watermark.
Return ONLY strict JSON: {"visions":[{"emoji":"","title":"","prompt":""},{"emoji":"","title":"","prompt":""},{"emoji":"","title":"","prompt":""}]}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dream = String(body?.dream || "").trim();
    const scene = String(body?.scene || "").trim();
    const why = String(body?.why || "").trim();
    const user =
      [
        dream && `My dream / the life I most want: ${dream}`,
        scene && `The best version of me — where I live, who's with me: ${scene}`,
        why && `Why it matters to me: ${why}`,
      ]
        .filter(Boolean)
        .join("\n") || "My dream life.";
    const text = await callClaude(SYSTEM, user, 1500);
    const parsed = extractJson<{ visions?: unknown }>(text);
    const visions = Array.isArray(parsed?.visions) ? parsed.visions : [];
    return NextResponse.json({ visions });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e) }, { status: 500 });
  }
}
