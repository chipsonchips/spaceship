"use client";

import React, { useEffect, useState } from "react";
import { useGameContext } from "@/context/GameContext";
import { useSettings } from "@/context/SettingsContext";
import useUSDC from "@/hooks/useUSDC";

interface SessionStat {
  wins: number;
  losses: number;
  totalProfit: number;
}

const SessionStats: React.FC = () => {
  const { gameHistory } = useGameContext();
  const { settings } = useSettings();
  const { walletAddress } = useUSDC();
  const [stats, setStats] = useState<SessionStat>({
    wins: 0,
    losses: 0,
    totalProfit: 0,
  });

  useEffect(() => {
    if (
      !settings.sessionStatsEnabled ||
      !gameHistory ||
      !walletAddress ||
      gameHistory.length === 0
    ) {
      setStats({ wins: 0, losses: 0, totalProfit: 0 });
      return;
    }

    let wins = 0;
    let losses = 0;
    const totalProfit = 0;

    gameHistory.forEach((game) => {
      if (game.winnersCount > 0) {
        wins++;
      } else {
        losses++;
      }
    });

    setStats({ wins, losses, totalProfit });
  }, [settings.sessionStatsEnabled, gameHistory, walletAddress]);

  if (!settings.sessionStatsEnabled) {
    return null;
  }

  const totalRounds = stats.wins + stats.losses;
  const winRate =
    totalRounds > 0 ? ((stats.wins / totalRounds) * 100).toFixed(1) : "0.0";

  return (
    <div className="fixed top-20 left-2 sm:top-24 sm:left-4 z-30 pointer-events-none">
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
        </div>
      </div>
    </div>
  );
};

export default SessionStats;
