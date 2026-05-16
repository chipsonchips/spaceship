"use client";

import React, { useEffect, useState } from "react";
import { useGameContext } from "@/context/GameContext";
import { useSettings } from "@/context/SettingsContext";

interface ActivityEvent {
  id: string;
  type: "cashout" | "crash";
  address: string;
  multiplier: number;
  amount: number;
  timestamp: number;
}

const PlayerActivityFeed: React.FC = () => {
  const { roundData } = useGameContext();
  const { settings } = useSettings();
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const prevPlayersRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    if (
      !settings.activityFeedEnabled ||
      !roundData ||
      roundData.phase !== "CRASHED"
    )
      return;

    const newActivities: ActivityEvent[] = [];

    roundData.players.forEach((player) => {
      const playerKey = `${roundData.roundId}-${player.address}`;

      if (!prevPlayersRef.current.has(playerKey)) {
        if (player.cashedOut && player.payout) {
          newActivities.push({
            id: `${playerKey}-cashout`,
            type: "cashout",
            address: player.address,
            multiplier: player.cashoutMultiplier || 1,
            amount: player.payout,
            timestamp: Date.now(),
          });
        } else if (
          roundData.crashMultiplier &&
          player.amount &&
          !player.cashedOut
        ) {
          newActivities.push({
            id: `${playerKey}-crash`,
            type: "crash",
            address: player.address,
            multiplier: roundData.crashMultiplier,
            amount: player.amount,
            timestamp: Date.now(),
          });
        }
        prevPlayersRef.current.add(playerKey);
      }
    });

    if (newActivities.length > 0) {
      setActivities((prev) => [...newActivities, ...prev].slice(0, 5));
    }
  }, [settings.activityFeedEnabled, roundData]);

  useEffect(() => {
    if (activities.length === 0) return;

    const timer = setTimeout(() => {
      setActivities((prev) => prev.slice(1));
    }, 5000);

    return () => clearTimeout(timer);
  }, [activities]);

  useEffect(() => {
    if (roundData?.phase !== "CRASHED") {
      prevPlayersRef.current.clear();
    }
  }, [roundData?.phase]);

  if (!settings.activityFeedEnabled || activities.length === 0) return null;

  const activity = activities[0];
  const shortAddress = `${activity.address.slice(0, 6)}...${activity.address.slice(-4)}`;

  return (
    <div className="fixed bottom-40 left-4 sm:left-6 z-40 pointer-events-none">
      <div
        className={`animate-in fade-in slide-in-from-left-4 duration-300 bg-slate-900/60 backdrop-blur-md border rounded-lg p-3 sm:p-4 shadow-lg min-w-[200px] sm:min-w-[240px] ${
          activity.type === "cashout"
            ? "border-emerald-500/40"
            : "border-red-500/40"
        }`}
      >
        <div className="text-[10px] sm:text-xs font-bold font-orbitron uppercase tracking-widest mb-1">
          {activity.type === "cashout" ? "💰 Cashout" : "💥 Crashed"}
        </div>
        <div className="text-xs sm:text-sm font-courier text-slate-300 mb-1">
          {shortAddress}
        </div>
        <div
          className={`text-sm sm:text-base font-black font-orbitron ${
            activity.type === "cashout" ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {Number(activity.multiplier).toFixed(2)}x
        </div>
      </div>
    </div>
  );
};

export default PlayerActivityFeed;
