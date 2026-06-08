// Web stub for @capacitor/core — this funnel runs on the web only, so the
// native platform checks always report "web" and plugins are unavailable.
export const Capacitor = {
  isNativePlatform: () => false,
  getPlatform: () => 'web' as const,
  isPluginAvailable: () => false,
};
export default { Capacitor };
