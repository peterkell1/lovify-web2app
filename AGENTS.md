<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Lovify — project guidance

Web-to-app onboarding funnel. Next.js 16 (App Router), TypeScript, Tailwind v4,
Supabase, with Stripe scaffolded but not yet connected.

## Conventions

- **Import alias:** `@/*` → `src/*`.
- **Env access** goes through `src/lib/env.ts` — don't read `process.env`
  directly elsewhere. Server-only secrets are behind getters that throw if
  missing; never import them into a Client Component.
- **Supabase:** browser client in `lib/supabase/client.ts`, server/admin in
  `lib/supabase/server.ts`. The admin (service-role) client bypasses RLS — use
  only in trusted server code (e.g. webhook fulfillment).
- **Funnel:** steps are defined once in `src/lib/onboarding/steps.ts`. Add a
  step by editing that array and adding a page under
  `src/app/onboarding/<slug>/`.
- Mark Client Components with `"use client"` only when they need
  hooks/interactivity.

## Verify before declaring done

```bash
npm run lint
npm run build      # also runs tsc; lists all routes
```

Both must pass.

## Stripe status

Not wired up. The plan step routes to `/success` directly. The checkout route
(`src/app/api/checkout/route.ts`) returns 501 by design until implemented. See
the README's "Wiring up Stripe" section for the integration checklist.
