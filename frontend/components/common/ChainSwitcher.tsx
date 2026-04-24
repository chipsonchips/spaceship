"use client";

import React, { useState, useEffect } from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { CHAIN_CONFIGS } from "@/lib/chains";
import { ChevronDown } from "lucide-react";

const ChainSwitcher: React.FC = () => {
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const currentChain = CHAIN_CONFIGS[chainId];
  const availableChains = Object.values(CHAIN_CONFIGS);

  const handleChainSwitch = (newChainId: number) => {
    switchChain({ chainId: newChainId });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-green-500/30 hover:border-green-400/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-sm font-medium">
            {currentChain?.label || "Unknown"}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-slate-900 border border-green-500/30 rounded-lg shadow-lg z-50 min-w-[150px]">
          {availableChains.map((chain) => (
            <button
              key={chain.chain.id}
              onClick={() => handleChainSwitch(chain.chain.id)}
              disabled={isPending || chain.chain.id === chainId}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                chain.chain.id === chainId
                  ? "bg-green-500/20 text-green-400 font-medium"
                  : "text-gray-300 hover:bg-slate-800/50 hover:text-white"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {chain.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChainSwitcher;
