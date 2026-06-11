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
  const [activeTab, setActiveTab] = useState<1 | 2>(1);

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

      {/* Mobile: Tab Switcher (< lg screens) */}
      <div className="lg:hidden px-2 sm:px-5">
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setActiveTab(1)}
            className={`flex-1 py-2 px-3 rounded-lg font-orbitron font-bold text-xs transition-all ${
              activeTab === 1
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-800"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  activeTab === 1 ? "bg-white animate-pulse" : "bg-emerald-500"
                }`}
              ></span>
              BET #1
            </div>
          </button>
          <button
            onClick={() => setActiveTab(2)}
            className={`flex-1 py-2 px-3 rounded-lg font-orbitron font-bold text-xs transition-all ${
              activeTab === 2
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-800"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  activeTab === 2 ? "bg-white animate-pulse" : "bg-blue-500"
                }`}
              ></span>
              BET #2
            </div>
          </button>
        </div>
      </div>

      {/* Desktop: Side-by-Side Grid (≥ lg screens) */}
      {/* Mobile: Single Panel with Tabs (< lg screens) */}
      <div className="p-2 sm:px-5 sm:pb-5 pt-0">
        {/* Desktop View */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-4">
          {/* Bet Panel 1 */}
          <div className="bg-slate-800/40 border-2 border-emerald-700/50 rounded-xl p-4 hover:border-emerald-600/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-orbitron font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50"></span>
                BET #1
              </div>
            </div>
            <SingleBetPanel
              panelId={1}
              explorerUrl={explorerUrl}
              walletAddress={walletAddress}
              gameBalance={gameBalance}
              refreshBalance={refreshBalance}
            />
          </div>

          {/* Bet Panel 2 */}
          <div className="bg-slate-800/40 border-2 border-blue-700/50 rounded-xl p-4 hover:border-blue-600/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-orbitron font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-lg shadow-blue-500/50"></span>
                BET #2
              </div>
            </div>
            <SingleBetPanel
              panelId={2}
              explorerUrl={explorerUrl}
              walletAddress={walletAddress}
              gameBalance={gameBalance}
              refreshBalance={refreshBalance}
            />
          </div>
        </div>

        {/* Mobile View - Tabbed */}
        <div className="lg:hidden">
          {activeTab === 1 && (
            <div className="bg-slate-800/40 border-2 border-emerald-700/50 rounded-xl p-3 sm:p-4 animate-in fade-in duration-200">
              <SingleBetPanel
                panelId={1}
                explorerUrl={explorerUrl}
                walletAddress={walletAddress}
                gameBalance={gameBalance}
                refreshBalance={refreshBalance}
              />
            </div>
          )}
          {activeTab === 2 && (
            <div className="bg-slate-800/40 border-2 border-blue-700/50 rounded-xl p-3 sm:p-4 animate-in fade-in duration-200">
              <SingleBetPanel
                panelId={2}
                explorerUrl={explorerUrl}
                walletAddress={walletAddress}
                gameBalance={gameBalance}
                refreshBalance={refreshBalance}
              />
            </div>
          )}
        </div>
      </div>

      {/* Global Error Display */}
      {error && (
        <div className="mx-2 sm:mx-5 mb-2 sm:mb-5 bg-red-900/20 border border-red-500/30 rounded-md p-2.5 flex items-start gap-2 animate-in slide-in-from-bottom-2 duration-200">
          <span className="text-sm mt-0.5">⚠️</span>
          <div className="text-red-300 text-[10px] font-medium leading-relaxed font-inter">
            {error}
          </div>
        </div>
      )}

      {/* Mobile Swipe Indicator */}
      <div className="lg:hidden px-2 pb-2 sm:px-5 sm:pb-3">
        <div className="text-center text-[9px] text-slate-500 font-courier flex items-center justify-center gap-2">
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16l-4-4m0 0l4-4m-4 4h18"
            />
          </svg>
          Tap tabs to switch between bets
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
