"use client";

import Nav from "../layout/Nav";
import { GameProvider } from "@/context/GameContext";
import GameBoard from "@/components/game/GameBoard";
import BetControls from "@/components/game/BetControls";
import RoundInfo from "@/components/game/RoundInfo";
import HistoryBar from "@/components/game/HistoryBar";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import ChainWarning from "@/components/common/ChainWarning";

const GameScreen = () => {
  return (
    <GameProvider>
      <div className="min-h-screen text-white flex flex-col bg-[linear-gradient(90deg,#1a1a1a_50%,#262626_0%)] bg-size-[200px_100%] bg-repeat">
        <Nav />
        <ErrorBoundary>
          <div className="flex-1 relative">
            <div className="px-4 pt-4">
              <ChainWarning />
            </div>
            <RoundInfo />
            <GameBoard />
          </div>
        </ErrorBoundary>
        <HistoryBar />
        <BetControls />
      </div>
    </GameProvider>
  );
};

export default GameScreen;
