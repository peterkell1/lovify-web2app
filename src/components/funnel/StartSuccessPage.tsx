// @ts-nocheck -- ported from the (non-strict) Lovify app repo; web2app funnel code
import { useEffect } from 'react';
import { LOVIFY, SANS } from '@/components/onboarding/v3/theme';
import { initMetaPixel, trackPixel, getWebAttribution } from '@/lib/metaPixel';
import { capturePostHogEvent, initPostHog, registerAdAttribution } from '@/lib/posthog';
import { readOnboardingSessionId, claimOnboardingSession } from '@/lib/onboardingClaim';
import { clearSnapshot, clearStoredSessionId } from '@/components/onboarding/v3/session';
const appStoreBadge = '/assets/app-store-badge.svg';

/**
 * Web funnel success page — Stripe redirects here after a successful trial
 * checkout (/start/success). The account is provisioned server-side by the
 * stripe-webhook from the paid session (Phase 2); this page just celebrates
 * and points the user to download the app, where their trial is already live.
 */
const APP_STORE_URL = 'https://apps.apple.com/us/app/lovify-music-for-your-mind/id6759404327';

// Presentational only — no analytics side-effects, so it's safe to render in
// the all-screens canvas. The route wrapper below fires the pixel/PostHog.
export function StartSuccessView() {
  return (
    <div style={{ height: '100%', minHeight: '100%', background: LOVIFY.bgGradient, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', textAlign: 'center' }}>
      <div style={{ width: 84, height: 84, borderRadius: 42, background: LOVIFY.orangeGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 18px 32px -10px rgba(216,92,28,0.55)', marginBottom: 24 }}>
        <span style={{ color: '#fff', fontSize: 40 }}>✓</span>
      </div>
      <h1 style={{ margin: 0, fontFamily: SANS, fontSize: 30, fontWeight: 700, color: LOVIFY.ink, letterSpacing: -0.5 }}>
        You're in! 🎉
      </h1>
      <p style={{ margin: '14px 0 0', fontFamily: SANS, fontSize: 16.5, lineHeight: 1.5, color: LOVIFY.sub, maxWidth: 380 }}>
        Your $1 trial is active. Three quick steps to your song:
      </p>
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 380, textAlign: 'left' }}>
        {[
          ['1', <>Check your <strong style={{ color: LOVIFY.ink }}>email</strong> — tap the link and set your password.</>],
          ['2', <>Download <strong style={{ color: LOVIFY.ink }}>Lovify</strong> from the App Store below.</>],
          ['3', <>Log in with your <strong style={{ color: LOVIFY.ink }}>purchase email + password</strong> — your song is waiting. 🎶</>],
        ].map(([n, body]) => (
          <div key={n as string} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ width: 26, height: 26, borderRadius: 13, flexShrink: 0, background: LOVIFY.orangeGradient, color: '#fff', fontFamily: SANS, fontSize: 13.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
            <span style={{ fontFamily: SANS, fontSize: 15.5, lineHeight: 1.45, color: LOVIFY.sub, paddingTop: 2 }}>{body}</span>
          </div>
        ))}
      </div>
      <a
        href={APP_STORE_URL}
        aria-label="Download on the App Store"
        style={{ marginTop: 30, display: 'inline-block', lineHeight: 0 }}
      >
        <img src={appStoreBadge} alt="Download on the App Store" style={{ height: 56, width: 'auto', display: 'block' }} />
      </a>
      <p style={{ margin: '18px 0 0', fontFamily: SANS, fontSize: 12.5, color: LOVIFY.subSoft }}>
        A receipt is on its way to your email.
      </p>
    </div>
  );
}

export default function StartSuccessPage() {
  useEffect(() => {
    initMetaPixel();
    // Standard conversion events on return from RC checkout. Purchase carries
    // the actual $1 charged so Meta can optimize for revenue / ROAS; StartTrial
    // marks the trial start (value 0). NOTE: RC's Meta CAPI also sends the
    // purchase server-side — align RC's event name to "Purchase" + share an
    // event_id, OR optimize on only one source, to avoid double-counting.
    // Shared event_id lets Meta dedupe this browser Purchase against the
    // server-side CAPI Purchase (fired from the webhook with fbc/fbp).
    const eventId = getWebAttribution()?.eventId;
    trackPixel('StartTrial', { value: 0, currency: 'USD' }, eventId);
    trackPixel('Purchase', { value: 1, currency: 'USD' }, eventId);
    // PostHog must boot here too — this page is reached by a full redirect
    // from the off-domain RC checkout, so the funnel's init is gone. The
    // session-persisted super-props (fbclid/utm_*) survive in localStorage,
    // so purchase_completed stays attributable to the ad.
    initPostHog();
    registerAdAttribution();
    capturePostHogEvent('web_trial_started', { surface: 'web' });
    // Canonical conversion event the ads dashboard builds its funnel on.
    capturePostHogEvent('purchase_completed', { surface: 'web', value: 1, currency: 'USD' });
    // Safety net: claim the staged onboarding song for the just-authenticated
    // user. The email path already claims on the account page (this is a no-op
    // then); the Apple-OAuth path bounces straight here, so it claims now.
    // Reads from sessionStorage (lov-onboarding-claim-fs), which is independent
    // of the session id cleared below — so order here is safe.
    claimOnboardingSession(readOnboardingSessionId());
    // Purchase is complete — wipe the funnel snapshot so navigating back to
    // /start begins a fresh run instead of resuming on the paywall step.
    clearSnapshot('web');
    // CRITICAL: also drop the stored onboarding session id. It's the RevenueCat
    // App User ID the purchase was bound to. If we leave it, the NEXT person on
    // this browser reuses the same id, so RC sees an active subscription and
    // waves them through to success WITHOUT charging — they ride on this buyer's
    // sub. Clearing it forces ensureSession() to mint a fresh id (= a new,
    // un-entitled RC identity) for the next user, so they must actually pay.
    clearStoredSessionId();
  }, []);
  return (
    <div style={{ height: '100dvh' }}>
      <StartSuccessView />
    </div>
  );
}