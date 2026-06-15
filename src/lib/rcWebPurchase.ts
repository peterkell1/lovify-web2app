// @ts-nocheck -- web2app funnel: in-page RevenueCat Web Billing checkout.
//
// Runs RevenueCat's embedded Web Billing checkout (Stripe Elements + Apple Pay /
// Google Pay) ON our own domain — no pay.rev.cat redirect. Because it's
// RevenueCat, the SAME fulfillment that already works keeps working: the
// `appUserId` (the onboarding session id) rides into RC → the revenuecat-webhook
// claims the staged song + provisions the account. RC stays the source of truth.
import { publicEnv } from '@/lib/env';

// The RC Web Billing SDK (@revenuecat/purchases-js) is ~1.7MB. Checkout is the
// LAST step of the funnel, so we lazy-load it the moment a purchase runs rather
// than bundling it into the main funnel chunk the hook/landing screen waits on.
// Cached so repeated purchases don't re-import.
let _sdk: typeof import('@revenuecat/purchases-js') | null = null;
async function loadSdk() {
  if (!_sdk) _sdk = await import('@revenuecat/purchases-js');
  return _sdk;
}

/** True when the RC Web Billing SDK can run (public key configured). */
export function rcWebBillingConfigured(): boolean {
  return !!publicEnv.rcWebBillingKey;
}

// Funnel plan id (screens.tsx) → RC package lookup key, in the "Web" offering.
const PLAN_TO_PACKAGE: Record<string, string> = {
  yearly_premium_trial: '$rc_annual',
  monthly: '$rc_monthly',
  annual99: '$rc_annual99',
};
const WEB_OFFERING = 'Web';

// Singleton — configure once per app user (the onboarding session id).
let _purchases: any = null;
let _configuredFor = '';
async function getPurchases(appUserId: string) {
  if (_purchases && _configuredFor === appUserId) return _purchases;
  const { Purchases } = await loadSdk();
  _purchases = Purchases.configure({ apiKey: publicEnv.rcWebBillingKey, appUserId });
  _configuredFor = appUserId;
  return _purchases;
}

/**
 * Open the embedded RC Web Billing checkout for `planId`, charged to the buyer
 * bound to `appUserId` (= the onboarding session id, so the right staged song is
 * claimed). Resolves 'success' | 'cancelled' | 'error'.
 */
export async function rcWebPurchase(opts: { planId: string; appUserId: string; email?: string }): Promise<'success' | 'cancelled' | 'error'> {
  if (!publicEnv.rcWebBillingKey || !opts.appUserId) return 'error';
  try {
    const purchases = await getPurchases(opts.appUserId);
    const offerings = await purchases.getOfferings();
    const offering = offerings.all?.[WEB_OFFERING] ?? offerings.current;
    const wantKey = PLAN_TO_PACKAGE[opts.planId] ?? opts.planId;
    const pkg = offering?.availablePackages?.find((p: any) => p.identifier === wantKey);
    if (!pkg) { console.error('[rcWebPurchase] package not found in Web offering:', wantKey); return 'error'; }
    await purchases.purchase({ rcPackage: pkg, ...(opts.email ? { customerEmail: opts.email } : {}) });
    return 'success';
  } catch (e: any) {
    const { ErrorCode } = await loadSdk();
    if (e?.errorCode === ErrorCode.UserCancelledError) return 'cancelled';
    console.error('[rcWebPurchase]', e);
    return 'error';
  }
}
