"use client";

import React, { createContext, useContext, ReactNode } from "react";
import useGame from "@/hooks/useGame";
import {
  RoundData,
  GameHistory,
  LeaderboardEntry,
  GameContextType,
} from "@/types";

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
