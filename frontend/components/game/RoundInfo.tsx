"use client";

import React from "react";
import { useGameContext } from "@/context/GameContext";
import { useRoundCountdown } from "@/hooks/useGame";

const RoundInfo: React.FC = () => {
  const { roundData } = useGameContext();
  const countdown = useRoundCountdown(roundData);

  // Use the countdown for BETTING and CRASHED phases
  const timeRemaining =
    roundData?.phase === "BETTING" || roundData?.phase === "CRASHED"
      ? countdown
      : 0;

  const getPhaseText = () => {
    if (!roundData) return "LOADING";
    switch (roundData.phase) {
      case "BETTING":
        return "PLACE YOUR BETS";
      case "FLYING":
        return "FLYING";
      case "CRASHED":
        return "CRASHED";
      default:
        return "LOADING";
    }
  };

  const getPhaseColor = () => {
    switch (roundData?.phase) {
      case "BETTING":
        return "text-green-400";
      case "FLYING":
        return "text-blue-400";
      case "CRASHED":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="absolute top-2 left-2 sm:top-4 sm:right-4 sm:left-auto sm:-top-0 bg-slate-900/40 backdrop-blur-md px-2.5 py-2 rounded-lg border border-slate-700/50 shadow-sm min-w-[120px] max-w-[45vw] sm:max-w-[200px] z-30 transition-all hover:bg-slate-900/60 pointer-events-none">
      <div className="text-[9px] sm:text-[10px] text-slate-400 font-bold leading-tight font-orbitron flex items-center justify-between">
        <span>R#{roundData?.roundId || 0}</span>
        {roundData?.phase === "FLYING" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
      </div>
      <div
        className={`text-[10px] sm:text-xs font-black ${getPhaseColor().replace('green-', 'emerald-')} mt-0.5 mb-1.5 leading-tight font-orbitron uppercase tracking-widest`}
      >
        {getPhaseText()}
      </div>

      {(roundData?.phase === "BETTING" || roundData?.phase === "CRASHED") && (
        <div className="mb-1.5">
          <div className="flex items-center gap-1.5">
            <div
              className={`text-[10px] sm:text-xs font-bold font-courier ${
                timeRemaining <= 3
                  ? "text-orange-400 animate-pulse"
                  : "text-emerald-400"
              }`}
            >
              {timeRemaining}s
            </div>
            <div className="flex-1 bg-slate-900 rounded-full h-1 min-w-[20px] overflow-hidden border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${
                  timeRemaining <= 3 ? "bg-orange-500" : "bg-emerald-500"
                }`}
                style={{
                  width: `${Math.min(
                    (timeRemaining /
                      (roundData.phase === "CRASHED"
                      ? 5
                        : roundData.flyStartTime && roundData.startTime
                          ? Math.ceil(
                              (Number(roundData.flyStartTime) -
                                Number(roundData.startTime)) /
                                1000,
                            )
                          : 30)) *
                      100,
                    100,
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="text-[9px] sm:text-[10px] text-slate-400 space-y-0.5 leading-tight font-orbitron">
        <div className="flex justify-between items-center">
          <span className="uppercase font-medium">Players</span>
          <span className="font-bold text-emerald-100">{roundData?.players?.length || 0}</span>
        </div>
        <div className="flex justify-between items-center truncate">
          <span className="uppercase font-medium">Bets</span>
          <span className="font-bold text-emerald-400 ml-1">
            {roundData?.totalBets ? Number(roundData.totalBets).toFixed(2) : "0"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RoundInfo;
