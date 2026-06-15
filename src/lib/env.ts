/**
 * Centralized access to environment variables.
 *
 * Keeping reads in one place makes it obvious which vars are required and
 * surfaces a clear error at startup instead of an opaque failure later.
 * Public (NEXT_PUBLIC_*) vars are inlined at build time and safe for the
 * browser; server-only vars must never be imported into a client component.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Safe for the browser — inlined at build time. */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
  // RevenueCat Web Billing public API key (rcb_…) for the in-page purchases-js
  // checkout. Public-safe (ships to the browser like a Stripe publishable key).
  rcWebBillingKey: process.env.NEXT_PUBLIC_RC_WEB_BILLING_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

/**
 * Server-only secrets. Accessors throw if read without being configured, so
 * importing this module in a client bundle will fail loudly rather than leak.
 */
export const serverEnv = {
  get supabaseServiceRoleKey() {
    return required(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  },
  get stripeSecretKey() {
    return required("STRIPE_SECRET_KEY", process.env.STRIPE_SECRET_KEY);
  },
  get stripeWebhookSecret() {
    return required(
      "STRIPE_WEBHOOK_SECRET",
      process.env.STRIPE_WEBHOOK_SECRET
    );
  },
};
