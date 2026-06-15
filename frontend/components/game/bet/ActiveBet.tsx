"use client";

import React from "react";
import type { PlayerBet } from "@/types/game";

interface ActiveBetProps {
  bet: PlayerBet;
  displayMultiplier: number;
  roundPhase: string;
  isCashingOut: boolean;
  optimisticCashOut: boolean;
  onCashOut: () => void;
  compact?: boolean;
}

export const ActiveBet: React.FC<ActiveBetProps> = ({
  bet,
  displayMultiplier,
  roundPhase,
  isCashingOut,
  optimisticCashOut,
  onCashOut,
  compact = false,
}) => {
  const potentialPayout = Number(bet.amount) * Number(displayMultiplier);

  // Compact mode for dual bet panels
  if (compact) {
    return (
      <div className="bg-gradient-to-b from-emerald-900/20 to-slate-900/60 border border-emerald-500/30 rounded-lg p-2 shadow-inner relative overflow-hidden">
        <div className="relative flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-orbitron text-emerald-400/80 uppercase tracking-wider font-semibold">
              ACTIVE
            </span>
            {bet.autoCashoutMultiplier && (
              <span className="bg-slate-800/60 border border-emerald-500/20 rounded px-1 py-0.5 text-[8px] text-emerald-400 font-bold font-courier">
                Auto: {bet.autoCashoutMultiplier}x
              </span>
            )}
          </div>
          <div className="text-sm font-black text-white">
            {Number(bet.amount).toFixed(2)}{" "}
            <span className="text-[9px] text-emerald-200">USDC</span>
          </div>
        </div>

        {(bet.cashedOut || optimisticCashOut) && bet.payout && (
          <div className="text-center py-1.5 bg-emerald-500/10 rounded border border-emerald-500/20 mb-1.5">
            <div className="text-emerald-400 font-black text-sm font-orbitron">
              {optimisticCashOut && isCashingOut
                ? "CASHING..."
                : `+ ${Number(bet.payout).toFixed(2)}`}
            </div>
            <div className="text-[8px] text-emerald-300 font-bold font-courier">
              {optimisticCashOut && isCashingOut
                ? "Processing..."
                : `@ ${bet.cashoutMultiplier}x`}
            </div>
          </div>
        )}

        {roundPhase === "FLYING" && !bet.cashedOut && !optimisticCashOut && (
          <button
            onClick={onCashOut}
            disabled={isCashingOut}
            className="w-full relative overflow-hidden rounded-md font-black font-orbitron uppercase tracking-wider text-xs transition-all disabled:opacity-50 transform active:scale-[0.97]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-red-500 to-orange-600 transition-all bg-[length:200%_auto] hover:bg-right"></div>
            <div className="relative px-2 py-1.5 flex items-center justify-center text-white shadow-[0_0_10px_rgba(239,68,68,0.2)]">
              <span className="text-sm mr-1">💰</span>
              <span>{isCashingOut ? "..." : "CASH OUT"}</span>
              {!isCashingOut && (
                <span className="ml-1 text-[10px] font-black">
                  {potentialPayout.toFixed(2)}
                </span>
              )}
            </div>
          </button>
        )}
      </div>
    );
  }

  // Full mode: Original detailed layout
  return (
    <div className="bg-gradient-to-b from-emerald-900/30 to-slate-900/80 border border-emerald-500/30 rounded-xl p-2.5 sm:p-4 shadow-inner relative overflow-hidden group">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none"></div>

      <div className="relative flex flex-row items-center justify-between mb-2 mt-0.5 sm:flex-col sm:justify-center sm:mb-3">
        <div className="text-left sm:text-center">
          <div className="text-[10px] font-orbitron text-emerald-400/80 uppercase tracking-widest mb-0 sm:mb-1 font-semibold flex items-center gap-2 flex-wrap">
            <span>ACTIVE BET</span>
            {bet.status === "PENDING" && (
              <span className="text-amber-500 animate-pulse text-[8px] sm:text-[9px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                VALIDATING...
              </span>
            )}
            {bet.status === "FAILED" && (
              <span className="text-red-500 text-[8px] sm:text-[9px] bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                FAILED
              </span>
            )}
          </div>
          {bet.status === "FAILED" && bet.validationError && (
            <div className="text-[8px] text-red-400 font-medium max-w-[150px] leading-tight mt-1">
              {bet.validationError}
            </div>
          )}
          {bet.autoCashoutMultiplier && (
            <div className="inline-block mt-0.5 sm:mt-1.5 bg-slate-800/80 border border-emerald-500/30 rounded-md px-1.5 py-0.5 text-[9px] sm:text-[10px] text-emerald-400 font-bold font-courier">
              Auto: {bet.autoCashoutMultiplier}x
            </div>
          )}
        </div>
        <div className="text-xl sm:text-2xl font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] text-right sm:text-center">
          {Number(bet.amount).toFixed(2)}{" "}
          <span className="text-xs sm:text-sm text-emerald-200">USDC</span>
        </div>
      </div>

      {(bet.cashedOut || optimisticCashOut) && bet.payout && (
        <div className="text-center mb-3 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 backdrop-blur-sm">
          <div className="text-emerald-400 font-black text-xl font-orbitron mb-0.5">
            {optimisticCashOut && isCashingOut
              ? "CASHING OUT..."
              : `+ ${Number(bet.payout).toFixed(2)} USDC`}
          </div>
          <div className="text-[10px] text-emerald-300 font-bold font-courier uppercase tracking-wide">
            {optimisticCashOut && isCashingOut
              ? "Processing Network Tx..."
              : `Secured at ${bet.cashoutMultiplier}x`}
          </div>
        </div>
      )}

      {roundPhase === "FLYING" && !bet.cashedOut && !optimisticCashOut && (
        <button
          onClick={onCashOut}
          disabled={isCashingOut}
          className="w-full relative group/btn overflow-hidden rounded-lg font-black font-orbitron uppercase tracking-widest text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-red-500 to-orange-600 transition-all bg-[length:200%_auto] hover:bg-right"></div>
          <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-20 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 translate-x-[-150%] group-hover/btn:translate-x-[150%] transition-all duration-700 ease-out z-10"></div>
          <div className="relative px-3 py-2 sm:px-4 sm:py-3 flex flex-col sm:flex-row items-center justify-center text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] z-20 gap-0.5 sm:gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-lg sm:text-xl leading-none group-hover/btn:scale-110 transition-transform">
                💰
              </span>
              <span className="text-base sm:text-lg">
                {isCashingOut ? "PROCESSING..." : "CASH OUT"}
              </span>
              <span className="hidden sm:inline-block text-base sm:text-lg">
                NOW
              </span>
            </div>
            {!isCashingOut && (
              <div className="sm:hidden text-2xl font-black drop-shadow-md leading-none mt-0.5">
                {potentialPayout.toFixed(2)}{" "}
                <span className="text-[10px] align-top text-white/80">
                  USDC
                </span>
              </div>
            )}
          </div>
        </button>
      )}
    </div>
  );
};
