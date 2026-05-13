import Leaderboard from "@/components/common/Leaderboard";
import { GameProvider } from "@/context/GameContext";
import Nav from "@/components/layout/Nav";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LeaderboardPage() {
  return (
    <GameProvider>
      <div className="min-h-screen text-white flex flex-col bg-[#0B0F19] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/30 via-[#0B0F19] to-black relative">
        <Nav />
        <div className="flex-1 flex flex-col p-4 sm:p-6">
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
              <Link
                href="/"
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-slate-800/50 border border-green-500/30 hover:bg-green-500/10 hover:border-green-400/50 transition-colors text-xs sm:text-sm font-medium text-white"
              >
                <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden sm:inline">Back to Game</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2 font-orbitron uppercase tracking-widest">
              Leaderboard
            </h1>
            <div className="h-1 w-20 sm:w-24 bg-gradient-to-r from-green-500 to-emerald-600 rounded"></div>
          </div>
          <Leaderboard />
        </div>
      </div>
    </GameProvider>
  );
}
