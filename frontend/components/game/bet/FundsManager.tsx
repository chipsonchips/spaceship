"use client";

import React from "react";

interface FundsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  walletBalance: number | null;
  gameBalance: number | null;
  fundAmount: string;
  onFundAmountChange: (amount: string) => void;
  onDeposit: () => void;
  onWithdraw: () => void;
  isFunding: boolean;
}

export const FundsManager: React.FC<FundsManagerProps> = ({
  isOpen,
  onClose,
  walletBalance,
  gameBalance,
  fundAmount,
  onFundAmountChange,
  onDeposit,
  onWithdraw,
  isFunding,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-14 right-2 sm:right-5 w-64 sm:w-72 bg-slate-800 border border-slate-600 rounded-xl p-3 sm:p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs sm:text-sm font-orbitron font-bold text-white tracking-widest flex items-center gap-2">
          <span className="text-emerald-400">⚡</span> MANAGE FUNDS
        </h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between text-[10px] sm:text-xs font-courier text-slate-400">
          <button
            className="hover:text-emerald-400 transition-colors"
            onClick={() => onFundAmountChange(walletBalance?.toString() || "0")}
          >
            Wallet: {walletBalance?.toFixed(2) || "0.00"}
          </button>
          <button
            className="hover:text-emerald-400 transition-colors"
            onClick={() => onFundAmountChange(gameBalance?.toString() || "0")}
          >
            Game: {gameBalance?.toFixed(2) || "0.00"}
          </button>
        </div>
        <div className="relative">
          <input
            type="number"
            value={fundAmount}
            onChange={(e) => onFundAmountChange(e.target.value)}
            placeholder="0.00"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-orbitron focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
          />
          <span className="absolute right-3 top-2.5 text-[10px] sm:text-xs text-slate-500 font-bold font-courier tracking-widest">
            USDC
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onDeposit}
            disabled={isFunding || !fundAmount || parseFloat(fundAmount) <= 0}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white text-[10px] sm:text-xs font-bold font-orbitron tracking-wider py-2 sm:py-2.5 rounded-lg transition-colors shadow-[0_0_10px_rgba(16,185,129,0.2)]"
          >
            {isFunding ? "..." : "DEPOSIT"}
          </button>
          <button
            onClick={onWithdraw}
            disabled={isFunding || !fundAmount || parseFloat(fundAmount) <= 0}
            className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:hover:bg-slate-700 text-white text-[10px] sm:text-xs font-bold font-orbitron tracking-wider py-2 sm:py-2.5 rounded-lg transition-colors"
          >
            {isFunding ? "..." : "WITHDRAW"}
          </button>
        </div>
      </div>
    </div>
  );
};
