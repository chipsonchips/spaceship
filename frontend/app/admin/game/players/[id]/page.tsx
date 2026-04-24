"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthUser } from "@/hooks/useAuthUser";
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
  const { isAdmin } = useAuthUser();
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
    if (!isAdmin()) return;
    loadData();
  }, [playerId, currentPage, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !playerData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/admin/game"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Players
          </Link>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-700">{error || "Player not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = playerData.statistics;
  const player = playerData.player;
  const netProfit = parseFloat(stats.netProfit);
  const isProfit = netProfit >= 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/game"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Players
          </Link>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {player.displayName || player.username || "Unknown Player"}
                </h1>
                <p className="text-gray-600 mt-2">
                  {player.address
                    ? `${player.address.slice(0, 10)}...${player.address.slice(-8)}`
                    : "No wallet connected"}
                </p>
                {player.email && (
                  <p className="text-gray-600">{player.email}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Status</p>
                <p
                  className={`text-lg font-semibold ${
                    player.isActive ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {player.isActive ? "Active" : "Inactive"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Bets</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.totalBets}
                </p>
              </div>
              <Target className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">
                  Total Wagered
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {parseFloat(stats.totalBetAmount).toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">
                  Total Payouts
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {parseFloat(stats.totalPayouts).toFixed(2)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </div>

          <div
            className={`bg-white rounded-lg shadow p-6 border-l-4 ${
              isProfit ? "border-green-500" : "border-red-500"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Net Profit</p>
                <p
                  className={`text-3xl font-bold mt-2 ${
                    isProfit ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {netProfit.toFixed(2)}
                </p>
              </div>
              {isProfit ? (
                <TrendingUp className="w-8 h-8 text-green-500 opacity-20" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-500 opacity-20" />
              )}
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Win Rate</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {stats.winRate}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Average Bet</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {parseFloat(stats.averageBet).toFixed(4)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">
              Successful Cashouts
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {stats.cashoutCount}
            </p>
          </div>
        </div>

        {/* Bet History */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Bet History</h2>
          </div>

          {bets.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600">No bets found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Round
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                        Bet Amount
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                        Multiplier
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                        Payout
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bets.map((bet) => (
                      <tr
                        key={bet.id}
                        className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          #{bet.roundId}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900">
                          {parseFloat(bet.amount).toFixed(4)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              bet.cashedOut
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {bet.cashedOut ? "Cashed Out" : "Lost"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900">
                          {bet.cashoutMultiplier
                            ? `${bet.cashoutMultiplier.toFixed(2)}x`
                            : "-"}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                          {bet.payout ? parseFloat(bet.payout).toFixed(4) : "0"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(bet.timestamp).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Page {currentPage + 1} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= totalPages - 1}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
