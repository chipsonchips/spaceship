"use client";

import React from "react";
import { useGameContext } from "@/context/GameContext";
import { GameHistory } from "@/types/game";

const HistoryBar: React.FC = () => {
  const { gameHistory } = useGameContext();

  return (
    <div className="bg-slate-900/80 backdrop-blur-md px-3 py-2 overflow-x-auto border-b border-slate-700/50 shadow-sm scrollbar-hide">
      <div className="flex gap-2 items-center">
        <div className="text-[10px] text-slate-500 font-orbitron uppercase tracking-widest mr-1 flex items-center gap-1 hidden sm:flex">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
          History
        </div>
        {gameHistory.map((game: GameHistory, idx: any) => (
          <div
            key={idx}
            className={`px-2 py-0.5 rounded-md text-xs font-bold whitespace-nowrap font-orbitron transition-all cursor-default ${
              game.crashMultiplier >= 2
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : game.crashMultiplier >= 1.5
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
            }`}
          >
            {Number(game.crashMultiplier).toFixed(2)}x
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryBar;
