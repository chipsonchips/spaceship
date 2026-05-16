"use client";

import React from "react";
import { useGameContext } from "@/context/GameContext";
import { useSettings } from "@/context/SettingsContext";
import { useMultiplierAnimation } from "@/hooks/useGame";
import useUSDC from "@/hooks/useUSDC";

const PotentialPayout: React.FC = () => {
  const { roundData } = useGameContext();
  const { settings } = useSettings();
  const displayMultiplier = useMultiplierAnimation(roundData);
  const { walletAddress } = useUSDC();

  if (!settings.potentialPayoutEnabled) {
    return null;
  }

  const myBet =
    roundData?.players?.find(
      (p: any) => p.address?.toLowerCase() === walletAddress?.toLowerCase(),
    ) || null;

  if (!myBet || roundData?.phase !== "FLYING" || myBet.cashedOut) {
    return null;
  }

  const potentialPayout = Number(myBet.amount || 0) * Number(displayMultiplier || 1);
  const profit = potentialPayout - Number(myBet.amount || 0);

  return (
    <div className="hidden sm:block fixed bottom-32 right-4 sm:right-6 z-40 pointer-events-none">
      <div className="bg-gradient-to-b from-emerald-900/40 to-slate-900/60 backdrop-blur-md border border-emerald-500/40 rounded-lg p-3 sm:p-4 shadow-lg min-w-[180px] sm:min-w-[220px]">
        <div className="text-[10px] sm:text-xs text-emerald-400/80 font-bold font-orbitron uppercase tracking-widest mb-2">
          Potential Payout
        </div>
        <div className="text-2xl sm:text-3xl font-black text-emerald-300 font-orbitron mb-1">
          {typeof potentialPayout === "number" ? potentialPayout.toFixed(2) : "0.00"}{" "}
          <span className="text-sm text-emerald-400">USDC</span>
        </div>
        <div
          className={`text-xs sm:text-sm font-bold font-courier ${
            profit >= 0 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {profit >= 0 ? "+" : ""}
          {typeof profit === "number" ? profit.toFixed(2) : "0.00"} USDC
        </div>
        <div className="mt-2 pt-2 border-t border-emerald-500/20 text-[9px] text-emerald-300/70 font-courier">
          Bet: {Number(myBet.amount || 0).toFixed(2)} ×{" "}
          {typeof displayMultiplier === "number" ? displayMultiplier.toFixed(2) : Number(displayMultiplier || 1).toFixed(2)}x
        </div>
      </div>
    </div>
  );
};

export default PotentialPayout;
