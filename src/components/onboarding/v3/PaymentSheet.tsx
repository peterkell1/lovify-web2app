// @ts-nocheck -- ported from the (non-strict) Lovify app repo; web2app funnel code
// Web2App: checkout goes through RevenueCat's hosted page (see lib/rcCheckout +
// OnboardingV3Flow.buyPlan). The old in-page Stripe Elements sheet is not used
// here, so this is a no-op stub that preserves the prop interface. (Stripe can
// be wired later via the Next /api/checkout route.)
export function PaymentSheet(_props: {
  open: boolean;
  planId: string;
  isTrial: boolean;
  onClose: () => void;
  armPlanId?: string;
}) {
  return null;
}