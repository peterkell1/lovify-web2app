// Web stub — AppsFlyer is a native (iOS/Android) attribution SDK. On the web
// funnel every call is a safe no-op.
export function initAppsFlyer(): void {}
export async function getAppsFlyerUID(): Promise<string | null> { return null; }
export async function trackAppsFlyerEvent(
  _event: string,
  _values?: Record<string, unknown>,
): Promise<void> {}
