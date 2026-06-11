# Lovify — web2app funnel

A web onboarding funnel built with **Next.js 16 (App Router)**, **TypeScript**,
**Tailwind CSS v4**, **Supabase**, and a **Stripe** integration scaffold.

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in values
npm run dev                  # http://localhost:3000
```

## Environment variables

See [.env.example](.env.example). Public (`NEXT_PUBLIC_*`) vars are safe for the
browser; everything else is server-only and must never be imported into a Client
Component.

| Variable | Required for | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Public anon key (protected by RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server fulfillment | **Secret.** Bypasses RLS |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe | Publishable key |
| `STRIPE_SECRET_KEY` | Stripe | **Secret** |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks | **Secret** |
| `NEXT_PUBLIC_APP_URL` | Redirects | e.g. `http://localhost:3000` |

## Project structure

```
src/
  app/
    page.tsx                 Landing page → "Get started"
    onboarding/
      layout.tsx             Wraps the funnel in OnboardingProvider
      page.tsx               Redirects to the first step
      goal/                  Step 1
      experience/            Step 2
      plan/                  Step 3 → checkout
    success/                 Post-checkout page
    api/
      checkout/route.ts        Stripe Checkout Session (stub, 501)
      stripe/webhook/route.ts  Stripe webhook (signature verified, no fulfillment)
  components/
    ui/button.tsx
    onboarding/              option-card, progress-bar
  lib/
    env.ts                   Centralized env access
    cn.ts                    className helper
    stripe.ts                Stripe SDK (lazy)
    supabase/client.ts       Browser client
    supabase/server.ts       Server + admin (service-role) clients
    onboarding/steps.ts      Funnel definition (single source of truth)
    onboarding/context.tsx   Funnel state (sessionStorage-backed)
```

## The funnel

Steps are defined in [src/lib/onboarding/steps.ts](src/lib/onboarding/steps.ts).
Answers are collected in a React context and persisted to `sessionStorage` so a
mid-funnel refresh doesn't lose progress. To add/reorder steps, edit that array
and add a matching page under `src/app/onboarding/<slug>/`.

## What's wired vs. scaffolded

- ✅ **Supabase** clients ready (browser, server, admin). Just add credentials.
- ✅ **Onboarding funnel** fully walkable end-to-end.
- 🚧 **Stripe** is structurally scaffolded but **not connected**. The plan step
  currently routes straight to `/success`.

### Wiring up Stripe (when ready)

1. Fill the Stripe vars in `.env.local`.
2. Implement [src/app/api/checkout/route.ts](src/app/api/checkout/route.ts) to
   create a Checkout Session (template in the file's comment).
3. Update `handleCheckout` in
   [src/app/onboarding/plan/page.tsx](src/app/onboarding/plan/page.tsx) to POST
   to `/api/checkout` and redirect to the returned session URL.
4. Implement fulfillment in
   [src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts)
   (`checkout.session.completed` → persist to Supabase via the admin client).
5. Test locally with `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |

<!-- prod env: RC purchase link switched to production token (rebuild trigger) -->

<!-- force clean build: VERCEL_FORCE_NO_BUILD_CACHE — stale prerender cache was serving the old home page -->
