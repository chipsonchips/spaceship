"use client";

import React from "react";

interface BetHeaderProps {
  mounted: boolean;
  chainLabel: string;
  walletBalance: number | null;
  gameBalance: number | null;
  freeBetsRemaining: number;
  isManagingFunds: boolean;
  onToggleFunds: () => void;
  onToggleMode?: () => void;
  showModeToggle?: boolean;
  modeLabel?: string;
}

export const BetHeader: React.FC<BetHeaderProps> = ({
  mounted,
  chainLabel,
  walletBalance,
  gameBalance,
  freeBetsRemaining,
  isManagingFunds,
  onToggleFunds,
  onToggleMode,
  showModeToggle = false,
  modeLabel = "MULTI",
}) => {
  return (
    <div className="flex items-center justify-between text-[9px] sm:text-xs text-slate-400 font-orbitron tracking-wider">
      <span className="flex items-center gap-1">
        <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)] animate-pulse"></span>
        <span className="hidden sm:inline">
          {mounted ? chainLabel : "Loading..."}
        </span>
        <span className="sm:hidden">
          {mounted ? chainLabel.split(" ")[0] : "..."}
        </span>
      </span>
      <div className="flex gap-1.5 sm:gap-2">
        <button
          onClick={onToggleFunds}
          className={`bg-slate-800/80 px-2 sm:px-3 py-1 rounded border transition-colors flex items-center gap-2 sm:gap-3 ${
            isManagingFunds
              ? "border-emerald-500"
              : "border-slate-700/50 hover:border-emerald-500/50"
          }`}
        >
          <div className="flex flex-col items-end">
            <span className="text-[8px] sm:text-[9px] text-slate-500 font-medium leading-none mb-0.5 tracking-wider">
              WALLET
            </span>
            <span className="text-slate-400 text-[10px] sm:text-xs font-bold leading-none">
              {mounted ? walletBalance?.toFixed(2) || "0.00" : "0.00"}
            </span>
          </div>
          <div className="w-px h-5 bg-slate-700/80"></div>
          <div className="flex flex-col items-end">
            <span className="text-[8px] sm:text-[9px] text-emerald-500/70 font-bold leading-none mb-0.5 tracking-wider">
              GAME
            </span>
            <span className="text-emerald-400 text-xs sm:text-sm font-black leading-none flex items-center gap-1">
              <span className="text-[10px]">💰</span>
              {mounted ? gameBalance?.toFixed(2) || "0.00" : "0.00"}
            </span>
          </div>
        </button>
        {showModeToggle && onToggleMode && (
          <button
            onClick={onToggleMode}
            title={`Switch to ${modeLabel === "MULTI" ? "Multiple" : "Single"} Bets Mode`}
            className="bg-slate-800/80 px-2 sm:px-3 py-1 rounded border border-slate-700/50 hover:border-blue-500/50 transition-colors flex items-center gap-1.5"
          >
            <span className="text-[10px] sm:text-xs text-slate-400 font-bold font-orbitron">
              {modeLabel}
            </span>
            <svg
              className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  modeLabel === "MULTI"
                    ? "M4 6h16M4 12h16M4 18h16"
                    : "M4 6h16M4 12h8"
                }
              />
            </svg>
          </button>
        )}
        {freeBetsRemaining > 0 && (
          <span className="bg-blue-900/30 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-blue-500/30 text-blue-400 text-[10px] sm:text-xs font-bold flex items-center gap-1">
            <span className="text-blue-500 text-[9px] sm:text-[10px]">🎟️</span>
            {freeBetsRemaining}
            <span className="hidden sm:inline text-[9px] text-blue-500/70">
              FREE
            </span>
          </span>
        )}
      </div>
    </div>
  );
};
