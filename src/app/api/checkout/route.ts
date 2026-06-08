/**
 * Checkout Route Handler (SCAFFOLDED — not implemented).
 *
 * The plan step of the funnel will POST the selected plan (and optionally the
 * collected onboarding answers) here. When you wire up Stripe:
 *
 *   1. Validate the request body (which plan, which price id).
 *   2. const session = await getStripe().checkout.sessions.create({
 *        mode: "subscription",
 *        line_items: [{ price: PRICE_ID, quantity: 1 }],
 *        success_url: `${publicEnv.appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
 *        cancel_url: `${publicEnv.appUrl}/onboarding/plan`,
 *        metadata: { ...onboarding answers },
 *      });
 *   3. return NextResponse.json({ url: session.url });
 *
 * Then have the funnel redirect the browser to `url`.
 */
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Checkout is not implemented yet." },
    { status: 501 }
  );
}
