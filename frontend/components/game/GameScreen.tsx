"use client";

import Nav from "../layout/Nav";
import { GameProvider } from "@/context/GameContext";
import GameBoard from "@/components/game/GameBoard";
import UnifiedBetControls from "@/components/game/UnifiedBetControls";
import RoundInfo from "@/components/game/RoundInfo";
import HistoryBar from "@/components/game/HistoryBar";
import ParticleEffect from "@/components/game/ParticleEffect";
import PotentialPayout from "@/components/game/PotentialPayout";
import SessionStats from "@/components/game/SessionStats";
import PlayerActivityFeed from "@/components/game/PlayerActivityFeed";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import ChainWarning from "@/components/common/ChainWarning";

const GameScreen = () => {
  return (
    <GameProvider>
      <div className="min-h-screen text-white flex flex-col bg-[#0B0F19] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/30 via-[#0B0F19] to-black relative">
        <Nav />
        <ErrorBoundary>
          <div className="flex-1 relative">
            <div className="px-4 pt-4">
              <ChainWarning />
            </div>
            <RoundInfo />
            <SessionStats />
            <GameBoard />
            <ParticleEffect trigger={false} x={0} y={0} />
            <PotentialPayout />
            <PlayerActivityFeed />
          </div>
        </ErrorBoundary>
        <HistoryBar />
        <UnifiedBetControls />
      </div>
    </GameProvider>
  );
};

export default GameScreen;
