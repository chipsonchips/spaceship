"use client";

import { useAdminAuth } from "@/context/AdminAuthContext";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Lock,
  Unlock,
  Pause,
  Play,
  DollarSign,
  Gift,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
} from "lucide-react";
import {
  getAdminPlayers,
  getUserRestrictions,
  blockPlayer,
  unblockPlayer,
  suspendPlayer,
  unsuspendPlayer,
  setDailyBetLimit,
  setWeeklyBetLimit,
  setMonthlyBetLimit,
  removeBetLimits,
  assignFreeBets,
} from "@/lib/api-auth";

interface Player {
  id: string;
  address?: string;
  username?: string;
  displayName?: string;
  isActive: boolean;
  isBlocked: boolean;
  isSuspended: boolean;
  createdAt: string;
}

interface UserRestrictions {
  isBlocked: boolean;
  blockedAt?: string;
  blockReason?: string;
  isSuspended: boolean;
  suspendedAt?: string;
  suspensionExpiresAt?: string;
  suspensionReason?: string;
  dailyBetLimit?: number;
  weeklyBetLimit?: number;
  monthlyBetLimit?: number;
  dailyBetAmount: number;
  weeklyBetAmount: number;
  monthlyBetAmount: number;
}

export default function PlayerManagementPage() {
  const { isAuthenticated } = useAdminAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [restrictions, setRestrictions] = useState<UserRestrictions | null>(
    null,
  );
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<
    "block" | "suspend" | "limits" | "freebets"
  >("block");

  // Form states
  const [blockReason, setBlockReason] = useState("");
  const [suspensionDays, setSuspensionDays] = useState("7");
  const [suspensionReason, setSuspensionReason] = useState("");
  const [dailyLimit, setDailyLimit] = useState("");
  const [weeklyLimit, setWeeklyLimit] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [freeBetCount, setFreeBetCount] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminPlayers(50, 0, searchQuery || undefined);
      setPlayers(data.players || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load players");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPlayers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectPlayer = async (player: Player) => {
    try {
      setSelectedPlayer(player);
      const data = await getUserRestrictions(player.id);
      setRestrictions(data.restrictions);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load restrictions",
      );
    }
  };

  const handleBlockPlayer = async () => {
    if (!selectedPlayer || !blockReason.trim()) return;
    try {
      setActionLoading(true);
      await blockPlayer(selectedPlayer.id, blockReason);
      setBlockReason("");
      setShowModal(false);
      await handleSelectPlayer(selectedPlayer);
      await loadPlayers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to block player");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockPlayer = async () => {
    if (!selectedPlayer) return;
    try {
      setActionLoading(true);
      await unblockPlayer(selectedPlayer.id);
      setShowModal(false);
      await handleSelectPlayer(selectedPlayer);
      await loadPlayers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unblock player");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspendPlayer = async () => {
    if (!selectedPlayer || !suspensionReason.trim() || !suspensionDays) return;
    try {
      setActionLoading(true);
      await suspendPlayer(
        selectedPlayer.id,
        parseInt(suspensionDays),
        suspensionReason,
      );
      setSuspensionDays("7");
      setSuspensionReason("");
      setShowModal(false);
      await handleSelectPlayer(selectedPlayer);
      await loadPlayers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to suspend player");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsuspendPlayer = async () => {
    if (!selectedPlayer) return;
    try {
      setActionLoading(true);
      await unsuspendPlayer(selectedPlayer.id);
      setShowModal(false);
      await handleSelectPlayer(selectedPlayer);
      await loadPlayers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to unsuspend player",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetLimits = async () => {
    if (!selectedPlayer) return;
    try {
      setActionLoading(true);
      if (dailyLimit)
        await setDailyBetLimit(selectedPlayer.id, parseFloat(dailyLimit));
      if (weeklyLimit)
        await setWeeklyBetLimit(selectedPlayer.id, parseFloat(weeklyLimit));
      if (monthlyLimit)
        await setMonthlyBetLimit(selectedPlayer.id, parseFloat(monthlyLimit));
      setDailyLimit("");
      setWeeklyLimit("");
      setMonthlyLimit("");
      setShowModal(false);
      await handleSelectPlayer(selectedPlayer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set limits");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveLimits = async () => {
    if (!selectedPlayer) return;
    try {
      setActionLoading(true);
      await removeBetLimits(selectedPlayer.id);
      setShowModal(false);
      await handleSelectPlayer(selectedPlayer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove limits");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignFreeBets = async () => {
    if (!selectedPlayer || !freeBetCount) return;
    try {
      setActionLoading(true);
      await assignFreeBets(selectedPlayer.id, parseInt(freeBetCount));
      setFreeBetCount("");
      setShowModal(false);
      await handleSelectPlayer(selectedPlayer);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to assign free bets",
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-3 text-sm touch-manipulation"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          Back to Users
        </Link>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">
          Player Management
        </h1>
        <p className="text-slate-400 text-sm">
          Manage player accounts, restrictions, and limits
        </p>
      </div>

      <div>
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-300 hover:text-red-200 text-sm mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700">
                <h2 className="text-2xl font-bold text-white mb-4">Players</h2>
                <div className="relative">
                  <Search className="absolute left-4 top-3 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search by username or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  />
                </div>
              </div>

              {loading ? (
                <div className="p-6 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading players...
                </div>
              ) : players.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  No players found
                </div>
              ) : (
                <div className="divide-y divide-slate-700 max-h-96 overflow-y-auto">
                  {players.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => handleSelectPlayer(player)}
                      className={`w-full px-6 py-4 text-left hover:bg-slate-800/30 transition-colors ${
                        selectedPlayer?.id === player.id
                          ? "bg-slate-800/50 border-l-2 border-green-500"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">
                            {player.displayName || player.username || "Unknown"}
                          </p>
                          <p className="text-sm text-slate-400">
                            {player.address?.slice(0, 10)}...
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {player.isBlocked && (
                            <Lock className="w-4 h-4 text-red-400" />
                          )}
                          {player.isSuspended && (
                            <Pause className="w-4 h-4 text-yellow-400" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="order-1 lg:order-2">
            {selectedPlayer && restrictions ? (
              <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {selectedPlayer.displayName || selectedPlayer.username}
                  </h3>
                  <p className="text-sm text-slate-400 break-all">
                    {selectedPlayer.address}
                  </p>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-300">
                    Status
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Active:</span>
                      <span
                        className={
                          selectedPlayer.isActive
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {selectedPlayer.isActive ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Blocked:</span>
                      <span
                        className={
                          restrictions.isBlocked
                            ? "text-red-400"
                            : "text-green-400"
                        }
                      >
                        {restrictions.isBlocked ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Suspended:</span>
                      <span
                        className={
                          restrictions.isSuspended
                            ? "text-yellow-400"
                            : "text-green-400"
                        }
                      >
                        {restrictions.isSuspended ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Betting Limits */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-300">
                    Betting Limits
                  </h4>
                  <div className="space-y-1 text-sm">
                    {restrictions.dailyBetLimit && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Daily:</span>
                        <span className="text-white">
                          ${restrictions.dailyBetLimit}
                        </span>
                      </div>
                    )}
                    {restrictions.weeklyBetLimit && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Weekly:</span>
                        <span className="text-white">
                          ${restrictions.weeklyBetLimit}
                        </span>
                      </div>
                    )}
                    {restrictions.monthlyBetLimit && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Monthly:</span>
                        <span className="text-white">
                          ${restrictions.monthlyBetLimit}
                        </span>
                      </div>
                    )}
                    {!restrictions.dailyBetLimit &&
                      !restrictions.weeklyBetLimit &&
                      !restrictions.monthlyBetLimit && (
                        <p className="text-slate-500 text-xs">No limits set</p>
                      )}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-4 border-t border-slate-700">
                  {!restrictions.isBlocked ? (
                    <button
                      onClick={() => {
                        setModalMode("block");
                        setShowModal(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Lock className="w-4 h-4" />
                      Block Player
                    </button>
                  ) : (
                    <button
                      onClick={handleUnblockPlayer}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      <Unlock className="w-4 h-4" />
                      Unblock Player
                    </button>
                  )}

                  {!restrictions.isSuspended ? (
                    <button
                      onClick={() => {
                        setModalMode("suspend");
                        setShowModal(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Pause className="w-4 h-4" />
                      Suspend Player
                    </button>
                  ) : (
                    <button
                      onClick={handleUnsuspendPlayer}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      <Play className="w-4 h-4" />
                      Unsuspend Player
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setModalMode("limits");
                      setShowModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    <DollarSign className="w-4 h-4" />
                    Set Bet Limits
                  </button>

                  <button
                    onClick={() => {
                      setModalMode("freebets");
                      setShowModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Gift className="w-4 h-4" />
                    Assign Free Bets
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6 text-center text-slate-400">
                Select a player to view details
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedPlayer && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">
                {modalMode === "block" && "Block Player"}
                {modalMode === "suspend" && "Suspend Player"}
                {modalMode === "limits" && "Set Betting Limits"}
                {modalMode === "freebets" && "Assign Free Bets"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalMode === "block" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Reason for blocking
                  </label>
                  <textarea
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                    placeholder="Enter reason..."
                    rows={3}
                  />
                </div>
                <button
                  onClick={handleBlockPlayer}
                  disabled={actionLoading || !blockReason.trim()}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {actionLoading ? "Blocking..." : "Block Player"}
                </button>
              </div>
            )}

            {modalMode === "suspend" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Duration (days)
                  </label>
                  <input
                    type="number"
                    value={suspensionDays}
                    onChange={(e) => setSuspensionDays(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Reason for suspension
                  </label>
                  <textarea
                    value={suspensionReason}
                    onChange={(e) => setSuspensionReason(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
                    placeholder="Enter reason..."
                    rows={3}
                  />
                </div>
                <button
                  onClick={handleSuspendPlayer}
                  disabled={actionLoading || !suspensionReason.trim()}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-700 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {actionLoading ? "Suspending..." : "Suspend Player"}
                </button>
              </div>
            )}

            {modalMode === "limits" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Daily Limit (USDC)
                  </label>
                  <input
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Leave empty to skip"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Weekly Limit (USDC)
                  </label>
                  <input
                    type="number"
                    value={weeklyLimit}
                    onChange={(e) => setWeeklyLimit(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Leave empty to skip"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Monthly Limit (USDC)
                  </label>
                  <input
                    type="number"
                    value={monthlyLimit}
                    onChange={(e) => setMonthlyLimit(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Leave empty to skip"
                    step="0.01"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSetLimits}
                    disabled={
                      actionLoading ||
                      (!dailyLimit && !weeklyLimit && !monthlyLimit)
                    }
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? "Setting..." : "Set Limits"}
                  </button>
                  <button
                    onClick={handleRemoveLimits}
                    disabled={actionLoading}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Remove All
                  </button>
                </div>
              </div>
            )}

            {modalMode === "freebets" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Number of Free Bets
                  </label>
                  <input
                    type="number"
                    value={freeBetCount}
                    onChange={(e) => setFreeBetCount(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    placeholder="Enter number..."
                    min="1"
                  />
                </div>
                <button
                  onClick={handleAssignFreeBets}
                  disabled={actionLoading || !freeBetCount}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {actionLoading ? "Assigning..." : "Assign Free Bets"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
