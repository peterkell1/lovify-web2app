// @ts-nocheck -- ported from the (non-strict) Lovify app repo; web2app funnel code
/**
 * Multi-provider analytics router for paywall + auth + post-purchase fan-out.
 *
 * One public API that fans out to PostHog + AppsFlyer client SDK +
 * Facebook App Events SDK. Call sites stay provider-agnostic — only this
 * file knows the per-provider event shapes.
 *
 * Architecture overview:
 * - **PostHog** (web SDK in WebView) — funnel + step analytics. Always
 *   fires from this file directly.
 * - **AppsFlyer** — install attribution stays client-SDK; subscription
 *   events fire from the BACKEND via `dispatchAppsFlyerWebhookS2S` in
 *   the webhook handlers. We only fire client-side events here that have
 *   no webhook equivalent (paywall_shown, login).
 * - **Facebook** — paywall/login fires here directly via the Capacitor
 *   plugin. Subscription / purchase events come from the BACKEND queue
 *   `pending_fb_events`; this file polls and fires them on-device via
 *   `firePendingFbEvents` / `scheduleFbEventPolling`.
 *
 * Note: this file is intentionally NOT named `analytics.ts` because that
 * filename is already taken by the GA4 utilities (Google Analytics 4).
 *
 * See docs/appsflyer-meta-analytics-plan.md for the full rail-split rationale.
 */

import { capturePostHogEvent } from './posthog';
import { trackAppsFlyerEvent } from './appsflyer';
import {
  logFacebookEvent,
  logFacebookPurchase,
  setFacebookUserId,
  clearFacebookUserId,
  isFacebookAnalyticsAvailable,
} from './facebook-sdk';
import { supabase } from '@/integrations/supabase/client';

// ─────────────────────────────────────────────────────────────────
// Public API — call from feature code (paywalls, auth, etc.)
// ─────────────────────────────────────────────────────────────────

export interface PaywallShownArgs {
  /** Where this paywall was opened from. Used for PostHog breakdown. */
  source:
    | 'onboarding_trial'
    | 'membership_sheet'
    | 'insufficient_credits'
    | 'trial_exhausted'
    | 'deep_link'
    | string;
  /** Internal plan id of the hero CTA, if known. */
  planId?: string;
}

export function trackPaywallShown(args: PaywallShownArgs): void {
  capturePostHogEvent('paywall_shown', { source: args.source, plan_id: args.planId });
  // Facebook ViewContent is the canonical "user saw an offer" signal.
  // Use Meta's documented standard parameter names for ad-optimisation
  // eligibility (fb_content_*).
  void logFacebookEvent('ViewContent', {
    fb_content_name: 'paywall',
    fb_content_category: args.source,
    fb_content_type: 'product_group',
    ...(args.planId ? { fb_content_id: args.planId } : {}),
  });
  // AppsFlyer: client-side custom event for funnel reporting.
  trackAppsFlyerEvent('paywall_shown', { source: args.source });
}

export function trackPaywallCompleted(args: PaywallShownArgs): void {
  // Note: the canonical Purchase / StartTrial events come from the
  // backend via pending_fb_events + AppsFlyer S2S — we deliberately
  // don't fire them here to avoid double-counting. PostHog only.
  capturePostHogEvent('paywall_completed', { source: args.source, plan_id: args.planId });
}

export function trackPaywallSkipped(args: PaywallShownArgs): void {
  capturePostHogEvent('paywall_skipped', { source: args.source });
}

export interface LoginArgs {
  userId: string;
  method: 'google' | 'apple' | 'facebook' | 'email' | string;
}

export function trackLogin(args: LoginArgs): void {
  capturePostHogEvent('login_completed', { method: args.method });
  // No direct FB SDK call — login isn't a Meta standard event and there's
  // no ad-optimisation use case for it. PostHog tracks it for funnel
  // analytics and AppsFlyer keeps it for re-engagement attribution.
  trackAppsFlyerEvent('af_login', { user_id: args.userId, af_registration_method: args.method });
  // Still set the FB user id so subsequent events (StartTrial, Purchase,
  // ViewContent) stitch back to the same Meta user record.
  void setFacebookUserId(args.userId);
}

export function trackSignupCompleted(args: LoginArgs): void {
  capturePostHogEvent('signup_completed', { method: args.method });
  // Meta standard event for ad optimisation on registration.
  void logFacebookEvent('CompletedRegistration', { fb_registration_method: args.method });
  trackAppsFlyerEvent('af_complete_registration', {
    af_registration_method: args.method,
    user_id: args.userId,
  });
  void setFacebookUserId(args.userId);
}

export function trackSignout(): void {
  capturePostHogEvent('signout');
  void clearFacebookUserId();
}

// ─────────────────────────────────────────────────────────────────
// Facebook event poller (backend-decided, client-fired)
// ─────────────────────────────────────────────────────────────────

interface PendingFbEvent {
  id: string;
  event_type: 'StartTrial' | 'Purchase' | 'InitialConversion';
  event_params: Record<string, unknown>;
  source: 'stripe' | 'iap';
  created_at: string;
}

// In-memory de-dup so a fast-fire poll cycle (3s + 10s + 20s) doesn't
// re-fire events whose `fired_at` POST hasn't landed yet.
const _firedFbEventIds = new Set<string>();

/**
 * Pull unfired pending FB events for this user from the Edge Function,
 * fire each via the FB SDK on-device, then mark as fired.
 *
 * `label` is just for log diagnostics ("launch" / "poll-3s" / etc.).
 */
export async function firePendingFbEvents(userId: string, label: string): Promise<void> {
  if (!userId) return;
  if (!isFacebookAnalyticsAvailable()) {
    // FB SDK isn't ready yet (race vs auth on cold start) — log so the
    // caller sees that we did fire the call, just deferred.
    console.log(
      `[track] FB events check skipped (${label}) for ${userId} — SDK not ready`,
    );
    return;
  }

  try {
    console.log(`[track] Checking pending FB events (${label}) for ${userId}`);
    const { data, error } = await supabase.functions.invoke('pending-fb-events', {
      method: 'GET',
    });
    if (error) {
      console.warn(`[track] pending-fb-events fetch failed (${label}):`, error);
      return;
    }
    const events: PendingFbEvent[] = (data as { events?: PendingFbEvent[] })?.events ?? [];
    if (events.length === 0) return;
    console.log(`[track] Pending FB events (${label}): ${events.length} found`);

    for (const event of events) {
      if (_firedFbEventIds.has(event.id)) continue;
      _firedFbEventIds.add(event.id);

      try {
        await fireFbEventFromBackend(event.event_type, event.event_params);
      } catch (fireErr) {
        console.warn('[track] FB SDK fire failed:', event.event_type, fireErr);
      }

      // Mark consumed on the backend. Best-effort: if this fails, the
      // event is still in the queue but our in-memory de-dup prevents
      // re-fire within the session, and the next launch will retry.
      try {
        await supabase.functions.invoke(`pending-fb-events/${event.id}/fired`, {
          method: 'POST',
        });
      } catch (markErr) {
        console.warn('[track] mark-fired failed:', event.id, markErr);
      }
      console.log(`[track] FB event fired (${label}): ${event.event_type}`);
    }
  } catch (err) {
    console.warn(`[track] firePendingFbEvents (${label}) threw:`, err);
  }
}

/**
 * Switch on event type and call the matching FB SDK method. Centralises
 * the "what method does which event use" logic so the rest of the app
 * doesn't need to know about logEvent vs logPurchase.
 */
async function fireFbEventFromBackend(
  eventType: 'StartTrial' | 'Purchase' | 'InitialConversion',
  params: Record<string, unknown>,
): Promise<void> {
  const productId = typeof params.productId === 'string' ? params.productId : '';
  const subscriptionType =
    typeof params.subscriptionType === 'string' ? params.subscriptionType : '';
  const revenue = typeof params.revenue === 'number' ? params.revenue : undefined;
  const currency = typeof params.currency === 'string' ? params.currency : 'USD';
  const isTrial = params.isTrial === true ? 1 : 0;

  // Use Meta's documented standard parameter names so events are eligible
  // for Catalog / Dynamic Product Ads / standard reporting columns.
  // - fb_content_id: product / SKU identifier (recognised for retargeting)
  // - fb_content_type: 'product' for SKUs, 'product_group' for collections
  // Custom keys (subscription_type, is_trial) stay as-is — Meta carries
  // them through as custom parameters for our own analyses.
  switch (eventType) {
    case 'StartTrial':
      await logFacebookEvent('StartTrial', {
        fb_content_id: productId,
        fb_content_type: 'product',
        subscription_type: subscriptionType,
      });
      return;
    case 'Purchase':
      if (revenue !== undefined) {
        await logFacebookPurchase(revenue, currency, {
          fb_content_id: productId,
          fb_content_type: 'product',
          subscription_type: subscriptionType,
        });
      }
      return;
    case 'InitialConversion': {
      // Custom Meta event so we can run a parallel campaign optimising on
      // "any first commitment" (trial start OR direct paid). For trials we
      // fire as a custom event; for direct paid we ALSO fire logPurchase
      // so VO campaigns see the revenue, plus the custom event for the
      // dedicated InitialConversion campaign.
      if (isTrial) {
        await logFacebookEvent('InitialConversion', {
          fb_content_id: productId,
          fb_content_type: 'product',
          subscription_type: subscriptionType,
          is_trial: 1,
        });
      } else if (revenue !== undefined) {
        await logFacebookPurchase(revenue, currency, {
          fb_content_id: productId,
          fb_content_type: 'product',
          subscription_type: subscriptionType,
          is_trial: 0,
        });
        await logFacebookEvent('InitialConversion', {
          fb_content_id: productId,
          fb_content_type: 'product',
          subscription_type: subscriptionType,
          is_trial: 0,
          revenue,
          currency,
        });
      }
      return;
    }
  }
}

/**
 * Schedule three poll cycles after a purchase: 3s / 10s / 20s. The first
 * two catch most webhooks (RC arrives within 1-2s typically); the 20s
 * retry handles slow webhook delivery. Beyond 20s we rely on the next
 * app launch's `checkPendingFbEventsOnLaunch` call.
 */
export function scheduleFbEventPolling(userId: string): void {
  if (!userId) return;
  setTimeout(() => void firePendingFbEvents(userId, 'poll-3s'), 3000);
  setTimeout(() => void firePendingFbEvents(userId, 'poll-10s'), 10000);
  setTimeout(() => void firePendingFbEvents(userId, 'poll-20s'), 20000);
}

/**
 * One-shot check on app launch / sign-in. Schedules a retry at 3s + 10s
 * because on cold-start the FB SDK init usually races AuthContext —
 * `checkPendingFbEventsOnLaunch` may run before `_initialized = true`.
 * The retries catch up after init completes.
 */
export async function checkPendingFbEventsOnLaunch(userId: string): Promise<void> {
  if (!userId) return;
  await firePendingFbEvents(userId, 'launch');
  setTimeout(() => void firePendingFbEvents(userId, 'launch-retry-3s'), 3000);
  setTimeout(() => void firePendingFbEvents(userId, 'launch-retry-10s'), 10000);
}