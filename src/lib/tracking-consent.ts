/**
 * Tracking & privacy consent — web funnel.
 *
 * Native ATT (iOS) lives in the app; on the web we only track a localStorage
 * consent flag set from the cookie banner, and flip GA4 consent mode.
 */
const CONSENT_KEY = 'lovify_tracking_consent';
type Gtag = (...args: unknown[]) => void;
const gtag = (): Gtag | undefined =>
  typeof window !== 'undefined' ? (window as unknown as { gtag?: Gtag }).gtag : undefined;
const ls = (): Storage | undefined => (typeof localStorage !== 'undefined' ? localStorage : undefined);

// No ATT on the web — these resolve from the stored web-consent flag.
export async function requestTrackingPermission(): Promise<string> {
  return ls()?.getItem(CONSENT_KEY) === 'granted' ? 'authorized' : 'not-determined';
}
export async function getTrackingStatus(): Promise<string> {
  return ls()?.getItem(CONSENT_KEY) === 'granted' ? 'authorized' : 'not-determined';
}

export function grantWebConsent() {
  try { ls()?.setItem(CONSENT_KEY, 'granted'); } catch { /* ignore */ }
  gtag()?.('consent', 'update', {
    analytics_storage: 'granted', ad_storage: 'granted',
    ad_user_data: 'granted', ad_personalization: 'granted',
  });
}
export function denyWebConsent() {
  try { ls()?.setItem(CONSENT_KEY, 'denied'); } catch { /* ignore */ }
  gtag()?.('consent', 'update', {
    analytics_storage: 'denied', ad_storage: 'denied',
    ad_user_data: 'denied', ad_personalization: 'denied',
  });
}
export function hasTrackingConsent(): boolean {
  return ls()?.getItem(CONSENT_KEY) === 'granted';
}
