// @ts-nocheck -- web2app funnel code
/**
 * Standalone "$99/year upfront" offer funnel marker.
 *
 * This funnel (route /offer) charges $99/year immediately — no trial — via a
 * RevenueCat package, instead of the $1 trial. It's separate from the live
 * /comeback1 funnel + its A/B split. The marker is persisted in localStorage so
 * /start/success — reached AFTER the off-domain RC checkout redirect, where the
 * flow's in-memory state is gone — can report the real $99 price + a funnel tag.
 */
const KEY = 'lov-funnel-offer';

// Day-0 cash per offer funnel (USD), for the purchase_completed value.
export const OFFER_PRICE: Record<string, number> = { annual99: 99 };

// Day-0 cash by plan id — the most accurate Purchase value (what's charged
// today): the $1-trial annual collects $1 now; monthly $17.99; the offer
// funnel's annual $99 up front. Read on /start/success via the stashed plan.
export const PLAN_DAY0_PRICE: Record<string, number> = {
  yearly_premium_trial: 1,
  monthly: 17.99,
  annual99: 99,
};

/** Read the last plan the buyer chose ('' if none). */
export function readLastPlan(): string {
  if (typeof window === 'undefined') return '';
  try { return localStorage.getItem('lov-last-plan') || ''; } catch { return ''; }
}

/** Mark (or clear) the active offer funnel for this browser. Pass '' to clear. */
export function setFunnelOffer(offer: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (offer) localStorage.setItem(KEY, offer);
    else localStorage.removeItem(KEY);
  } catch { /* ignore */ }
}

/** Read the active offer funnel ('' if none — i.e. the normal $1 funnel). */
export function readFunnelOffer(): string {
  if (typeof window === 'undefined') return '';
  try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
}
