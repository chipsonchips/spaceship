"use client";

import React, { createContext, useContext, ReactNode } from "react";
import useGame from "@/hooks/useGame";
import { RoundData, GameHistory, LeaderboardEntry } from "@/types/game";

interface GameContextType {
  roundData: RoundData | null;
  gameHistory: GameHistory[];
  leaderboard: LeaderboardEntry[];
  isConnected: boolean;
  error: string | null;
  placeBet: (
    address: string,
    amount: number,
    useFreeBet?: boolean,
  ) => Promise<{ success: boolean; error?: string; txHash?: string }>;
  cashOut: (betId: number) => Promise<{ success: boolean; error?: string }>;
  reconnect: () => void;
  disconnect: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const game = useGame();
  return (
    <GameContext.Provider value={game as GameContextType}>
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = (): GameContextType => {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error("useGameContext must be used within GameProvider");
  }
  return ctx;
};
