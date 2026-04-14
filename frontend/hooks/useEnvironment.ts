import { useState, useEffect } from "react";

export type AppEnvironment = "minipay" | "base" | "unknown";

export function useEnvironment() {
  const [env, setEnv] = useState<AppEnvironment>("unknown");

  useEffect(() => {
    // Check if we are inside the MiniPay embedded browser
    if (typeof window !== "undefined") {
      if (window.ethereum && (window.ethereum as any).isMiniPay) {
        setEnv("minipay");
      } else {
        // Technically this includes Desktop browsers and Farcaster frames
        // In the context of our conditional providers, they both utilize the `base` fallback logic.
        setEnv("base");
      }
    }
  }, []);

  return env;
}
