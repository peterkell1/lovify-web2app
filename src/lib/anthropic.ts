// Server-only Anthropic client. Imported ONLY by API route handlers — never by
// a client component (it reads the secret key via serverEnv, which throws if
// read in the browser bundle).
import { serverEnv } from "@/lib/env";

const MODEL = "claude-sonnet-4-6";

/** One-shot Claude Sonnet call (Anthropic Messages API). Returns the text. */
export async function callClaude(
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": serverEnv.anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${raw.slice(0, 500)}`);
  let data: { content?: { type?: string; text?: string }[] };
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`anthropic non-JSON: ${raw.slice(0, 500)}`);
  }
  const content = Array.isArray(data?.content) ? data.content : [];
  return content
    .filter((b) => b?.type === "text")
    .map((b) => b.text || "")
    .join("")
    .trim();
}

/** Pull a JSON object out of Claude's reply (it sometimes wraps it in prose or
 *  ```json fences). */
export function extractJson<T = Record<string, unknown>>(text: string): T {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  if (!t.startsWith("{")) {
    const s = t.indexOf("{");
    const e = t.lastIndexOf("}");
    if (s >= 0 && e > s) t = t.slice(s, e + 1);
  }
  return JSON.parse(t) as T;
}
