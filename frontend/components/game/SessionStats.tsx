"use client";

import React, { useEffect, useState } from "react";
import { useSettings } from "@/context/SettingsContext";
import useUSDC from "@/hooks/useUSDC";
import * as api from "@/lib/api";

interface SessionStat {
  wins: number;
  losses: number;
  totalProfit: number;
}

interface UserBetHistoryItem {
  id: number;
  roundId: number | null;
  amount: number;
  cashedOut: boolean;
  cashoutMultiplier: number | null;
  payout: number | null;
  crashMultiplier: number | null;
  timestamp: number;
  txHash: string | null;
  status: string;
}

const SessionStats: React.FC = () => {
  const { settings } = useSettings();
  const { walletAddress } = useUSDC();
  const [stats, setStats] = useState<SessionStat>({
    wins: 0,
    losses: 0,
    totalProfit: 0,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!settings.sessionStatsEnabled || !walletAddress) {
      setStats({ wins: 0, losses: 0, totalProfit: 0 });
      return;
    }

    const fetchBetHistory = async () => {
      try {
        // Fetch all player bets (using high limit to get session data)
        const { bets } = await api.fetchMyBetHistory(500, 0);

        if (!bets || bets.length === 0) {
          setStats({ wins: 0, losses: 0, totalProfit: 0 });
          return;
        }

        let wins = 0;
        let losses = 0;
        let totalProfit = 0;

        bets.forEach((bet: UserBetHistoryItem) => {
          // Win: bet was cashed out with positive payout
          if (bet.cashedOut && (bet.payout ?? 0) > 0) {
            wins++;
            totalProfit += (bet.payout ?? 0) - bet.amount;
          } else {
            // Loss: either didn't cash out or cashed out with no profit
            losses++;
            totalProfit -= bet.amount;
          }
        });

        setStats({ wins, losses, totalProfit });
      } catch (err) {
        console.error("Failed to fetch bet history for session stats:", err);
        setStats({ wins: 0, losses: 0, totalProfit: 0 });
      }
    };

    fetchBetHistory();
  }, [settings.sessionStatsEnabled, walletAddress]);

  if (!mounted || !settings.sessionStatsEnabled) {
    return null;
  }

  const totalRounds = stats.wins + stats.losses;
  const winRate =
    totalRounds > 0 ? ((stats.wins / totalRounds) * 100).toFixed(1) : "0.0";

  return (
    <div className="fixed top-40 left-2 sm:top-24 sm:left-4 z-30 pointer-events-none">
      <div className="bg-slate-900/40 backdrop-blur-md px-3 py-2.5 rounded-lg border border-slate-700/50 shadow-sm space-y-2">
        <div className="text-[9px] sm:text-[10px] text-slate-400 font-bold leading-tight font-orbitron uppercase tracking-widest">
          Session Stats
        </div>

        <div className="grid grid-cols-2 gap-2 text-[9px] sm:text-[10px] font-orbitron">
          <div className="flex items-center gap-1">
            <span className="text-emerald-400 font-bold">{stats.wins}</span>
            <span className="text-slate-500">Wins</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-red-400 font-bold">{stats.losses}</span>
            <span className="text-slate-500">Losses</span>
          </div>
        </div>

        <div className="pt-1 border-t border-slate-700/50">
          <div className="text-[9px] text-slate-500 font-courier">
            Win Rate: {winRate}%
          </div>
          <div className="text-[9px] text-slate-500 font-courier">
            Rounds: {totalRounds}
          </div>
          {stats.totalProfit !== 0 && (
            <div
              className={`text-[9px] font-courier font-bold ${
                stats.totalProfit > 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              P/L: {stats.totalProfit > 0 ? "+" : ""}
              {stats.totalProfit.toFixed(2)} USDC
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionStats;
