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
    if (position === 1) return "bg-yellow-500/10 border-l-4 border-yellow-400";
    if (position === 2) return "bg-gray-400/10 border-l-4 border-gray-300";
    if (position === 3) return "bg-orange-500/10 border-l-4 border-orange-400";
    return "bg-slate-800/20 border-l-4 border-green-500/30";
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
          <div className="px-4 py-8 text-center text-gray-400 font-courier text-sm bg-black/50 backdrop-blur-sm border border-green-500/30 rounded-lg">
            No leaderboard data yet. Start playing to appear here!
          </div>
        ) : (
          <>
            {leaderboard.map((entry: any, idx: number) => (
              <div
                key={entry.address}
                className={`px-4 py-4 rounded-lg backdrop-blur-sm border transition-all ${getRowStyle(idx + 1)}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {getMedalIcon(idx + 1) || (
                        <span className="text-lg font-bold text-gray-400 w-8 text-center font-orbitron">
                          #{idx + 1}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs text-gray-400 font-courier truncate">
                        {getDisplayName(entry)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-green-400 font-orbitron">
                      +{entry.totalWon}
                    </div>
                    <div className="text-xs text-gray-500 font-courier">
                      USDC
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="px-4 py-3 text-xs text-gray-400 font-courier text-center bg-black/30 rounded-lg border border-green-500/20">
              Total Players: {leaderboard.length}
            </div>
          </>
        )}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden sm:block bg-black/50 backdrop-blur-sm border border-green-500/30 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-600/20 border-b border-green-500/30 px-6 py-4">
          <div className="flex items-center justify-between text-sm font-semibold text-green-400 font-orbitron uppercase tracking-wider">
            <span>Rank</span>
            <span>Player</span>
            <span>Total Won</span>
          </div>
        </div>

        {/* Leaderboard Entries */}
        <div className="divide-y divide-green-500/20">
          {leaderboard.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 font-courier">
              No leaderboard data yet. Start playing to appear here!
            </div>
          ) : (
            leaderboard.map((entry: any, idx: number) => (
              <div
                key={entry.address}
                className={`px-6 py-4 transition-colors hover:bg-green-500/5 ${getRowStyle(idx + 1)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-3 w-20">
                      {getMedalIcon(idx + 1) || (
                        <span className="text-lg font-bold text-gray-400 w-6 text-center font-orbitron">
                          #{idx + 1}
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-sm text-gray-300 font-courier">
                      {getDisplayName(entry)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-400 font-orbitron">
                      +{entry.totalWon}
                    </div>
                    <div className="text-xs text-gray-500 font-courier">
                      USDC
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="bg-black/30 border-t border-green-500/30 px-6 py-3 text-xs text-gray-400 font-courier">
          <span>Total Players: {leaderboard.length}</span>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
