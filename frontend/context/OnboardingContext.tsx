"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ONBOARDING_STORAGE_KEY } from "@/lib/onboarding";

interface OnboardingContextType {
  /** Whether the user has finished (or skipped) onboarding before. */
  hasOnboarded: boolean;
  /** Welcome "How to Play" modal visibility. */
  isWelcomeOpen: boolean;
  /** Guided spotlight tour activity. */
  isTourActive: boolean;
  /** Open the welcome modal (e.g. from the nav help button). */
  openWelcome: () => void;
  /** Close the welcome modal without starting the tour. */
  closeWelcome: () => void;
  /** Start the guided spotlight tour (closes the welcome modal). */
  startTour: () => void;
  /** End the tour. */
  endTour: () => void;
  /** Mark onboarding complete and close everything. */
  finishOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined,
);

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hasOnboarded, setHasOnboarded] = useState(true); // assume true until we read storage
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);

  // First-visit detection — auto-open the welcome modal once.
  useEffect(() => {
    try {
      const seen = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!seen) {
        setHasOnboarded(false);
        setIsWelcomeOpen(true);
      }
    } catch {
      // localStorage unavailable (SSR/private mode) — treat as already onboarded.
    }
  }, []);

  const persistOnboarded = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, Date.now().toString());
    } catch {
      /* ignore */
    }
    setHasOnboarded(true);
  }, []);

  const openWelcome = useCallback(() => {
    setIsTourActive(false);
    setIsWelcomeOpen(true);
  }, []);

  const closeWelcome = useCallback(() => {
    setIsWelcomeOpen(false);
    persistOnboarded();
  }, [persistOnboarded]);

  const startTour = useCallback(() => {
    setIsWelcomeOpen(false);
    setIsTourActive(true);
  }, []);

  const endTour = useCallback(() => {
    setIsTourActive(false);
    persistOnboarded();
  }, [persistOnboarded]);

  const finishOnboarding = useCallback(() => {
    setIsWelcomeOpen(false);
    setIsTourActive(false);
    persistOnboarded();
  }, [persistOnboarded]);

  return (
    <OnboardingContext.Provider
      value={{
        hasOnboarded,
        isWelcomeOpen,
        isTourActive,
        openWelcome,
        closeWelcome,
        startTour,
        endTour,
        finishOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (ctx === undefined) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return ctx;
}
