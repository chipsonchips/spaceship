"use client";

import React from "react";
import { useGameContext } from "@/context/GameContext";
import { Trophy, Medal } from "lucide-react";

const Leaderboard: React.FC = () => {
  const { leaderboard } = useGameContext();

  React.useEffect(() => {
    console.log("Leaderboard data:", leaderboard);
  }, [leaderboard]);

  const getMedalIcon = (position: number) => {
    if (position === 1) return <Trophy className="text-yellow-400" size={20} />;
    if (position === 2) return <Medal className="text-gray-300" size={20} />;
    if (position === 3) return <Medal className="text-orange-400" size={20} />;
    return null;
  };

  const getRowStyle = (position: number) => {
    if (position === 1) return "bg-gradient-to-r from-amber-500/10 to-transparent border-l-4 border-amber-400 hover:from-amber-500/20";
    if (position === 2) return "bg-gradient-to-r from-slate-400/10 to-transparent border-l-4 border-slate-300 hover:from-slate-400/20";
    if (position === 3) return "bg-gradient-to-r from-orange-600/10 to-transparent border-l-4 border-orange-500 hover:from-orange-600/20";
    return "bg-slate-800/10 border-l-4 border-emerald-500/30 hover:bg-slate-800/30";
  };

  const getDisplayName = (entry: any) => {
    return (
      entry.username ||
      `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Mobile Card Layout */}
      <div className="sm:hidden space-y-3">
        {leaderboard.length === 0 ? (
          <div className="px-5 py-8 text-center text-slate-400 font-orbitron text-sm bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-lg">
            No leaderboard data yet. Start playing to appear here!
          </div>
        ) : (
          <>
            {leaderboard.map((entry: any, idx: number) => (
              <div
                key={entry.address}
                className={`px-4 py-4 rounded-xl backdrop-blur-md border border-slate-700/50 shadow-md transition-all ${getRowStyle(idx + 1)}`}
              >
                <div className="flex items-center justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 drop-shadow-[0_0_5px_currentColor]">
                      {getMedalIcon(idx + 1) || (
                        <span className="text-lg font-bold text-slate-500 w-8 text-center font-orbitron">
                          #{idx + 1}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-emerald-100 font-orbitron truncate tracking-wider">
                        {getDisplayName(entry)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[10px] text-slate-500 font-orbitron uppercase tracking-wider mb-0.5">
                      Won
                    </div>
                    <div className="flex items-end gap-1">
                      <div className="text-base font-black text-emerald-400 font-orbitron drop-shadow-[0_0_5px_rgba(16,185,129,0.3)]">
                        +{entry.totalWon}
                      </div>
                      <div className="text-[10px] text-emerald-500/70 font-courier mb-0.5">
                        USDC
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="px-4 py-3 text-xs text-emerald-500 font-orbitron uppercase tracking-widest text-center bg-slate-900/60 rounded-xl border border-slate-700/50 backdrop-blur-md">
              Total Players: <span className="font-bold text-emerald-400">{leaderboard.length}</span>
            </div>
          </>
        )}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden sm:block bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900/40 via-slate-800/80 to-slate-800/80 border-b border-slate-700/60 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-500/80 font-orbitron uppercase tracking-widest">
            <span className="w-20 pl-2">Rank</span>
            <span className="flex-1">Player</span>
            <span className="text-right pr-2">Total Won</span>
          </div>
        </div>

        {/* Leaderboard Entries */}
        <div className="divide-y divide-slate-700/50 bg-slate-900/30">
          {leaderboard.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400 font-orbitron tracking-wider">
              No leaderboard data yet. Start playing to appear here!
            </div>
          ) : (
            leaderboard.map((entry: any, idx: number) => (
              <div
                key={entry.address}
                className={`px-6 py-4 transition-all duration-300 ${getRowStyle(idx + 1)}`}
              >
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-3 w-20 drop-shadow-[0_0_5px_currentColor] pl-2">
                      {getMedalIcon(idx + 1) || (
                        <span className="text-lg font-bold text-slate-500 w-6 text-center font-orbitron">
                          #{idx + 1}
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-emerald-100 font-orbitron tracking-wider">
                      {getDisplayName(entry)}
                    </div>
                  </div>
                  <div className="text-right pr-2 flex items-center justify-end gap-2">
                    <span className="text-xl font-black text-emerald-400 font-orbitron drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                      +{entry.totalWon}
                    </span>
                    <span className="text-xs font-bold text-emerald-500/60 font-courier mt-1">
                      USDC
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-900/90 border-t border-slate-700/60 px-6 py-3.5 text-xs text-emerald-500/80 font-orbitron uppercase tracking-widest shadow-inner">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span>
            Total Players: <span className="font-black text-emerald-400 ml-1">{leaderboard.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
