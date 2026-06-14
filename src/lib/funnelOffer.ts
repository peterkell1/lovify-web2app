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
// 'annual99' = the $89.99/year-charged-upfront (no-trial) funnel. (Key name is
// just an internal id; the charged price is $89.99.)
export const OFFER_PRICE: Record<string, number> = { annual99: 89.99 };

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
