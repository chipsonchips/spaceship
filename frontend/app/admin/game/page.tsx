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
  X,
  Calendar,
  Award,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Settings,
} from "lucide-react";
import { getPlayerDetails, getPlayerBets } from "@/lib/api-auth";

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
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Check if user has admin secret stored (from contract management dashboard)
  const hasAdminSecret =
    typeof window !== "undefined" && !!localStorage.getItem("adminSecret");
  const isAuthorized = isAdmin() || hasAdminSecret;

  const loadData = async () => {
    if (!isAuthorized) return;

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Game Administration
              </h1>
              <p className="text-slate-400">
                Monitor players and game activity
              </p>
            </div>
            <Link
              href="/admin/game/settings"
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            >
              <Settings className="w-4 h-4" />
              Game Settings
            </Link>
          </div>
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
                          <button
                            onClick={() => {
                              setSelectedPlayerId(player.id);
                              setIsModalOpen(true);
                            }}
                            className="text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors"
                          >
                            View Details
                          </button>
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

      <PlayerDetailsModal
        userId={selectedPlayerId}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPlayerId(null);
        }}
      />
    </div>
  );
}

interface PlayerDetailsModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

function PlayerDetailsModal({
  userId,
  isOpen,
  onClose,
}: PlayerDetailsModalProps) {
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [recentBets, setRecentBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadPlayerDetails();
    } else {
      // Reset state when closed
      setPlayerInfo(null);
      setStatistics(null);
      setRecentBets([]);
    }
  }, [isOpen, userId]);

  const loadPlayerDetails = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const data = await getPlayerDetails(userId);
      setPlayerInfo(data.player);
      setStatistics(data.statistics);
      setRecentBets(data.recentBets || []);
    } catch (err) {
      console.error("Failed to load player details:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-700/50 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Player Details</h2>
              <p className="text-slate-400 text-sm">
                Comprehensive player activity and stats
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-slate-400 font-medium">
                Fetching player data...
              </p>
            </div>
          ) : !playerInfo ? (
            <div className="text-center py-20">
              <p className="text-slate-400">
                Failed to load player information
              </p>
            </div>
          ) : (
            <>
              {/* Profile Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                  <div className="flex flex-col space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">
                          {playerInfo.displayName ||
                            playerInfo.username ||
                            "Anonymous Player"}
                        </h3>
                        <p className="text-blue-400 font-mono text-sm break-all">
                          {playerInfo.address}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${playerInfo.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                      >
                        {playerInfo.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <div>
                          <p className="text-xs text-slate-500 uppercase font-semibold">
                            Joined
                          </p>
                          <p className="text-sm text-slate-300">
                            {new Date(
                              playerInfo.createdAt,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Activity className="w-4 h-4 text-slate-500" />
                        <div>
                          <p className="text-xs text-slate-500 uppercase font-semibold">
                            Last Active
                          </p>
                          <p className="text-sm text-slate-300">
                            {playerInfo.lastLoginAt
                              ? new Date(
                                  playerInfo.lastLoginAt,
                                ).toLocaleDateString()
                              : "Never"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20 rounded-2xl p-6 flex flex-col justify-center">
                  <p className="text-slate-400 text-sm font-medium mb-1">
                    Net Profit
                  </p>
                  <div className="flex items-end gap-2">
                    <h4
                      className={`text-3xl font-black ${Number(statistics.netProfit) >= 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {Number(statistics.netProfit) >= 0 ? "+" : ""}
                      {parseFloat(statistics.netProfit).toFixed(2)}
                    </h4>
                    <span className="text-slate-400 text-sm mb-1 uppercase font-bold">
                      USDC
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Overall house return from this player
                  </p>
                </div>
              </div>

              {/* Statistics Grid */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" />
                  Performance Statistics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      label: "Total Bets",
                      value: statistics.totalBets,
                      icon: <Activity className="w-4 h-4 text-blue-400" />,
                    },
                    {
                      label: "Win Rate",
                      value: statistics.winRate,
                      icon: <TrendingUp className="w-4 h-4 text-green-400" />,
                    },
                    {
                      label: "Total Wagered",
                      value: `$${parseFloat(statistics.totalBetAmount).toFixed(2)}`,
                      icon: <DollarSign className="w-4 h-4 text-orange-400" />,
                    },
                    {
                      label: "Avg Bet",
                      value: `$${parseFloat(statistics.averageBet).toFixed(2)}`,
                      icon: <TrendingUp className="w-4 h-4 text-purple-400" />,
                    },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {stat.icon}
                        <p className="text-xs text-slate-500 font-bold uppercase">
                          {stat.label}
                        </p>
                      </div>
                      <p className="text-xl font-bold text-white">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Bets Table */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-500" />
                  Recent Activity
                </h3>
                <div className="bg-slate-800/20 border border-slate-700/50 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-800/50 text-slate-400 border-b border-slate-700/50">
                        <th className="px-4 py-3 text-left font-semibold">
                          Round
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Multiplier
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Payout
                        </th>
                        <th className="px-4 py-3 text-center font-semibold">
                          TX
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {recentBets.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-10 text-center text-slate-500 italic"
                          >
                            No recent bets found
                          </td>
                        </tr>
                      ) : (
                        recentBets.map((bet) => (
                          <tr
                            key={bet.id}
                            className="hover:bg-slate-700/20 transition-colors"
                          >
                            <td className="px-4 py-4 text-slate-300 font-mono text-xs">
                              #{bet.id}
                            </td>
                            <td className="px-4 py-4 text-right text-white font-medium">
                              ${parseFloat(bet.amount).toFixed(2)}
                            </td>
                            <td className="px-4 py-4 text-right">
                              {bet.cashedOut ? (
                                <div className="flex items-center justify-end gap-1 text-green-400 font-bold">
                                  <ArrowUpRight className="w-3 h-3" />
                                  {parseFloat(bet.cashoutMultiplier).toFixed(2)}
                                  x
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1 text-red-400/70">
                                  <ArrowDownRight className="w-3 h-3" />
                                  0.00x
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right font-bold">
                              <span
                                className={
                                  Number(bet.payout) > 0
                                    ? "text-green-400"
                                    : "text-slate-500"
                                }
                              >
                                ${parseFloat(bet.payout || "0").toFixed(2)}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              {bet.txHash ? (
                                <a
                                  href={`https://basescan.org/tx/${bet.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center p-1 bg-blue-500/10 rounded"
                                >
                                  <span className="mr-1 text-xs font-mono">
                                    #{bet.id}
                                  </span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-slate-400 font-mono text-xs">
                                  #{bet.id}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
