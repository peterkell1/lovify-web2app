// @ts-nocheck -- ported from the (non-strict) Lovify app repo; web2app funnel code
/* Claim the onboarding v3 song into the account being created at /signup.
 *
 * The onboarding flow hands off to /signup with ?fs=<funnelSessionId>. After the
 * user authenticates, we call claim-onboarding-session (as that user) to copy
 * the song staged during onboarding into their generated_songs library.
 *
 * The session id is stashed in sessionStorage the moment /signup loads, so it
 * survives the OAuth redirect round-trip (Google/Apple/Facebook bounce the page,
 * dropping the query string). Cleared once claimed so a later signup on the same
 * device doesn't re-claim a stale session.
 */
import { supabase } from '@/integrations/supabase/client';

const FS_KEY = 'lov-onboarding-claim-fs';

/** Read the onboarding session id from ?fs= (preferred) or a prior stash, and
 *  stash it for the OAuth round-trip. Returns null when there's nothing to claim. */
export function readOnboardingSessionId(): string | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('fs');
    if (fromUrl) {
      sessionStorage.setItem(FS_KEY, fromUrl);
      return fromUrl;
    }
    return sessionStorage.getItem(FS_KEY);
  } catch {
    return null;
  }
}

/** Stash the onboarding session id ahead of an OAuth redirect that won't pass
 *  through /signup with ?fs= in the URL (e.g. Apple bounces back to /signup but
 *  some providers strip the query). Keeps the claim working after the round-trip. */
export function stashOnboardingSessionId(sessionId: string | null): void {
  if (!sessionId) return;
  try { sessionStorage.setItem(FS_KEY, sessionId); } catch { /* ignore */ }
}

function clearOnboardingSessionId(): void {
  try { sessionStorage.removeItem(FS_KEY); } catch { /* ignore */ }
}

/** Claim the staged onboarding song for the now-authenticated user. Idempotent
 *  and best-effort — a failure must never block the post-signup redirect. */
export async function claimOnboardingSession(sessionId: string | null): Promise<void> {
  if (!sessionId) return;
  try {
    await supabase.functions.invoke('claim-onboarding-session', { body: { sessionId } });
  } catch {
    // Swallow — the song stays staged and can be reconciled later; signup flow
    // must not be held up by this.
  } finally {
    clearOnboardingSessionId();
  }
}