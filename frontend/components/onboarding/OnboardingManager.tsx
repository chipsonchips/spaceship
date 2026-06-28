"use client";

import React from "react";
import { useAccount } from "wagmi";
import { useOnboarding } from "@/context/OnboardingContext";
import useUSDC from "@/hooks/useUSDC";
import HowToPlayModal from "./HowToPlayModal";
import SpotlightTour from "./SpotlightTour";

/**
 * Mounts the first-time onboarding surfaces (welcome modal + guided tour) and
 * feeds them the live wallet/balance state so tour steps adapt to context.
 */
export default function OnboardingManager() {
  const { isWelcomeOpen, isTourActive, closeWelcome, startTour, endTour } =
    useOnboarding();
  const { isConnected } = useAccount();
  const { gameBalance } = useUSDC();

  return (
    <>
      <HowToPlayModal
        isOpen={isWelcomeOpen}
        onClose={closeWelcome}
        onStartTour={startTour}
      />
      <SpotlightTour
        isActive={isTourActive}
        onFinish={endTour}
        ctx={{ isConnected, gameBalance }}
      />
    </>
  );
}
