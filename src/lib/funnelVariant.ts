// @ts-nocheck -- web2app funnel code
/**
 * Funnel A/B assignment for the EPC (earnings-per-visitor) split test.
 *
 *   A = the current funnel ($1 trial → $89.99/yr at day 7).
 *   B = a shorter funnel + a discounted annual charged UP FRONT ($49 today).
 *
 * Assigned ONCE per browser and persisted, so a visitor stays in their arm
 * across reloads — critical because the funnel's step list is decided at step 0
 * and must never change mid-flow. The arm is registered as a PostHog
 * super-property (`funnel_variant`) so every event — including
 * `purchase_completed` — carries it, which is how we break EPC down per arm.
 *
 * Both arms run at the SAME ad + URL (the split is client-side), so CAC is
 * identical across them and the EPC delta is a clean read.
 */
export type FunnelVariant = 'A' | 'B';

const KEY = 'lov-funnel-variant';

// Share of NEW visitors routed to Funnel B. Keep at 0 until the upfront
// RevenueCat package is live (otherwise B's checkout has no package to charge);
// then flip to 0.5 for the real 50/50 test. This is the ONLY line to change to
// turn the experiment on — no logic redeploy needed.
export const B_TRAFFIC_SHARE = 0;

// Day-0 cash price per arm (USD). Used as the `purchase_completed` value so EPC
// reflects real money collected today: A = $1 trial, B = $49 first year up front.
export const VARIANT_PRICE: Record<FunnelVariant, number> = { A: 1, B: 49 };

/** Assign (once) or read this browser's funnel arm. SSR-safe (returns 'A'). */
export function getFunnelVariant(): FunnelVariant {
  if (typeof window === 'undefined') return 'A';
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'A' || stored === 'B') return stored;
    const v: FunnelVariant = Math.random() < B_TRAFFIC_SHARE ? 'B' : 'A';
    localStorage.setItem(KEY, v);
    return v;
  } catch {
    return 'A';
  }
}

/** Read the persisted arm WITHOUT assigning — for pages reached after the
 *  off-domain checkout redirect (e.g. /start/success), where we must not
 *  re-roll the coin. Defaults to 'A' if none was stored. */
export function readFunnelVariant(): FunnelVariant {
  if (typeof window === 'undefined') return 'A';
  try {
    const s = localStorage.getItem(KEY);
    return s === 'B' ? 'B' : 'A';
  } catch {
    return 'A';
  }
}

/** The day-0 cash value to report for this arm's purchase. */
export function variantPrice(v: FunnelVariant): number {
  return VARIANT_PRICE[v] ?? 1;
}
