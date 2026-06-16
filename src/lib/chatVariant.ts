// @ts-nocheck -- web2app funnel code
/**
 * Song-chat A/B assignment — V1 (current) vs V2 (the improved song-creation
 * flow: better image prompt, easier detail capture, new lyric prompt, genre
 * picker with audio). Mirrors funnelVariant.ts.
 *
 *   v1 = the current song chat (unchanged).
 *   v2 = the new variant under test.
 *
 * Assigned ONCE per browser and persisted, so a visitor stays in their arm
 * across reloads (the chat's behavior is decided when the chat mounts and must
 * not flip mid-flow). Registered as a PostHog super-property (`chat_variant`)
 * so every event — including purchase_completed — carries it, which is how we
 * compare V1 vs V2 on the magic-moment funnel + checkout. Both arms run at the
 * same /offer URL, so the read is clean.
 *
 * OFF BY DEFAULT: V2_TRAFFIC_SHARE = 0, so all real traffic stays on v1 until
 * V2 is ready. Preview v2 anytime with ?chat=v2 — no risk to live traffic.
 */
export type ChatVariant = 'v1' | 'v2';

const KEY = 'lov-chat-variant';

// Share of NEW visitors routed to V2. 0 = off (everyone on v1). Flip to 0.5
// for the 50/50 test once V2 is built. The ONLY line to change to go live.
export const V2_TRAFFIC_SHARE = 0;

/** Assign (once) or read this browser's song-chat arm. SSR-safe (→ 'v1'). */
export function getChatVariant(): ChatVariant {
  if (typeof window === 'undefined') return 'v1';
  try {
    // Manual override for QA/preview: ?chat=v2 (or ?chat=v1) forces an arm and
    // sticks across the flow, without enabling it for real traffic.
    const forced = new URLSearchParams(window.location.search).get('chat');
    if (forced === 'v1' || forced === 'v2') {
      localStorage.setItem(KEY, forced);
      return forced;
    }
    const stored = localStorage.getItem(KEY);
    if (stored === 'v1' || stored === 'v2') return stored;
    const v: ChatVariant = Math.random() < V2_TRAFFIC_SHARE ? 'v2' : 'v1';
    localStorage.setItem(KEY, v);
    return v;
  } catch {
    return 'v1';
  }
}

/** Read the persisted arm WITHOUT assigning — for pages reached after the
 *  off-domain checkout redirect (e.g. /start/success), so we don't re-roll. */
export function readChatVariant(): ChatVariant {
  if (typeof window === 'undefined') return 'v1';
  try {
    const s = localStorage.getItem(KEY);
    return s === 'v2' ? 'v2' : 'v1';
  } catch {
    return 'v1';
  }
}
