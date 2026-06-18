'use client';
import { supabase } from '@/integrations/supabase/client';

// Minimal web auth used by the funnel's account-creation step. The native app
// has a richer AuthContext; on the web funnel we go straight to Supabase auth.
// Returns are coerced to { error?: Error } to match the V3_CreateAccount props.
export function useAuth() {
  return {
    signInWithApple: async (redirectTo?: string): Promise<{ error?: Error }> => {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: redirectTo ? { redirectTo: `${origin}${redirectTo}` } : undefined,
      });
      return { error: error ?? undefined };
    },
    // DEV NOTE: requires the Google provider enabled in Supabase
    // (Auth → Providers → Google, with client id/secret).
    signInWithGoogle: async (redirectTo?: string): Promise<{ error?: Error }> => {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: redirectTo ? { redirectTo: `${origin}${redirectTo}` } : undefined,
      });
      return { error: error ?? undefined };
    },
    signUpWithEmail: async (
      email: string,
      password: string,
      _name?: string,
    ): Promise<{ error?: Error; needsEmailConfirmation?: boolean }> => {
      const { data, error } = await supabase.auth.signUp({ email, password });
      return { error: error ?? undefined, needsEmailConfirmation: !!data?.user && !data.session };
    },
    signInWithEmail: async (email: string, password: string): Promise<{ error?: Error }> => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ?? undefined };
    },
  };
}
