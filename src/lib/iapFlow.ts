// Web stub — Apple/Google in-app purchases are native-only. On the web funnel,
// purchases go through RevenueCat's hosted checkout (see lib/rcCheckout), so
// this path is never used; it just reports "not handled".
export async function purchaseViaIAP(
  _planId: string,
): Promise<{ handled: boolean; success?: boolean; cancelled?: boolean }> {
  return { handled: false };
}
