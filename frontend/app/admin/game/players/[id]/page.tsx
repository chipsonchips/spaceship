"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { getPlayerDetails, getPlayerBets } from "@/lib/api-auth";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
} from "lucide-react";

interface PlayerData {
  player: {
    id: string;
    address: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    email: string;
    isActive: boolean;
    createdAt: string;
    lastLoginAt: number;
    lastActivityAt: number;
  };
  statistics: {
    totalBets: number;
    totalBetAmount: string;
    totalPayouts: string;
    netProfit: string;
    cashoutCount: number;
    winRate: string;
    averageBet: string;
  };
  recentBets: any[];
}

interface Bet {
  id: number;
  roundId: number;
  amount: string;
  cashedOut: boolean;
  cashoutMultiplier: number;
  payout: string;
  timestamp: number;
  txHash: string;
  createdAt: string;
}

export default function PlayerDetailsPage() {
  const { isAuthenticated } = useAdminAuth();
  const params = useParams();
  const router = useRouter();
  const playerId = params.id as string;

  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [detailsData, betsData] = await Promise.all([
        getPlayerDetails(playerId),
        getPlayerBets(playerId, 50, currentPage * 50),
      ]);

      setPlayerData(detailsData);
      setBets(betsData.bets || []);
      setTotalPages(betsData.pagination?.pages || 0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load player data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    loadData();
  }, [playerId, currentPage, isAuthenticated]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error || !playerData) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/game"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm touch-manipulation"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Players
        </Link>
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-400">{error || "Player not found"}</p>
        </div>
      </div>
    );
  }

  const stats = playerData.statistics;
  const player = playerData.player;
  const netProfit = parseFloat(stats.netProfit);
  const isProfit = netProfit >= 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <Link
        href="/admin/game"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm touch-manipulation"
      >
        <ArrowLeft className="w-4 h-4 shrink-0" />
        Back to Players
      </Link>

      <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
              {player.displayName || player.username || "Unknown Player"}
            </h1>
            <p className="text-slate-400 mt-1 text-sm font-mono break-all">
              {player.address || "No wallet connected"}
            </p>
            {player.email && (
              <p className="text-slate-500 text-sm mt-1 truncate">{player.email}</p>
            )}
          </div>
          <div className="shrink-0">
            <p className="text-xs text-slate-500 uppercase">Status</p>
            <p
              className={`text-base font-semibold ${
                player.isActive ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {player.isActive ? "Active" : "Inactive"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total Bets", value: stats.totalBets, icon: Target, color: "blue" },
          { label: "Wagered", value: parseFloat(stats.totalBetAmount).toFixed(2), icon: DollarSign, color: "orange" },
          { label: "Payouts", value: parseFloat(stats.totalPayouts).toFixed(2), icon: TrendingUp, color: "purple" },
          { label: "Net Profit", value: netProfit.toFixed(2), icon: isProfit ? TrendingUp : TrendingDown, color: isProfit ? "green" : "red" },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 col-span-1 even:col-span-1 last:col-span-2 lg:last:col-span-1"
          >
            <p className="text-slate-400 text-xs font-medium">{item.label}</p>
            <p className={`text-xl sm:text-2xl font-bold mt-1 ${item.color === "green" ? "text-emerald-400" : item.color === "red" ? "text-red-400" : "text-white"}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Win Rate", value: stats.winRate },
          { label: "Average Bet", value: parseFloat(stats.averageBet).toFixed(4) },
          { label: "Cashouts", value: stats.cashoutCount },
        ].map((s) => (
          <div key={s.label} className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <p className="text-slate-400 text-xs">{s.label}</p>
            <p className="text-lg font-bold text-white mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">Bet History</h2>
        </div>

        {bets.length === 0 ? (
          <p className="p-8 text-center text-slate-400 text-sm">No bets found</p>
        ) : (
          <>
            <div className="md:hidden divide-y divide-slate-700">
              {bets.map((bet) => (
                <div key={bet.id} className="p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium text-sm">Round #{bet.roundId}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        bet.cashedOut
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {bet.cashedOut ? "Won" : "Lost"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs">Bet</p>
                      <p className="text-white">{parseFloat(bet.amount).toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 text-xs">Mult.</p>
                      <p className="text-white">
                        {bet.cashoutMultiplier ? `${bet.cashoutMultiplier.toFixed(2)}x` : "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-500 text-xs">Payout</p>
                      <p className="text-white">{bet.payout ? parseFloat(bet.payout).toFixed(2) : "0"}</p>
                    </div>
                  </div>
                  <p className="text-slate-500 text-xs">
                    {new Date(bet.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-slate-800/50 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm text-slate-300">Round</th>
                    <th className="px-4 py-3 text-right text-sm text-slate-300">Bet</th>
                    <th className="px-4 py-3 text-center text-sm text-slate-300">Status</th>
                    <th className="px-4 py-3 text-right text-sm text-slate-300">Mult.</th>
                    <th className="px-4 py-3 text-right text-sm text-slate-300">Payout</th>
                    <th className="px-4 py-3 text-left text-sm text-slate-300">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {bets.map((bet) => (
                    <tr key={bet.id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-sm text-white">#{bet.roundId}</td>
                      <td className="px-4 py-3 text-right text-sm text-white">
                        {parseFloat(bet.amount).toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            bet.cashedOut
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {bet.cashedOut ? "Cashed Out" : "Lost"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-white">
                        {bet.cashoutMultiplier ? `${bet.cashoutMultiplier.toFixed(2)}x` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-white">
                        {bet.payout ? parseFloat(bet.payout).toFixed(4) : "0"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {new Date(bet.timestamp).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 sm:px-6 py-4 border-t border-slate-700 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-400 text-center sm:text-left">
                Page {currentPage + 1} of {totalPages || 1}
              </p>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="flex-1 sm:flex-none px-4 py-2.5 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-50 touch-manipulation"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 touch-manipulation"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
