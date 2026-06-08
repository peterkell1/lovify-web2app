/**
 * Supabase client for use in the browser (Client Components).
 *
 * Uses the public anon key. Row Level Security in Supabase is what protects
 * data here — never put the service role key in browser code.
 */
import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";

export function createClient() {
  return createBrowserClient(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey
  );
}
