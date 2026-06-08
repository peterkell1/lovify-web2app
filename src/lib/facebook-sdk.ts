// Web stub — the native Facebook (Meta) SDK is iOS/Android only. On the web
// funnel, Meta tracking happens through the browser Pixel (lib/metaPixel) and
// the server-side CAPI, so these are safe no-ops.
export function isFacebookAnalyticsAvailable(): boolean { return false; }
export async function logFacebookEvent(_event: string, _params?: Record<string, unknown>): Promise<void> {}
export async function logFacebookPurchase(_amount: number, _currency: string, _params?: Record<string, unknown>): Promise<void> {}
export async function setFacebookUserId(_userId: string): Promise<void> {}
export async function clearFacebookUserId(): Promise<void> {}
