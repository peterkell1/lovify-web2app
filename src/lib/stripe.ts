/**
 * Stripe server-side client (SCAFFOLDED — not yet wired into a checkout flow).
 *
 * This lazily constructs the Stripe SDK so the app boots fine without a key
 * configured. When you're ready to add payments:
 *   1. Fill STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET in .env.local
 *   2. Build a checkout Route Handler that calls getStripe().checkout...
 *   3. Build a webhook Route Handler (see src/app/api/stripe/webhook/route.ts)
 *
 * Server-only. Do not import into Client Components.
 */
import Stripe from "stripe";

import { serverEnv } from "@/lib/env";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripe) {
    stripe = new Stripe(serverEnv.stripeSecretKey, {
      // Pin the API version for predictable behavior across deploys.
      apiVersion: "2026-05-27.dahlia",
      typescript: true,
    });
  }
  return stripe;
}
