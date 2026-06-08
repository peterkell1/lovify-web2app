// @ts-nocheck -- ported from the (non-strict) Lovify app repo; web2app funnel code
/**
 * Meta Pixel (browser) for the web funnel at /start.
 *
 * Web-to-app is where the browser pixel shines (no ATT / SKAdNetwork). This
 * fires the top-of-funnel events client-side; the authoritative
 * Purchase/StartTrial conversion is sent server-side (Conversions API) from
 * the Stripe webhook with the shared landing_event_id for dedup.
 *
 * Pixel id defaults to the "Lovify Web2App Funnel" dataset (1028828676152285,
 * Lovify Inc BM); VITE_META_PIXEL_ID overrides it. Hard-coded so the funnel
 * pixel fires without a build-time env var (a pixel id is public anyway).
 */
const PIXEL_ID =
  (process.env.NEXT_PUBLIC_META_PIXEL_ID as string | undefined) || '1028828676152285';
let initialized = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fbq(): any {
  return (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq;
}

export function initMetaPixel(): void {
  if (initialized || !PIXEL_ID || typeof window === 'undefined') return;
  // Standard Meta Pixel bootstrap snippet.
  /* eslint-disable */
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  try {
    fbq()('init', PIXEL_ID);
    fbq()('track', 'PageView');
    initialized = true;
  } catch { /* ignore */ }
  // Capture/refresh web attribution (fbc/fbp + a stable event_id) on every
  // funnel page so the conversion can be deduped browser↔server CAPI.
  captureWebAttribution();
}

export function trackPixel(event: string, params?: Record<string, unknown>, eventId?: string): void {
  if (!PIXEL_ID) return;
  try {
    // eventID lets Meta dedupe this browser event against the matching
    // server-side Conversions API event (same event name + id = one conversion).
    fbq()?.('track', event, params || {}, eventId ? { eventID: eventId } : undefined);
  } catch { /* ignore */ }
}

// ─── Web attribution for deduped Pixel + server Conversions API ──────────────
// Captured on the funnel landing, persisted in localStorage so the SAME
// fbc/fbp/event_id are available on /start/success AND can be sent to the
// server (onboarding session) for the CAPI call. fbc must be in Meta's format
// (fb.1.<ts>.<fbclid>), NOT the raw fbclid. fbp is the _fbp cookie verbatim.
const ATTR_KEY = 'lov-web-attr';
export interface WebAttribution { fbc: string | null; fbp: string | null; eventId: string; }

function buildFbc(): string | null {
  const fbclid = new URLSearchParams(window.location.search).get('fbclid');
  return fbclid ? `fb.1.${Date.now()}.${fbclid}` : null;
}
function getFbp(): string | null {
  const m = document.cookie.match(/_fbp=([^;]+)/);
  return m ? m[1] : null;
}

/** Capture (first landing) or refresh (later pages) the web attribution. */
export function captureWebAttribution(): WebAttribution {
  const fallback: WebAttribution = { fbc: null, fbp: null, eventId: '' };
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(ATTR_KEY);
    const attr: WebAttribution = stored
      ? JSON.parse(stored)
      : { fbc: null, fbp: null, eventId: crypto.randomUUID() };
    // fbc only exists if the visitor arrived with ?fbclid; keep the first one.
    if (!attr.fbc) attr.fbc = buildFbc();
    // _fbp is set asynchronously by the pixel script, so refresh until present.
    if (!attr.fbp) attr.fbp = getFbp();
    if (!attr.eventId) attr.eventId = crypto.randomUUID();
    localStorage.setItem(ATTR_KEY, JSON.stringify(attr));
    return attr;
  } catch { return fallback; }
}

/** Read the persisted web attribution (null if none captured yet). */
export function getWebAttribution(): WebAttribution | null {
  if (typeof window === 'undefined') return null;
  try { const s = localStorage.getItem(ATTR_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}

/** Attribution we forward to the funnel session + Stripe metadata. */
export function readAttribution(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const p = new URLSearchParams(window.location.search);
  const keys = ['fbclid', 'gclid', 'ttclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const attr: Record<string, string> = {};
  for (const k of keys) { const v = p.get(k); if (v) attr[k] = v; }
  if (document.referrer) attr.referrer = document.referrer.slice(0, 300);
  return attr;
}