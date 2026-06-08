/**
 * Stripe webhook handler (SCAFFOLDED — verifies signature, no fulfillment yet).
 *
 * Configure the endpoint in the Stripe dashboard (or `stripe listen` locally)
 * to POST here. STRIPE_WEBHOOK_SECRET must be set for signature verification.
 *
 * TODO when wiring up payments:
 *   - Handle `checkout.session.completed` → mark the user/subscription active
 *     in Supabase via createAdminClient().
 *   - Handle `customer.subscription.updated` / `.deleted` for lifecycle.
 */
import { NextResponse } from "next/server";

import { getStripe } from "@/lib/stripe";
import { serverEnv } from "@/lib/env";

// Stripe needs the raw, unparsed body to verify the signature.
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      serverEnv.stripeWebhookSecret
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid payload";
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  switch (event.type) {
    case "checkout.session.completed":
      // TODO: fulfill — grant access / persist subscription in Supabase.
      break;
    default:
      // Unhandled event types are fine to acknowledge.
      break;
  }

  return NextResponse.json({ received: true });
}
