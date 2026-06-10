// @ts-nocheck -- ported from the (non-strict) Lovify app repo; web2app funnel code
/* Lovify Onboarding v3 — session + persistence layer.
 *
 * Two concerns, one place:
 *
 *  1. LOCAL step persistence (Phase 1) — mirror the whole flow (current step,
 *     every answer, the chat transcript) into localStorage so a refresh or a
 *     return-to-tab resumes exactly where the user left off, on web AND in the
 *     Capacitor app, with zero network dependency.
 *
 *  2. SERVER session linkage (Phase 2/4) — a single anonymous funnel_session id
 *     is the thread that ties the onboarding run to the song the user makes and,
 *     eventually, to the account they create at /signup. We create it once on
 *     flow start, write progress as they move, stage the finished song against
 *     it, and hand the id to /signup so the new account can CLAIM the song.
 *
 * No email is ever collected in onboarding — only the session id travels. The
 * account's email is captured at /signup, where claim-onboarding-session
 * attaches funnel_sessions.user_id and copies the staged song into
 * generated_songs for that user.
 */
import { supabase } from '@/integrations/supabase/client';
import { captureWebAttribution } from '@/lib/metaPixel';

// ─────────────────────────────────────────────────────────────────────────
// 1. Local step persistence
// ─────────────────────────────────────────────────────────────────────────

// Bump when the persisted shape changes incompatibly, so a stale blob from an
// older build is dropped instead of crashing the restore.
const SNAPSHOT_VERSION = 1;

const snapshotKey = (mode: string) => `lov-onboarding-comeback1-snapshot-${mode}`;

export interface FlowSnapshot<TState, TChat> {
  v: number;
  step: number;
  state: TState;
  chat: TChat | null;
  sessionId: string | null;
  savedAt: number;
}

/** Read the saved snapshot for this surface, or null if absent/incompatible. */
export function loadSnapshot<TState, TChat>(mode: string): FlowSnapshot<TState, TChat> | null {
  try {
    const raw = localStorage.getItem(snapshotKey(mode));
    if (!raw) return null;
    const snap = JSON.parse(raw) as FlowSnapshot<TState, TChat>;
    if (snap?.v !== SNAPSHOT_VERSION) return null;
    return snap;
  } catch {
    return null;
  }
}

/** Persist the current flow position. Fire-and-forget; never throws. */
export function saveSnapshot<TState, TChat>(
  mode: string,
  snap: Omit<FlowSnapshot<TState, TChat>, 'v' | 'savedAt'>,
): void {
  try {
    const payload: FlowSnapshot<TState, TChat> = { ...snap, v: SNAPSHOT_VERSION, savedAt: Date.now() };
    localStorage.setItem(snapshotKey(mode), JSON.stringify(payload));
  } catch {
    // Quota / private-mode / serialization failure — persistence is best-effort.
  }
}

/** Wipe the saved snapshot (called once the flow completes at account creation). */
export function clearSnapshot(mode: string): void {
  try { localStorage.removeItem(snapshotKey(mode)); } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Server session linkage
// ─────────────────────────────────────────────────────────────────────────

// The session id outlives a single page load (persisted alongside the snapshot
// AND under its own key) so a refresh keeps writing to the SAME server session
// instead of orphaning the first one.
const SESSION_ID_KEY = 'lov-onboarding-comeback1-session-id';

export function getStoredSessionId(): string | null {
  try { return localStorage.getItem(SESSION_ID_KEY); } catch { return null; }
}
function setStoredSessionId(id: string): void {
  try { localStorage.setItem(SESSION_ID_KEY, id); } catch { /* ignore */ }
}
export function clearStoredSessionId(): void {
  try { localStorage.removeItem(SESSION_ID_KEY); } catch { /* ignore */ }
}

/** Best-effort attribution to carry into the session (UTMs etc.), if present. */
function readAttribution(): Record<string, string> {
  try {
    const p = new URLSearchParams(window.location.search);
    const out: Record<string, string> = {};
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid']) {
      const v = p.get(k);
      if (v) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Ensure a server-side onboarding session exists, returning its id. Reuses the
 * stored id on a refresh; only creates a new session the first time. Returns
 * null (and the flow degrades to local-only persistence) if the backend is
 * unreachable — e.g. preview builds without real Supabase keys.
 */
export async function ensureSession(surface: 'app' | 'web'): Promise<string | null> {
  const existing = getStoredSessionId();
  if (existing) return existing;
  try {
    const { data, error } = await supabase.functions.invoke('onboarding-session', {
      body: {
        action: 'start',
        surface,
        // Web also carries fbc/fbp/event_id for the server-side Meta CAPI.
        attribution: { ...readAttribution(), ...(surface === 'web' ? captureWebAttribution() : {}) },
      },
    });
    const id = (data as { sessionId?: string } | null)?.sessionId;
    if (error || !id) return null;
    setStoredSessionId(id);
    return id;
  } catch {
    return null;
  }
}

/**
 * Refresh the session's web attribution (fbc/fbp/event_id) — call right before
 * checkout so the _fbp cookie (set asynchronously by the pixel after landing)
 * is captured server-side for the Meta CAPI Purchase. Best-effort.
 */
export async function saveSessionAttribution(sessionId: string | null): Promise<void> {
  if (!sessionId) return;
  try {
    await supabase.functions.invoke('onboarding-session', {
      body: { action: 'progress', sessionId, attribution: captureWebAttribution() },
    });
  } catch { /* best-effort — never block checkout */ }
}

/** Write the user's current step + accumulated answers to the session. */
export async function saveSessionProgress(
  sessionId: string | null,
  currentStepKey: string,
  answers: Record<string, unknown>,
): Promise<void> {
  if (!sessionId) return;
  try {
    await supabase.functions.invoke('onboarding-session', {
      body: { action: 'progress', sessionId, currentStepKey, answers },
    });
  } catch {
    // Fire-and-forget — local persistence already covers resume.
  }
}

export interface StagedSong {
  title: string;
  lyrics: string;
  style: string;
  voice: string;
  audioUrl: string | null;
  imageUrl?: string | null;
  visionUrl?: string | null;
}

/** Stage the finished onboarding song/vision against the session so it can be
 *  claimed into generated_songs once the account is created at /signup. */
export async function stageSong(sessionId: string | null, song: StagedSong): Promise<void> {
  if (!sessionId || !song.audioUrl) return;
  try {
    await supabase.functions.invoke('stage-onboarding-song', {
      body: { sessionId, song },
    });
  } catch {
    // Best-effort — the song still plays in the reveal even if staging fails.
  }
}