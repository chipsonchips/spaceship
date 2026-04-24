"use client";

import React from "react";
import { useChainId } from "wagmi";
import { AlertCircle } from "lucide-react";
import { CHAIN_CONFIGS } from "@/lib/chains";
import { useEffect, useState } from "react";

/**
 * Displays a warning if the user is on an unsupported chain
 */
const ChainWarning: React.FC = () => {
  const chainId = useChainId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isSupported = chainId in CHAIN_CONFIGS;

  if (isSupported) return null;

  return (
    <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4 flex items-start gap-3 mb-4">
      <AlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
      <div>
        <h3 className="text-yellow-400 font-semibold mb-1">
          Unsupported Chain
        </h3>
        <p className="text-yellow-300 text-sm">
          Please switch to Base or Celo to play Aviator. Your current chain is
          not supported.
        </p>
      </div>
    </div>
  );
};

export default ChainWarning;
