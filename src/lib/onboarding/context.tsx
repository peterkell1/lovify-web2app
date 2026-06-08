"use client";

/**
 * Client-side state for the onboarding funnel.
 *
 * Holds answers as the user moves through steps and persists them to
 * sessionStorage so a refresh mid-funnel doesn't lose progress. When the
 * funnel completes you'd typically flush this to Supabase (and/or attach it
 * to a Stripe checkout session) — see the README for where to hook that in.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import type { OnboardingData } from "./steps";

const STORAGE_KEY = "lovify:onboarding";

/** Read persisted answers. Returns {} on the server or if storage is empty. */
function readStored(): OnboardingData {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OnboardingData) : {};
  } catch {
    return {};
  }
}

type OnboardingContextValue = {
  data: OnboardingData;
  setField: <K extends keyof OnboardingData>(
    key: K,
    value: OnboardingData[K]
  ) => void;
  reset: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Lazy initializer reads persisted answers once, on the client. On the
  // server it returns {} so markup matches the first client render.
  const [data, setData] = useState<OnboardingData>(readStored);

  const setField = useCallback<OnboardingContextValue["setField"]>(
    (key, value) => {
      setData((prev) => {
        const next = { ...prev, [key]: value };
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Storage may be unavailable (private mode); state still works.
        }
        return next;
      });
    },
    []
  );

  const reset = useCallback(() => {
    setData({});
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // No-op.
    }
  }, []);

  const value = useMemo(
    () => ({ data, setField, reset }),
    [data, setField, reset]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return ctx;
}
