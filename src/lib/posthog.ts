// @ts-nocheck -- ported from the (non-strict) Lovify app repo; web2app funnel code
import posthog from 'posthog-js';
import { Capacitor } from '@/lib/stubs/capacitor';

/**
 * PostHog product analytics.
 *
 * Used to measure where users drop off in the onboarding flow (post-signup
 * 23-step quiz, the splash carousel + signup, and the auth-at-value V2 page).
 *
 * Why the web SDK in a Capacitor app?
 *   The iOS app is a React WebView shell. posthog-js fires inside the
 *   WebView exactly like in mobile Safari — same pattern as Clarity (see
 *   src/lib/clarity.ts). No native bridge needed.
 *
 * All calls are guarded so that:
 *  - Missing env vars fail silently instead of crashing the app boot
 *  - Runtime errors inside PostHog never break the app
 *  - Analytics is layered on top of GA4 / Clarity / AppsFlyer / OneSignal,
 *    not a replacement.
 */

// Default to the Lovify PostHog project token (project 404083). A project
// API key is public — it ships in the client bundle by design — same
// rationale as the hard-coded pixel id in metaPixel.ts. The env var can
// override it, but only if it looks like a real token (must start with
// "phc_"): this guards against a mis-pasted value silently killing all
// funnel analytics.
const envKey = process.env.NEXT_PUBLIC_POSTHOG_KEY as string | undefined;
const POSTHOG_API_KEY = envKey && envKey.startsWith('phc_')
  ? envKey
  : 'phc_w3fH3wpyo7c98S8iCe4e3mvWJeemBWcPn2WnNnwF7XyH';
const POSTHOG_HOST = (process.env.NEXT_PUBLIC_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com';

let initialized = false;

// Meta's in-app browser PRE-FETCHES ad landing pages in a hidden webview, and
// its ad-review bots load them with real browser user-agents. Those loads
// execute JS, so they used to fire funnel_landed/$pageview and inflate step-1
// counts ~20x vs actual link clicks (337 "landings" vs 14 clicks on day one).
// A prefetched page stays document.hidden unless the user really opens it —
// so when the page loads hidden, we defer init and QUEUE captures until it
// first becomes visible. Never-opened prefetches send nothing; a prefetch the
// user does open flushes its queued events the moment it's shown. Pages that
// load visible (every normal visitor) init immediately, exactly as before.
let deferredCalls: Array<() => void> | null = null;

/** Queue a call to run after first-visibility init; false = not deferring. */
function deferUntilVisible(fn: () => void): boolean {
  if (!deferredCalls) return false;
  deferredCalls.push(fn);
  return true;
}

export function initPostHog(): void {
  if (initialized) return;

  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    if (deferredCalls) return; // already armed, waiting for first visibility
    deferredCalls = [];
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      document.removeEventListener('visibilitychange', onVisible);
      doInitPostHog();
      const queued = deferredCalls;
      deferredCalls = null;
      queued?.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
    };
    document.addEventListener('visibilitychange', onVisible);
    return;
  }

  doInitPostHog();
}

function doInitPostHog(): void {
  if (initialized) return;

  if (!POSTHOG_API_KEY) {
    console.warn('[PostHog] Missing VITE_PUBLIC_POSTHOG_PROJECT_TOKEN — analytics disabled');
    return;
  }

  try {
    posthog.init(POSTHOG_API_KEY, {
      api_host: POSTHOG_HOST,
      // Web funnel: most visitors never sign in (they buy via the off-domain
      // RC checkout), so person profiles must exist for ANONYMOUS sessions or
      // ad-attribution breakdowns lose the people who matter most.
      person_profiles: 'always',
      // We capture explicit screen events for funnel analysis. Disabling
      // autocapture avoids polluting the funnel with ambient click events.
      autocapture: false,
      // Pageviews are useful for SPA route tracking and come for free.
      capture_pageview: true,
      capture_pageleave: true,
      // Session recording ON so we can watch real onboarding sessions and see
      // exactly where users hesitate / drop off (complements Clarity).
      disable_session_recording: false,
      loaded: (ph) => {
        // Super-properties attached to every event in this session.
        ph.register({
          platform: Capacitor.getPlatform(), // 'ios' | 'android' | 'web'
          is_native: Capacitor.isNativePlatform(),
          app_env: (process.env.NODE_ENV),
        });
      },
    });
    initialized = true;
    console.log('[PostHog] Initialized');
  } catch (err) {
    console.error('[PostHog] Init failed:', err);
  }
}

/**
 * Register ad-click attribution (fbclid + utm_*) as super-properties so EVERY
 * event this session can be sliced by campaign/adset/ad in PostHog funnels
 * (utm_campaign = Meta campaign, utm_term = adset, utm_content = ad name).
 * Only sets params actually present in the URL — register() persists for the
 * session, and later pages (e.g. /start/success) have no utm params, so
 * registering nulls there would clobber the landing attribution.
 */
export function registerAdAttribution(): void {
  if (typeof window === 'undefined') return;
  if (!initialized) { deferUntilVisible(() => registerAdAttribution()); return; }
  try {
    const p = new URLSearchParams(window.location.search);
    const keys = ['fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    const props: Record<string, string> = {};
    for (const k of keys) { const v = p.get(k); if (v) props[k] = v; }
    if (Object.keys(props).length) posthog.register(props);
  } catch (err) {
    console.error('[PostHog] registerAdAttribution failed:', err);
  }
}

/**
 * Register the A/B funnel arm ('A' | 'B') as a super-property so EVERY event
 * this session — landed → … → purchase_completed — carries `funnel_variant`,
 * which is what lets us break EPC down per arm. Defers like registerAdAttribution
 * if PostHog hasn't initialized yet (Meta-prefetch deferral).
 */
export function registerFunnelVariant(variant: string): void {
  if (typeof window === 'undefined' || !variant) return;
  if (!initialized) { deferUntilVisible(() => registerFunnelVariant(variant)); return; }
  try { posthog.register({ funnel_variant: variant }); } catch { /* ignore */ }
}

/**
 * Register which FUNNEL the visitor is in ('annual99' for /offer, 'standard' for
 * the live $1 funnels) as a super-property, so EVERY event — funnel_landed →
 * each onboarding_step_viewed → email_captured → checkout_started →
 * purchase_completed — carries `funnel`. That's what lets PostHog build a clean
 * per-step funnel for /offer in isolation (otherwise its step events look
 * identical to the live funnel's, since both use flow='onboarding_comeback1').
 */
export function registerFunnel(funnel: string): void {
  if (typeof window === 'undefined' || !funnel) return;
  if (!initialized) { deferUntilVisible(() => registerFunnel(funnel)); return; }
  try { posthog.register({ funnel }); } catch { /* ignore */ }
}

/**
 * Link the anonymous distinct_id to the authenticated user. Call once on
 * sign-in. PostHog merges the anonymous events into the identified person
 * so pre-signup activity stays attached to the user.
 */
export function identifyPostHogUser(
  userId: string,
  properties?: Record<string, unknown>,
): void {
  if (!initialized || !userId) return;
  try {
    // alias() merges the current anonymous distinct_id into userId.
    posthog.alias(userId);
    posthog.identify(userId, properties ? { $set: properties } : undefined);
  } catch (err) {
    console.error('[PostHog] identify failed:', err);
  }
}

/** Update person properties without re-identifying. */
export function setPostHogPersonProps(properties: Record<string, unknown>): void {
  if (!initialized) return;
  try {
    posthog.setPersonProperties(properties);
  } catch (err) {
    console.error('[PostHog] setPersonProperties failed:', err);
  }
}

/** Fire a custom event. Wrapped in try/catch so analytics failures never break the app. */
export function capturePostHogEvent(
  eventName: string,
  properties?: Record<string, unknown>,
): void {
  if (!initialized) { deferUntilVisible(() => capturePostHogEvent(eventName, properties)); return; }
  try {
    posthog.capture(eventName, properties);
  } catch (err) {
    console.error(`[PostHog] capture(${eventName}) failed:`, err);
  }
}

/** Generate a fresh anonymous distinct_id. Call on sign-out so the next
 *  user on the same device isn't tied to the previous session. */
export function resetPostHog(): void {
  if (!initialized) return;
  try {
    posthog.reset();
  } catch (err) {
    console.error('[PostHog] reset failed:', err);
  }
}