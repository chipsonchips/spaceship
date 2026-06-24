"use client";

import React from "react";
import { haptics } from "@/lib/haptics";

interface BetAdjustersProps {
  betAmount: string;
  onBetAmountChange: (amount: string) => void;
  /** Hard ceiling for a single bet (per-user max). */
  maxBetAmount: number;
  /** Available game balance — MAX never exceeds it. */
  gameBalance: number | null;
  /** Minimum bet allowed. */
  minBetAmount?: number;
  /** Free-bet mode caps everything at the free-bet max. */
  useFreeBet?: boolean;
  freeBetMaxAmount?: number;
  disabled?: boolean;
  compact?: boolean;
}

/**
 * Standard crash-game quick-adjust row: halve, double, and MAX. Clamps to the
 * min bet and the lower of (balance, per-user max) so the result is always
 * placeable.
 */
export const BetAdjusters: React.FC<BetAdjustersProps> = ({
  betAmount,
  onBetAmountChange,
  maxBetAmount,
  gameBalance,
  minBetAmount = 0.1,
  useFreeBet = false,
  freeBetMaxAmount = 0.1,
  disabled = false,
  compact = false,
}) => {
  const ceiling = useFreeBet
    ? freeBetMaxAmount
    : Math.min(maxBetAmount, gameBalance ?? maxBetAmount);

  const clamp = (value: number) =>
    Math.max(minBetAmount, Math.min(ceiling, value));

  const current = parseFloat(betAmount) || 0;

  const set = (value: number) => {
    if (disabled) return;
    haptics.tap();
    onBetAmountChange(clamp(value).toFixed(2));
  };

  const buttons: { label: string; title: string; onClick: () => void }[] = [
    { label: "½", title: "Halve bet", onClick: () => set(current / 2) },
    { label: "2×", title: "Double bet", onClick: () => set(current * 2) },
    { label: "MAX", title: "Bet maximum", onClick: () => set(ceiling) },
  ];

  return (
    <div className={`grid grid-cols-3 ${compact ? "gap-1" : "gap-1.5 sm:gap-2"}`}>
      {buttons.map((b) => (
        <button
          key={b.label}
          onClick={b.onClick}
          disabled={disabled}
          title={b.title}
          className={`rounded-md font-black font-orbitron transition-all border active:scale-95 disabled:opacity-40 disabled:active:scale-100 ${
            compact ? "py-1 text-[10px]" : "py-1.5 text-xs"
          } ${
            b.label === "MAX"
              ? "bg-amber-500/15 border-amber-500/40 text-amber-300 hover:border-amber-400/70 hover:bg-amber-500/25"
              : "bg-slate-800/80 border-slate-600/60 text-slate-200 hover:border-emerald-500/50 hover:bg-slate-700"
          }`}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
};

export default BetAdjusters;
