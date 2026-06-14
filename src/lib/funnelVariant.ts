// @ts-nocheck -- web2app funnel code
/**
 * Funnel A/B assignment for the EPC (earnings-per-visitor) split test.
 *
 *   A = the current (long) funnel.
 *   B = a SHORTER funnel — straight to the song — with the SAME $1 trial offer.
 *
 * Clean single-variable test: does a shorter funnel convert better? Same price
 * on both arms, so no new RC package is needed and the read is unambiguous.
 *
 * Assigned ONCE per browser and persisted, so a visitor stays in their arm
 * across reloads — critical because the funnel's step list is decided at step 0
 * and must never change mid-flow. The arm is registered as a PostHog
 * super-property (`funnel_variant`) so every event — including
 * `purchase_completed` — carries it, which is how we break the funnel down per
 * arm. Both arms run at the SAME ad + URL (the split is client-side), so CAC is
 * identical and the comparison is clean.
 */
export type FunnelVariant = 'A' | 'B';

const KEY = 'lov-funnel-variant';

// Share of NEW visitors routed to Funnel B. 0 = off (everyone on A). Flip to
// 0.5 for the 50/50 test — that's the only line to change. Both arms use the
// same $1 trial, so there's no billing prerequisite to turning it on.
export const B_TRAFFIC_SHARE = 0;

// Day-0 cash price per arm (USD) for the `purchase_completed` value. Both arms
// are the $1 trial, so both are 1 (kept as a map so a future pricing test is a
// one-line change).
export const VARIANT_PRICE: Record<FunnelVariant, number> = { A: 1, B: 1 };

/** Assign (once) or read this browser's funnel arm. SSR-safe (returns 'A'). */
export function getFunnelVariant(): FunnelVariant {
  if (typeof window === 'undefined') return 'A';
  try {
    // Manual override for QA: visit ?variant=B (or ?variant=A) to force an arm
    // and preview a funnel before it's live, without enabling it for real
    // traffic. The choice is persisted so it sticks across the whole funnel
    // even after the param drops off later screens.
    const forced = new URLSearchParams(window.location.search).get('variant');
    if (forced === 'A' || forced === 'B') {
      localStorage.setItem(KEY, forced);
      return forced;
    }
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
