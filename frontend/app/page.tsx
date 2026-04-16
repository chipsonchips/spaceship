"use client";

import { useEffect, useState } from "react";
import AviatorGameScreen from "../components/gameScreen";
import { isFarcasterContext } from "@/lib/utils";

export default function Home() {
  const [isMiniPay, setIsMiniPay] = useState(false);

  useEffect(() => {
    const minipay =
      typeof window !== "undefined" &&
      window.ethereum &&
      (window.ethereum as any).isMiniPay;
    setIsMiniPay(!!minipay);

    // Only initialize Farcaster SDK if running in Farcaster miniapp context AND not in MiniPay
    if (isFarcasterContext() && !minipay) {
      // Dynamic import to avoid errors in non-Farcaster contexts
      import("@farcaster/miniapp-sdk")
        .then(({ sdk }) => {
          sdk.actions.ready();
        })
        .catch((error) => {
          console.warn("Farcaster SDK not available:", error);
        });
    }
  }, []);

  return <AviatorGameScreen />;
}
