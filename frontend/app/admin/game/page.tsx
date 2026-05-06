"use client";

import { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getAdminPlayers, getGameStatistics } from "@/lib/api-auth";
import Link from "next/link";
import {
  Search,
  Users,
  TrendingUp,
  DollarSign,
  Loader2,
  ArrowLeft,
} from "lucide-react";

interface Player {
  id: string;
  address: string;
  username: string;
  displayName: string;
  totalBets: number;
  totalBetAmount: string;
  totalPayouts: string;
  cashoutCount: number;
  createdAt: string;
}

interface GameStats {
  totalRounds: number;
  settledRounds: number;
  totalBets: number;
  totalPlayers: number;
  totalBetAmount: string;
  totalPayouts: string;
  houseProfit: string;
  averageCrashMultiplier: string;
}

export default function GameAdminPage() {
  const { isAdmin, user } = useAuthUser();
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Check if user has admin secret stored (from contract management dashboard)
  const hasAdminSecret =
    typeof window !== "undefined" && !!localStorage.getItem("adminSecret");
  const isAuthorized = isAdmin() || hasAdminSecret;

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [playersData, statsData] = await Promise.all([
        getAdminPlayers(50, currentPage * 50, search),
        getGameStatistics(),
      ]);

      setPlayers(playersData.players || []);
      setStats(statsData.statistics || null);
      setTotalPages(playersData.pagination?.pages || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthorized) return;
    loadData();
  }, [currentPage, search, isAuthorized]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(0);
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-400 mb-2">
              Access Denied
            </h1>
            <p className="text-red-300">
              You need admin privileges to access this page. Please log in as an
              admin user or access from the admin dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">
            Game Administration
          </h1>
          <p className="text-slate-400">Monitor players and game activity</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">
                    Total Rounds
                  </p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {stats.totalRounds}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500 opacity-20" />
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">
                    Total Players
                  </p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {stats.totalPlayers}
                  </p>
                </div>
                <Users className="w-8 h-8 text-purple-500 opacity-20" />
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">
                    Total Bets
                  </p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {stats.totalBets}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-orange-500 opacity-20" />
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">
                    House Profit
                  </p>
                  <p className="text-3xl font-bold text-green-400 mt-2">
                    {parseFloat(stats.houseProfit).toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500 opacity-20" />
              </div>
            </div>
          </div>
        )}

        {/* Players List */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Players</h2>

            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by username or address..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-700 bg-slate-800/50 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
            </form>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading players...</p>
            </div>
          ) : players.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No players found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/50 border-b border-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                        Player
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                        Address
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-slate-300">
                        Total Bets
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-slate-300">
                        Bet Amount
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-slate-300">
                        Payouts
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-slate-300">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((player) => (
                      <tr
                        key={player.id}
                        className="border-b border-slate-700 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-white">
                              {player.displayName ||
                                player.username ||
                                "Unknown"}
                            </p>
                            <p className="text-sm text-slate-400">
                              {player.username}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400 font-mono">
                          {player.address
                            ? `${player.address.slice(0, 6)}...${player.address.slice(-4)}`
                            : "N/A"}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-white font-medium">
                          {player.totalBets}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-slate-300">
                          {parseFloat(player.totalBetAmount).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-slate-300">
                          {parseFloat(player.totalPayouts).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Link
                            href={`/admin/game/players/${player.id}`}
                            className="text-blue-400 hover:text-blue-300 font-medium text-sm"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Page {currentPage + 1} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 0}
                    className="px-4 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={handleNextPage}
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
