"use client";

import React from "react";
import AutoCashout from "../AutoCashout";

interface BetPlacementFormProps {
  betAmount: string;
  onBetAmountChange: (amount: string) => void;
  autoCashoutMultiplier: number | null;
  onAutoCashoutChange: (value: number | null) => void;
  useFreeBet: boolean;
  onUseFreeBetToggle: () => void;
  freeBetsRemaining: number;
  freeBetMaxAmount: number;
  maxBetAmount: number;
  lastBetAmount: string | null;
  isProcessing: boolean;
  canPlaceBet: boolean;
  isBettingPhase: boolean;
  validationError: string | null;
  onPlaceBet: () => void;
  onRebet?: () => void;
  explorerUrl: string;
  txHash: string | null;
  compact?: boolean; // Mobile-optimized compact mode
}

export const BetPlacementForm: React.FC<BetPlacementFormProps> = ({
  betAmount,
  onBetAmountChange,
  autoCashoutMultiplier,
  onAutoCashoutChange,
  useFreeBet,
  onUseFreeBetToggle,
  freeBetsRemaining,
  freeBetMaxAmount,
  maxBetAmount,
  lastBetAmount,
  isProcessing,
  canPlaceBet,
  isBettingPhase,
  validationError,
  onPlaceBet,
  onRebet,
  explorerUrl,
  txHash,
  compact = false,
}) => {
  // Compact mode: Ultra-minimal for mobile dual bet
  if (compact) {
    return (
      <div className="space-y-1.5 sm:space-y-2">
        {/* Compact Input with Inline Presets */}
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <div className="relative flex items-center bg-slate-900/60 border border-slate-600/60 rounded-md px-2 py-1.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
              <span className="text-emerald-400 mr-1 font-bold text-xs">$</span>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => onBetAmountChange(e.target.value)}
                step="0.10"
                min="0.10"
                className="w-full bg-transparent text-white text-sm font-bold font-orbitron focus:outline-none placeholder-slate-600"
                placeholder="0.00"
              />
            </div>
            {validationError && (
              <div className="text-red-400 text-[8px] mt-0.5 font-bold flex items-center gap-0.5">
                <span>⚠️</span>
                <span>{validationError}</span>
              </div>
            )}
          </div>

          {/* Quick Presets - Inline */}
          <div className="flex gap-1">
            {["0.5", "1", "5"].map((amount) => {
              const amountNum = parseFloat(amount);
              const isDisabled = useFreeBet
                ? amountNum > freeBetMaxAmount
                : amountNum > maxBetAmount;
              return (
                <button
                  key={amount}
                  onClick={() => onBetAmountChange(amount)}
                  disabled={isDisabled}
                  className={`px-2 py-1.5 rounded text-[10px] font-bold font-orbitron transition-all ${
                    isDisabled
                      ? "bg-slate-800/30 border border-slate-700/30 text-slate-600"
                      : "bg-slate-800/60 border border-slate-600/60 text-emerald-100 hover:border-emerald-500/50 active:scale-95"
                  }`}
                >
                  {amount}
                </button>
              );
            })}
          </div>
        </div>

        {/* Auto Cashout - Compact */}
        <AutoCashout
          value={autoCashoutMultiplier}
          onChange={onAutoCashoutChange}
          disabled={isProcessing}
        />

        {/* Place Bet Button - Compact */}
        <button
          onClick={onPlaceBet}
          disabled={!!validationError || isProcessing || !isBettingPhase}
          className="w-full relative overflow-hidden rounded-md font-bold font-orbitron uppercase tracking-wider text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.97]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 bg-[length:200%_auto] hover:bg-right transition-all duration-500"></div>
          <div className="relative px-3 py-2 flex items-center justify-center text-slate-950 shadow-[inset_0_1px_rgba(255,255,255,0.4)]">
            {isProcessing ? "..." : !isBettingPhase ? "CLOSED" : "PLACE BET"}
          </div>
        </button>

        {/* TX Hash - Ultra Compact */}
        {txHash && (
          <div className="text-[8px] font-courier flex items-center justify-center gap-1 bg-emerald-900/10 py-1 px-1.5 rounded border border-emerald-500/20">
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
            <a
              target="_blank"
              rel="noreferrer"
              href={`${explorerUrl}/tx/${txHash}`}
              className="text-emerald-300 underline"
            >
              {txHash.slice(0, 6)}...
            </a>
          </div>
        )}
      </div>
    );
  }

  // Full mode: Original detailed layout
  return (
    <div className="space-y-2 sm:space-y-3">
      {freeBetsRemaining > 0 && (
        <div className="bg-slate-800/60 border border-blue-500/30 rounded-lg p-3 flex items-center justify-between">
          <div>
            <div className="text-blue-300 font-bold font-orbitron text-xs flex items-center gap-1.5">
              <span>🎟️</span> Use Free Bet
            </div>
            <div className="text-[10px] text-blue-400/70 font-courier mt-0.5">
              Max Cover: {freeBetMaxAmount} USDC
            </div>
          </div>
          <button
            onClick={onUseFreeBetToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ${
              useFreeBet
                ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                : "bg-slate-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${
                useFreeBet ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      )}

      <div>
        <div className="relative group">
          <div className="relative flex items-center bg-slate-800/80 border border-slate-600 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 flex-1 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all overflow-hidden">
            <div className="flex items-center justify-center text-emerald-400 mr-2 font-bold text-sm sm:text-base select-none">
              $
            </div>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => onBetAmountChange(e.target.value)}
              step="0.10"
              min="0.10"
              className="w-full bg-transparent text-white text-lg sm:text-2xl font-bold font-orbitron focus:outline-none placeholder-slate-600"
              placeholder="0.00"
            />
            <span className="text-slate-500 text-[10px] sm:text-xs font-bold font-courier ml-2 select-none tracking-wider">
              USDC
            </span>
            {lastBetAmount && onRebet && (
              <button
                onClick={onRebet}
                disabled={isProcessing || !canPlaceBet}
                className="ml-2 px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 font-black font-orbitron uppercase text-[10px] sm:text-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 whitespace-nowrap shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                title={`Rebet previous amount: ${lastBetAmount} USDC`}
              >
                REBET
              </button>
            )}
          </div>
        </div>
        {validationError && (
          <div className="text-red-400 text-[10px] mt-1.5 font-bold flex items-start gap-1 px-1">
            <span className="text-red-500 mt-0.5">⚠️</span>
            <span>{validationError}</span>
          </div>
        )}
        <div className="text-[10px] text-slate-500 mt-1 font-courier flex justify-between px-1 uppercase tracking-wide">
          <span>
            {useFreeBet
              ? `Max Allowed: ${freeBetMaxAmount}`
              : `Max Bet: ${maxBetAmount} USDC`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {["0.5", "1", "5", "10"].map((amount) => {
          const amountNum = parseFloat(amount);
          const isDisabled = useFreeBet
            ? amountNum > freeBetMaxAmount
            : amountNum > maxBetAmount;
          return (
            <button
              key={amount}
              onClick={() => onBetAmountChange(amount)}
              disabled={isDisabled}
              className={`relative rounded-md py-1.5 text-xs font-bold font-orbitron transition-all ${
                isDisabled
                  ? "bg-slate-800/30 border border-slate-700/30 text-slate-600 cursor-not-allowed"
                  : "bg-slate-800/80 border border-slate-600/60 text-emerald-100 hover:border-emerald-500/50 hover:bg-slate-700 focus:outline-none"
              }`}
            >
              <span className="text-[9px] text-emerald-500 absolute top-0.5 left-1 opacity-50">
                +
              </span>
              {amount}
            </button>
          );
        })}
      </div>

      <AutoCashout
        value={autoCashoutMultiplier}
        onChange={onAutoCashoutChange}
        disabled={isProcessing}
      />

      <button
        onClick={onPlaceBet}
        disabled={!!validationError || isProcessing || !isBettingPhase}
        className="w-full mt-1 relative group/play overflow-hidden rounded-lg font-black font-orbitron uppercase tracking-widest text-sm sm:text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transform active:scale-[0.98]"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 bg-[length:200%_auto] hover:bg-right transition-all duration-500"></div>
        <div className="absolute inset-0 bg-black opacity-0 group-active/play:opacity-10 transition-opacity"></div>
        <div className="relative px-3 py-2.5 sm:px-4 sm:py-3.5 flex items-center justify-center text-slate-950 shadow-[inset_0_1px_rgba(255,255,255,0.4)] z-20">
          {isProcessing
            ? "PROCESSING..."
            : !isBettingPhase
              ? "BETTING CLOSED"
              : "PLACE BET"}
        </div>
      </button>

      {txHash && (
        <div className="mt-3 text-[10px] font-courier flex items-center justify-center gap-1.5 bg-emerald-900/20 py-1.5 px-2 rounded-md border border-emerald-500/20">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="text-emerald-400/80">Confirmed:</span>
          <a
            target="_blank"
            rel="noreferrer"
            href={`${explorerUrl}/tx/${txHash}`}
            className="text-emerald-300 underline text-[10px]"
          >
            {txHash.slice(0, 8)}...{txHash.slice(-6)}
          </a>
        </div>
      )}
    </div>
  );
};
