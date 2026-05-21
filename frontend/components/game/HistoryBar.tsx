"use client";

import React, { useState } from "react";
import { ScrollText } from "lucide-react";
import { useGameContext } from "@/context/GameContext";
import { GameHistory } from "@/types/game";
import BetHistoryModal from "./BetHistoryModal";

const HistoryBar: React.FC = () => {
  const { gameHistory } = useGameContext();
  const [isBetHistoryOpen, setIsBetHistoryOpen] = useState(false);

  return (
    <>
      <div className="bg-slate-900/80 backdrop-blur-md border-t border-slate-700/50 shadow-sm flex items-stretch min-h-[40px]">
        <div className="flex-1 min-w-0 flex items-center px-3 py-2 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 items-center">
            <div className="text-[10px] text-slate-500 font-orbitron uppercase tracking-widest mr-1 flex items-center gap-1.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
              <span className="hidden sm:inline">Recent</span>
            </div>
            {gameHistory.map((game: GameHistory, idx: number) => (
              <div
                key={`${game.roundId}-${idx}`}
                className={`px-2 py-0.5 rounded-md text-xs font-bold whitespace-nowrap font-orbitron shrink-0 ${
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

        <button
          type="button"
          onClick={() => setIsBetHistoryOpen(true)}
          className="shrink-0 flex items-center justify-center w-11 sm:w-12 border-l border-slate-700/50 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors touch-manipulation"
          aria-label="My bet history"
          title="My bet history"
        >
          <ScrollText className="w-5 h-5" />
        </button>
      </div>

      <BetHistoryModal
        isOpen={isBetHistoryOpen}
        onClose={() => setIsBetHistoryOpen(false)}
      />
    </>
  );
};

export default HistoryBar;
