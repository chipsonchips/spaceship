"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Shield,
  Ticket,
  X,
  TrendingUp,
  TrendingDown,
  Clock,
} from "lucide-react";
import { useAccount } from "wagmi";
import { fetchMyBetHistory } from "@/lib/api/game";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { BetHistoryFilter, UserBetHistoryItem } from "@/types/game";
import useChainInfo from "@/hooks/useChainInfo";
import FairnessVerifier from "./FairnessVerifier";

interface BetHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FILTERS: { id: BetHistoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
];

function formatBetTime(ts: number) {
  const d = new Date(ts);
  return {
    time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    date: d.toLocaleDateString([], {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }),
  };
}

function getRelativeTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function filterBets(bets: UserBetHistoryItem[], filter: BetHistoryFilter) {
  if (filter === "won")
    return bets.filter((b) => b.cashedOut && (b.payout ?? 0) > 0);
  if (filter === "lost")
    return bets.filter((b) => !b.cashedOut || (b.payout ?? 0) <= 0);
  return bets;
}

const BetHistoryModal: React.FC<BetHistoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isConnected } = useAccount();
  const { explorerUrl } = useChainInfo();
  const [mounted, setMounted] = useState(false);
  const [bets, setBets] = useState<UserBetHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<BetHistoryFilter>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [verifyRoundId, setVerifyRoundId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadBets = useCallback(async (pageIndex: number) => {
    setLoading(true);
    setError(null);
    try {
      const { bets: data, pages } = await fetchMyBetHistory(50, pageIndex * 50);
      setBets(data);
      setTotalPages(pages);
      setPage(pageIndex);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load bet history"));
      setBets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && isConnected) {
      setExpandedId(null);
      setVerifyRoundId(null);
      setFilter("all");
      loadBets(0);
    }
  }, [isOpen, isConnected, loadBets]);

  const visibleBets = useMemo(() => filterBets(bets, filter), [bets, filter]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bet-history-title"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[85vh] flex flex-col bg-[#0B0F19] border border-slate-700/60 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-[slideUp_0.25s_ease-out]">
        {/* Header */}
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-700/50 bg-slate-900/80">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2
              id="bet-history-title"
              className="text-base sm:text-lg font-black font-orbitron text-white uppercase tracking-widest"
            >
              Bet <span className="text-emerald-400">History</span>
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors touch-manipulation"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex rounded-lg bg-slate-800/80 p-0.5 border border-slate-700/50">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`flex-1 py-2 text-xs font-bold font-orbitron uppercase tracking-wider rounded-md transition-all touch-manipulation ${
                  filter === f.id
                    ? "bg-slate-600/90 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Summary */}
        {!loading && !error && bets.length > 0 && (
          <div className="shrink-0 grid grid-cols-3 gap-2 px-4 py-3 bg-gradient-to-br from-slate-900/80 to-slate-950/80 border-b border-slate-800/50">
            <div className="text-center">
              <p className="text-[10px] text-slate-500 font-orbitron uppercase tracking-wider mb-1">
                Total Bets
              </p>
              <p className="text-lg font-black text-white font-courier">
                {visibleBets.length}
              </p>
            </div>
            <div className="text-center border-x border-slate-800/50">
              <p className="text-[10px] text-slate-500 font-orbitron uppercase tracking-wider mb-1">
                Won
              </p>
              <p className="text-lg font-black text-emerald-400 font-courier">
                {
                  visibleBets.filter((b) => b.cashedOut && (b.payout ?? 0) > 0)
                    .length
                }
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-slate-500 font-orbitron uppercase tracking-wider mb-1">
                Lost
              </p>
              <p className="text-lg font-black text-red-400 font-courier">
                {
                  visibleBets.filter(
                    (b) => !b.cashedOut || (b.payout ?? 0) <= 0,
                  ).length
                }
              </p>
            </div>
          </div>
        )}

        {/* Column headers */}
        <div className="shrink-0 grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto] gap-2 px-4 py-2.5 text-[10px] sm:text-xs font-orbitron uppercase tracking-wider text-slate-500 border-b border-slate-800/80 bg-slate-950/50">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Time
          </span>
          <span className="text-right">Stake</span>
          <span className="text-right">Result</span>
          <span className="w-[72px] text-center" />
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar">
          {!isConnected ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
                <Ticket className="w-8 h-8 text-slate-600" />
              </div>
              <div className="text-center">
                <p className="text-slate-400 text-sm font-medium mb-1">
                  Wallet Not Connected
                </p>
                <p className="text-slate-600 text-xs">
                  Connect your wallet to view your bet history
                </p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                <div className="absolute inset-0 w-10 h-10 rounded-full bg-emerald-500/20 animate-ping" />
              </div>
              <p className="text-slate-500 text-sm font-orbitron tracking-wide">
                Loading your bets...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-8 gap-4">
              <div className="w-16 h-16 rounded-full bg-red-950/50 border border-red-500/30 flex items-center justify-center">
                <X className="w-8 h-8 text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-red-400 text-sm font-medium mb-1">
                  Failed to Load
                </p>
                <p className="text-slate-500 text-xs mb-4">{error}</p>
                <button
                  type="button"
                  onClick={() => loadBets(page)}
                  className="px-4 py-2 text-sm font-orbitron uppercase tracking-wide text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/10 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : visibleBets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
                <Ticket className="w-8 h-8 text-slate-600" />
              </div>
              <div className="text-center">
                <p className="text-slate-400 text-sm font-medium mb-1">
                  No Bets Found
                </p>
                <p className="text-slate-600 text-xs">
                  {filter === "all"
                    ? "Place your first bet to see it here"
                    : `No ${filter} bets in your history`}
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-slate-800/50">
              {visibleBets.map((bet, index) => {
                const { time, date } = formatBetTime(bet.timestamp);
                const relativeTime = getRelativeTime(bet.timestamp);
                const isWin = bet.cashedOut && (bet.payout ?? 0) > 0;
                const isExpanded = expandedId === bet.id;
                const showVerify = verifyRoundId === bet.roundId;
                const profit = isWin
                  ? (bet.payout ?? 0) - bet.amount
                  : -bet.amount;
                const profitPercent = ((profit / bet.amount) * 100).toFixed(0);

                return (
                  <li
                    key={bet.id}
                    className={`transition-all duration-200 ${
                      isExpanded
                        ? "bg-slate-900/60"
                        : "bg-slate-900/30 hover:bg-slate-900/50"
                    }`}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto] gap-2 items-center px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white font-courier">
                          {time}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {relativeTime}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white font-courier tabular-nums">
                          {bet.amount.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-slate-500">USDC</p>
                      </div>
                      <div className="text-right min-w-0">
                        {isWin ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="inline-flex items-center justify-end gap-1 text-sm font-bold text-emerald-400 font-courier tabular-nums">
                              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                              {(bet.payout ?? 0).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-emerald-500/80 font-courier">
                              +{profitPercent}%
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="inline-flex items-center justify-end gap-1 text-sm font-bold text-red-400 font-courier">
                              <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                              Lost
                            </span>
                            <span className="text-[10px] text-red-500/80 font-courier">
                              -100%
                            </span>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : bet.id)
                        }
                        className={`flex items-center justify-center gap-0.5 w-[72px] py-1.5 rounded-md text-white text-[10px] sm:text-xs font-bold font-orbitron uppercase tracking-wide transition-all touch-manipulation ${
                          isExpanded
                            ? "bg-slate-700 hover:bg-slate-600"
                            : "bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                        }`}
                      >
                        {isExpanded ? "Hide" : "View"}
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* Profit/Loss Banner */}
                        <div
                          className={`rounded-lg p-3 border ${
                            isWin
                              ? "bg-gradient-to-r from-emerald-950/50 to-emerald-900/30 border-emerald-500/30"
                              : "bg-gradient-to-r from-red-950/50 to-red-900/30 border-red-500/30"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-slate-400 font-orbitron uppercase tracking-wider mb-1">
                                {isWin ? "Profit" : "Loss"}
                              </p>
                              <p
                                className={`text-2xl font-black font-courier ${
                                  isWin ? "text-emerald-400" : "text-red-400"
                                }`}
                              >
                                {isWin ? "+" : ""}
                                {profit.toFixed(2)} USDC
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-slate-400 font-orbitron uppercase tracking-wider mb-1">
                                Multiplier
                              </p>
                              <p
                                className={`text-2xl font-black font-courier ${
                                  isWin ? "text-amber-400" : "text-slate-500"
                                }`}
                              >
                                {bet.cashedOut && bet.cashoutMultiplier != null
                                  ? `${bet.cashoutMultiplier.toFixed(2)}x`
                                  : "—"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl bg-slate-950/80 border border-slate-700/50 p-3 space-y-3">
                          {/* Crash Point */}
                          <div className="flex items-center justify-between p-2 rounded-lg bg-violet-950/30 border border-violet-500/20">
                            <span className="text-xs text-slate-400 font-orbitron uppercase">
                              Crash Point
                            </span>
                            <span className="px-2.5 py-1 rounded-md bg-violet-950/80 border border-violet-500/40 text-sm font-black text-violet-200 font-courier">
                              {bet.crashMultiplier != null
                                ? `${bet.crashMultiplier.toFixed(2)}x`
                                : "—"}
                            </span>
                          </div>

                          {/* Details Grid */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800/50">
                              <p className="text-[10px] text-slate-500 font-orbitron uppercase tracking-wider mb-1">
                                Round ID
                              </p>
                              <p className="text-sm font-bold text-white font-courier">
                                #{bet.roundId ?? "—"}
                              </p>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800/50">
                              <p className="text-[10px] text-slate-500 font-orbitron uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Ticket className="w-3 h-3 text-amber-500" />
                                Bet ID
                              </p>
                              {bet.txHash ? (
                                <a
                                  href={`${explorerUrl}/tx/${bet.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-bold text-amber-400 hover:text-amber-300 underline font-courier transition-colors"
                                >
                                  #{bet.id}
                                </a>
                              ) : (
                                <p className="text-sm font-bold text-amber-400 font-courier">
                                  #{bet.id}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Timestamp */}
                          <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800/50">
                            <p className="text-[10px] text-slate-500 font-orbitron uppercase tracking-wider mb-1">
                              Timestamp
                            </p>
                            <p className="text-xs text-slate-300 font-courier">
                              {date} at {time}
                            </p>
                          </div>

                          {/* Fairness Button */}
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                            <button
                              type="button"
                              onClick={() =>
                                setVerifyRoundId(
                                  showVerify ? null : (bet.roundId ?? null),
                                )
                              }
                              disabled={bet.roundId == null}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-orbitron uppercase tracking-wider hover:bg-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all touch-manipulation"
                            >
                              <Shield className="w-4 h-4" />
                              {showVerify ? "Hide" : "Verify"} Fairness
                            </button>
                          </div>
                        </div>

                        {showVerify && bet.roundId != null && (
                          <div className="rounded-xl border border-emerald-500/30 bg-slate-900/80 p-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <FairnessVerifier initialRoundId={bet.roundId} />
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Pagination + close */}
        {isConnected && !loading && !error && totalPages > 1 && (
          <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-2 border-t border-slate-800/80 bg-slate-950/50">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => loadBets(page - 1)}
              className="px-3 py-1.5 text-xs text-slate-300 border border-slate-700 rounded-lg disabled:opacity-40 touch-manipulation"
            >
              Prev
            </button>
            <span className="text-xs text-slate-500 font-courier">
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => loadBets(page + 1)}
              className="px-3 py-1.5 text-xs text-emerald-400 border border-emerald-500/30 rounded-lg disabled:opacity-40 touch-manipulation"
            >
              Next
            </button>
          </div>
        )}

        <div className="shrink-0 flex justify-center py-3 sm:hidden bg-slate-950/80 border-t border-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg touch-manipulation"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default BetHistoryModal;
