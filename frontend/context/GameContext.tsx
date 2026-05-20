"use client";

import React, { createContext, useContext, ReactNode } from "react";
import useGame from "@/hooks/useGame";
import { useMultiplierAnimation } from "@/hooks/game";
import { GameContextType } from "@/types";

export type GameContextValue = GameContextType & {
  displayMultiplier: number;
};

const GameContext = createContext<GameContextValue | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const game = useGame();
  const displayMultiplier = useMultiplierAnimation(game.roundData);

  return (
    <GameContext.Provider value={{ ...game, displayMultiplier }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = (): GameContextValue => {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error("useGameContext must be used within GameProvider");
  }
  return ctx;
};
