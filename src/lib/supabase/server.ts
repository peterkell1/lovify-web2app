/**
 * Supabase clients for use on the server (Server Components, Route Handlers,
 * Server Actions).
 *
 * - createClient(): user-scoped, reads/writes cookies so the session persists.
 *   Subject to Row Level Security.
 * - createAdminClient(): service-role, bypasses RLS. Use ONLY for trusted
 *   server-side fulfillment (e.g. a Stripe webhook granting access). Never
 *   forward user input to it without validation.
 */
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { publicEnv, serverEnv } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can be called from a Server Component where cookies are
            // read-only. Safe to ignore if middleware refreshes the session.
          }
        },
      },
    }
  );
}

/** Service-role client. Server-only, bypasses RLS. Handle with care. */
export function createAdminClient() {
  return createSupabaseClient(
    publicEnv.supabaseUrl,
    serverEnv.supabaseServiceRoleKey,
    { auth: { persistSession: false } }
  );
}
