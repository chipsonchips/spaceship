"use client";

import React, { useState, useEffect } from "react";
import useUSDC from "@/hooks/useUSDC";
import useChainInfo from "@/hooks/useChainInfo";
import { BetHeader } from "./BetHeader";
import { FundsManager } from "./FundsManager";
import { SingleBetPanel } from "./SingleBetPanel";
import { getUserFriendlyErrorMessage } from "@/lib/error-messages";

interface DualBetControlsProps {
  onToggleMode?: () => void;
}

export const DualBetControls: React.FC<DualBetControlsProps> = ({
  onToggleMode,
}) => {
  const {
    walletBalance,
    gameBalance,
    walletAddress,
    refreshBalance,
    depositUSDC,
    withdrawUSDC,
  } = useUSDC();
  const { chainLabel, explorerUrl } = useChainInfo();

  const [isManagingFunds, setIsManagingFunds] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [isFunding, setIsFunding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freeBetsRemaining] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 3000);
    return () => clearTimeout(timer);
  }, [error]);

  const handleDeposit = async () => {
    if (!fundAmount || isNaN(parseFloat(fundAmount))) return;
    try {
      setIsFunding(true);
      setError(null);
      await depositUSDC(parseFloat(fundAmount));
      setIsManagingFunds(false);
      setFundAmount("");
    } catch (err) {
      const friendlyError = getUserFriendlyErrorMessage(err);
      setError(friendlyError);
    } finally {
      setIsFunding(false);
    }
  };

  const handleWithdraw = async () => {
    if (!fundAmount || isNaN(parseFloat(fundAmount))) return;
    try {
      setIsFunding(true);
      setError(null);
      await withdrawUSDC(parseFloat(fundAmount));
      setIsManagingFunds(false);
      setFundAmount("");
    } catch (err) {
      const friendlyError = getUserFriendlyErrorMessage(err);
      setError(friendlyError);
    } finally {
      setIsFunding(false);
    }
  };

  return (
    <div className="relative bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.5)] rounded-t-2xl sm:rounded-2xl">
      {/* Header */}
      <div className="p-2 sm:p-5 pb-2 sm:pb-3">
        <BetHeader
          mounted={mounted}
          chainLabel={chainLabel}
          walletBalance={walletBalance}
          gameBalance={gameBalance}
          freeBetsRemaining={freeBetsRemaining}
          isManagingFunds={isManagingFunds}
          onToggleFunds={() => setIsManagingFunds(!isManagingFunds)}
          onToggleMode={onToggleMode}
          showModeToggle={!!onToggleMode}
          modeLabel="SINGLE"
        />

        <FundsManager
          isOpen={isManagingFunds}
          onClose={() => setIsManagingFunds(false)}
          walletBalance={walletBalance}
          gameBalance={gameBalance}
          fundAmount={fundAmount}
          onFundAmountChange={setFundAmount}
          onDeposit={handleDeposit}
          onWithdraw={handleWithdraw}
          isFunding={isFunding}
        />
      </div>

      {/* Both Mobile & Desktop: Vertical Stack (Mobile) / Side-by-Side (Desktop) */}
      <div className="p-2 sm:px-5 sm:pb-5 pt-0">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
          {/* Bet Panel 1 - Compact */}
          <div className="bg-slate-800/40 border border-emerald-600/40 rounded-lg p-2 sm:p-3 lg:p-4 hover:border-emerald-500/60 transition-all relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]"></span>
                <span className="text-[10px] sm:text-xs font-orbitron font-bold text-emerald-400 uppercase tracking-wider">
                  BET #1
                </span>
              </div>
            </div>
            <SingleBetPanel
              panelId={1}
              explorerUrl={explorerUrl}
              walletAddress={walletAddress}
              gameBalance={gameBalance}
              refreshBalance={refreshBalance}
              compact={true}
            />
          </div>

          {/* Bet Panel 2 - Compact */}
          <div className="bg-slate-800/40 border border-blue-600/40 rounded-lg p-2 sm:p-3 lg:p-4 hover:border-blue-500/60 transition-all relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.6)]"></span>
                <span className="text-[10px] sm:text-xs font-orbitron font-bold text-blue-400 uppercase tracking-wider">
                  BET #2
                </span>
              </div>
            </div>
            <SingleBetPanel
              panelId={2}
              explorerUrl={explorerUrl}
              walletAddress={walletAddress}
              gameBalance={gameBalance}
              refreshBalance={refreshBalance}
              compact={true}
            />
          </div>
        </div>
      </div>

      {/* Global Error Display */}
      {error && (
        <div className="mx-2 sm:mx-5 mb-2 sm:mb-5 bg-red-900/20 border border-red-500/30 rounded-md p-2 flex items-start gap-1.5 animate-in slide-in-from-bottom-2 duration-200">
          <span className="text-xs mt-0.5">⚠️</span>
          <div className="text-red-300 text-[9px] sm:text-[10px] font-medium leading-relaxed font-inter">
            {error}
          </div>
        </div>
      )}
    </div>
  );
};
