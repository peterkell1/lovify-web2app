// @ts-nocheck -- ported from the (non-strict) Lovify app repo; web2app funnel code
/* RevenueCat Web Billing — web-to-app checkout handoff.
 *
 * The /start funnel redirects to RevenueCat's hosted Web Purchase Link
 * (pay.rev.cat) instead of opening the in-page Stripe sheet, so RC owns the
 * checkout + the app entitlement and our `revenuecat-webhook` provisions the
 * Lovify account (see supabase/functions/revenuecat-webhook).
 *
 * The link token is environment-specific (sandbox vs production), so it's read
 * from VITE_RC_PURCHASE_LINK_TOKEN. When unset, the funnel falls back to the
 * legacy in-page Stripe sheet, so this is safe to ship before going live.
 *
 * URL shape (RC Web Purchase Link):
 *   https://pay.rev.cat/<token>/<appUserId>?email=&package_id=&redirect_url=
 * `appUserId` = the onboarding session id, which rides into the webhook so the
 * staged song + account are claimed for this buyer.
 */
const RC_TOKEN = process.env.NEXT_PUBLIC_RC_PURCHASE_LINK_TOKEN as string | undefined;

// The /offer funnel's $99/year, charged-immediately (NO trial) package. Must
// match the package identifier created in the RC "Web" offering; override via
// env once it exists. Until then it builds (the /offer checkout step just won't
// resolve a package), which is fine — /offer is a standalone test route.
const ANNUAL99_PACKAGE = (process.env.NEXT_PUBLIC_RC_ANNUAL99_PACKAGE as string | undefined) || '$rc_annual99';

// Funnel plan id (from screens.tsx) → RC package lookup key (the "Web" offering).
const PLAN_TO_PACKAGE: Record<string, string> = {
  yearly_premium_trial: '$rc_annual',
  monthly: '$rc_monthly',
  annual99: ANNUAL99_PACKAGE,
};

/** True when a RC purchase-link token is configured (else use the Stripe sheet). */
export function rcCheckoutConfigured(): boolean {
  return !!RC_TOKEN;
}

/** Build the RC hosted-checkout URL, or null if not configured / no session id. */
export function buildRcCheckoutUrl(opts: {
  appUserId: string | null;
  planId: string;
  email?: string | null;
  redirectUrl?: string;
}): string | null {
  if (!RC_TOKEN || !opts.appUserId) return null;
  const params = new URLSearchParams();
  if (opts.email) params.set('email', opts.email);
  const pkg = PLAN_TO_PACKAGE[opts.planId];
  if (pkg) params.set('package_id', pkg);
  if (opts.redirectUrl) params.set('redirect_url', opts.redirectUrl);
  const qs = params.toString();
  return `https://pay.rev.cat/${RC_TOKEN}/${encodeURIComponent(opts.appUserId)}${qs ? `?${qs}` : ''}`;
}