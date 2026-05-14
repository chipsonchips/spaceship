"use client";

import { useAdminAuth } from "@/context/AdminAuthContext";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getAllAdmins,
  createAdmin,
  updateUserRole,
  deactivateUser,
  activateUser,
  getAuditLogs,
  getAdminPlayers,
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
import { User, UserRole } from "@/types/user";
import {
  ArrowLeft,
  Users,
  Plus,
  AlertCircle,
  Loader2,
  Search,
  Lock,
  Unlock,
  X,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  DollarSign,
  Gift,
} from "lucide-react";

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

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  pages: number;
}

export default function UserManagementPage() {
  const {
    isAuthenticated,
    adminSecret,
    isLoading: authLoading,
  } = useAdminAuth();
  const [admins, setAdmins] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"admins" | "logs" | "players">(
    "admins",
  );
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [playerActionLoading, setPlayerActionLoading] = useState(false);

  // Pagination states
  const [adminPage, setAdminPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [playerPage, setPlayerPage] = useState(1);
  const [adminPagination, setAdminPagination] = useState<PaginationInfo>({
    total: 0,
    limit: 10,
    offset: 0,
    pages: 0,
  });
  const [logPagination, setLogPagination] = useState<PaginationInfo>({
    total: 0,
    limit: 20,
    offset: 0,
    pages: 0,
  });
  const [playerPagination, setPlayerPagination] = useState<PaginationInfo>({
    total: 0,
    limit: 10,
    offset: 0,
    pages: 0,
  });

  // Modal states
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [playerModalMode, setPlayerModalMode] = useState<
    "block" | "suspend" | "limits" | "freebets"
  >("block");
  const [blockReason, setBlockReason] = useState("");
  const [suspensionDays, setSuspensionDays] = useState("7");
  const [suspensionReason, setSuspensionReason] = useState("");
  const [dailyLimit, setDailyLimit] = useState("");
  const [weeklyLimit, setWeeklyLimit] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [freeBetCount, setFreeBetCount] = useState("");

  // Form state for creating admin
  const [newAdminForm, setNewAdminForm] = useState({
    username: "",
    email: "",
    address: "",
    permissions: [] as string[],
  });

  useEffect(() => {
    // Only load data after auth is initialized and user is authenticated
    if (!authLoading && isAuthenticated) {
      loadAdmins(1);
      loadAuditLogs(1);
      loadPlayers(1);
    }
  }, [isAuthenticated, authLoading]);

  const loadAdmins = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      const offset = (page - 1) * adminPagination.limit;
      const data = await getAllAdmins();
      setAdmins(data.users || []);
      setAdminPagination({
        total: data.users?.length || 0,
        limit: adminPagination.limit,
        offset,
        pages: Math.ceil((data.users?.length || 0) / adminPagination.limit),
      });
      setAdminPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async (page: number = 1) => {
    try {
      const offset = (page - 1) * logPagination.limit;
      const data = await getAuditLogs(logPagination.limit, offset);
      setAuditLogs(data.logs || []);
      setLogPagination({
        total: data.pagination?.total || 0,
        limit: logPagination.limit,
        offset,
        pages: data.pagination?.pages || 0,
      });
      setLogPage(page);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    }
  };

  const loadPlayers = async (page: number = 1) => {
    try {
      const offset = (page - 1) * playerPagination.limit;
      const data = await getAdminPlayers(
        playerPagination.limit,
        offset,
        playerSearchQuery || undefined,
      );
      setPlayers(data.players || []);
      setPlayerPagination({
        total: data.pagination?.total || 0,
        limit: playerPagination.limit,
        offset,
        pages: data.pagination?.pages || 0,
      });
      setPlayerPage(page);
    } catch (err) {
      console.error("Failed to load players:", err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPlayers(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [playerSearchQuery]);

  const handleCreateAdmin = async () => {
    if (!newAdminForm.username.trim()) {
      setError("Username is required");
      return;
    }

    if (!newAdminForm.address.trim()) {
      setError(
        "Wallet Address is required. Admins authenticate using their Web3 wallet.",
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await createAdmin(
        newAdminForm.username,
        newAdminForm.address || undefined,
        newAdminForm.email || undefined,
        newAdminForm.permissions,
      );
      setNewAdminForm({
        username: "",
        email: "",
        address: "",
        permissions: [],
      });
      await loadAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create admin");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateAdmin = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      await deactivateUser(userId);
      await loadAdmins();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to deactivate admin",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleActivateAdmin = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      await activateUser(userId);
      await loadAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate admin");
    } finally {
      setLoading(false);
    }
  };

  const handleBlockPlayer = async (playerId: string) => {
    try {
      setPlayerActionLoading(true);
      await blockPlayer(playerId, "Blocked by admin");
      await loadPlayers();
      setSelectedPlayer(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to block player");
    } finally {
      setPlayerActionLoading(false);
    }
  };

  const handleUnblockPlayer = async (playerId: string) => {
    try {
      setPlayerActionLoading(true);
      await unblockPlayer(playerId);
      await loadPlayers(playerPage);
      setSelectedPlayer(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unblock player");
    } finally {
      setPlayerActionLoading(false);
    }
  };

  const handleSuspendPlayer = async () => {
    if (!selectedPlayer || !suspensionReason.trim() || !suspensionDays) return;
    try {
      setPlayerActionLoading(true);
      const daysToAdd = parseInt(suspensionDays, 10);
      await suspendPlayer(selectedPlayer.id, daysToAdd, suspensionReason);
      setSuspensionDays("7");
      setSuspensionReason("");
      setShowPlayerModal(false);
      await loadPlayers(playerPage);
      setSelectedPlayer(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to suspend player");
    } finally {
      setPlayerActionLoading(false);
    }
  };

  const handleUnsuspendPlayer = async () => {
    if (!selectedPlayer) return;
    try {
      setPlayerActionLoading(true);
      await unsuspendPlayer(selectedPlayer.id);
      setShowPlayerModal(false);
      await loadPlayers(playerPage);
      setSelectedPlayer(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to unsuspend player",
      );
    } finally {
      setPlayerActionLoading(false);
    }
  };

  const handleSetBetLimits = async () => {
    if (!selectedPlayer) return;
    try {
      setPlayerActionLoading(true);
      if (dailyLimit)
        await setDailyBetLimit(selectedPlayer.id, parseFloat(dailyLimit));
      if (weeklyLimit)
        await setWeeklyBetLimit(selectedPlayer.id, parseFloat(weeklyLimit));
      if (monthlyLimit)
        await setMonthlyBetLimit(selectedPlayer.id, parseFloat(monthlyLimit));
      setDailyLimit("");
      setWeeklyLimit("");
      setMonthlyLimit("");
      setShowPlayerModal(false);
      await loadPlayers(playerPage);
      setSelectedPlayer(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set bet limits");
    } finally {
      setPlayerActionLoading(false);
    }
  };

  const handleAssignFreeBets = async () => {
    if (!selectedPlayer || !freeBetCount) return;
    try {
      setPlayerActionLoading(true);
      await assignFreeBets(selectedPlayer.id, Number(freeBetCount));
      setFreeBetCount("");
      setShowPlayerModal(false);
      await loadPlayers(playerPage);
      setSelectedPlayer(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to assign free bets",
      );
    } finally {
      setPlayerActionLoading(false);
    }
  };

  const handleRemoveBetLimits = async () => {
    if (!selectedPlayer) return;
    try {
      setPlayerActionLoading(true);
      await removeBetLimits(selectedPlayer.id);
      setShowPlayerModal(false);
      await loadPlayers(playerPage);
      setSelectedPlayer(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove bet limits",
      );
    } finally {
      setPlayerActionLoading(false);
    }
  };

  const openPlayerModal = (mode: typeof playerModalMode) => {
    setPlayerModalMode(mode);
    setShowPlayerModal(true);
  };

  const closePlayerModal = () => {
    setShowPlayerModal(false);
    setBlockReason("");
    setSuspensionDays("7");
    setSuspensionReason("");
    setDailyLimit("");
    setWeeklyLimit("");
    setMonthlyLimit("");
    setFreeBetCount("");
  };

  return (
    <div className="space-y-8">
      {/* Show loading state while auth is initializing */}
      {authLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        </div>
      )}

      {!authLoading && (
        <>
          {/* Header */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                User Management
              </h1>
              <p className="text-slate-400">
                Manage admin users, players, and permissions
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
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

          {/* Tabs */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="flex border-b border-slate-700">
              {(["admins", "logs", "players"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-4 py-3 font-medium transition-colors ${
                    activeTab === tab
                      ? "bg-green-600/20 text-green-400 border-b-2 border-green-500"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === "admins" && (
                <div className="space-y-6">
                  {/* Create Admin Form */}
                  <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      Create New Admin
                    </h3>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Username"
                        value={newAdminForm.username}
                        onChange={(e) =>
                          setNewAdminForm({
                            ...newAdminForm,
                            username: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                      />
                      <input
                        type="email"
                        placeholder="Email (optional)"
                        value={newAdminForm.email}
                        onChange={(e) =>
                          setNewAdminForm({
                            ...newAdminForm,
                            email: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                      />
                      <input
                        type="text"
                        placeholder="Wallet Address (Required for Login)"
                        value={newAdminForm.address}
                        onChange={(e) =>
                          setNewAdminForm({
                            ...newAdminForm,
                            address: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                      />
                      <button
                        onClick={handleCreateAdmin}
                        disabled={
                          loading ||
                          !newAdminForm.username.trim() ||
                          !newAdminForm.address.trim()
                        }
                        className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {loading ? "Creating..." : "Create Admin"}
                      </button>
                    </div>
                  </div>

                  {/* Admins List */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">
                      Admin Users ({adminPagination.total})
                    </h3>
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                      </div>
                    ) : admins.length === 0 ? (
                      <p className="text-slate-400">No admin users found</p>
                    ) : (
                      <>
                        <div className="space-y-2 mb-4">
                          {admins.map((admin) => (
                            <div
                              key={admin.id}
                              className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700"
                            >
                              <div>
                                <p className="text-white font-medium">
                                  {admin.username}
                                </p>
                                <p className="text-slate-400 text-sm">
                                  {admin.email || "No email"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    admin.isActive
                                      ? "bg-green-600/20 text-green-400"
                                      : "bg-red-600/20 text-red-400"
                                  }`}
                                >
                                  {admin.isActive ? "Active" : "Inactive"}
                                </span>
                                {admin.isActive ? (
                                  <button
                                    onClick={() =>
                                      handleDeactivateAdmin(admin.id)
                                    }
                                    disabled={loading}
                                    className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition-colors disabled:opacity-50"
                                  >
                                    Deactivate
                                  </button>
                                ) : (
                                  <button
                                    onClick={() =>
                                      handleActivateAdmin(admin.id)
                                    }
                                    disabled={loading}
                                    className="px-3 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-sm transition-colors disabled:opacity-50"
                                  >
                                    Activate
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Admin Pagination */}
                        {adminPagination.pages > 1 && (
                          <div className="flex items-center justify-center gap-2 pt-4 border-t border-slate-700">
                            <button
                              onClick={() =>
                                loadAdmins(Math.max(1, adminPage - 1))
                              }
                              disabled={adminPage === 1}
                              className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 rounded-lg text-slate-300 transition-colors"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm text-slate-400">
                              Page {adminPage} of {adminPagination.pages}
                            </span>
                            <button
                              onClick={() =>
                                loadAdmins(
                                  Math.min(
                                    adminPagination.pages,
                                    adminPage + 1,
                                  ),
                                )
                              }
                              disabled={adminPage === adminPagination.pages}
                              className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 rounded-lg text-slate-300 transition-colors"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "logs" && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Audit Logs ({logPagination.total})
                  </h3>
                  {auditLogs.length === 0 ? (
                    <p className="text-slate-400">No audit logs found</p>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                        {auditLogs.map((log, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-slate-800/30 rounded-lg border border-slate-700"
                          >
                            <p className="text-white font-medium">
                              {log.action}
                            </p>
                            <p className="text-slate-400 text-sm">
                              {log.description}
                            </p>
                            <p className="text-slate-500 text-xs mt-1">
                              {new Date(log.timestamp).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                      {/* Log Pagination */}
                      {logPagination.pages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-4 border-t border-slate-700">
                          <button
                            onClick={() =>
                              loadAuditLogs(Math.max(1, logPage - 1))
                            }
                            disabled={logPage === 1}
                            className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 rounded-lg text-slate-300 transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-sm text-slate-400">
                            Page {logPage} of {logPagination.pages}
                          </span>
                          <button
                            onClick={() =>
                              loadAuditLogs(
                                Math.min(logPagination.pages, logPage + 1),
                              )
                            }
                            disabled={logPage === logPagination.pages}
                            className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 rounded-lg text-slate-300 transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === "players" && (
                <div className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search by username or address..."
                      value={playerSearchQuery}
                      onChange={(e) => setPlayerSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                    />
                  </div>

                  {/* Players List */}
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                    </div>
                  ) : players.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">
                      No players found
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                        {players.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                          >
                            <div className="flex-1">
                              <p className="text-white font-medium">
                                {player.username ||
                                  player.displayName ||
                                  "Unknown"}
                              </p>
                              <p className="text-slate-400 text-sm font-mono">
                                {player.address?.slice(0, 10)}...
                                {player.address?.slice(-8)}
                              </p>
                              <p className="text-slate-500 text-xs mt-1">
                                Joined{" "}
                                {new Date(
                                  player.createdAt,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col gap-1">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    player.isActive
                                      ? "bg-green-600/20 text-green-400"
                                      : "bg-red-600/20 text-red-400"
                                  }`}
                                >
                                  {player.isActive ? "Active" : "Inactive"}
                                </span>
                                {player.isBlocked && (
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-red-600/20 text-red-400">
                                    Blocked
                                  </span>
                                )}
                                {player.isSuspended && (
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-amber-600/20 text-amber-400">
                                    Suspended
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col gap-1">
                                {player.isBlocked ? (
                                  <button
                                    onClick={() => {
                                      setSelectedPlayer(player);
                                      handleUnblockPlayer(player.id);
                                    }}
                                    disabled={playerActionLoading}
                                    className="px-3 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
                                  >
                                    <Unlock className="w-4 h-4" />
                                    Unblock
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setSelectedPlayer(player);
                                      openPlayerModal("block");
                                    }}
                                    disabled={playerActionLoading}
                                    className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
                                  >
                                    <Lock className="w-4 h-4" />
                                    Block
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedPlayer(player);
                                    openPlayerModal("suspend");
                                  }}
                                  disabled={playerActionLoading}
                                  className="px-3 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
                                >
                                  <Pause className="w-4 h-4" />
                                  {player.isSuspended ? "Unsuspend" : "Suspend"}
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedPlayer(player);
                                    openPlayerModal("limits");
                                  }}
                                  disabled={playerActionLoading}
                                  className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
                                >
                                  <DollarSign className="w-4 h-4" />
                                  Limits
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedPlayer(player);
                                    openPlayerModal("freebets");
                                  }}
                                  disabled={playerActionLoading}
                                  className="px-3 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
                                >
                                  <Gift className="w-4 h-4" />
                                  Free Bets
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {playerPagination.pages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-4 border-t border-slate-700">
                          <button
                            onClick={() =>
                              loadPlayers(Math.max(1, playerPage - 1))
                            }
                            disabled={playerPage === 1}
                            className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 rounded-lg text-slate-300 transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-sm text-slate-400">
                            Page {playerPage} of {playerPagination.pages}
                          </span>
                          <button
                            onClick={() =>
                              loadPlayers(
                                Math.min(
                                  playerPagination.pages,
                                  playerPage + 1,
                                ),
                              )
                            }
                            disabled={playerPage === playerPagination.pages}
                            className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 rounded-lg text-slate-300 transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Player Actions Modal */}
            {showPlayerModal && selectedPlayer && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white font-orbitron">
                      {playerModalMode === "block" && "Block Player"}
                      {playerModalMode === "suspend" &&
                        selectedPlayer.isSuspended &&
                        "Unsuspend Player"}
                      {playerModalMode === "suspend" &&
                        !selectedPlayer.isSuspended &&
                        "Suspend Player"}
                      {playerModalMode === "limits" && "Set Bet Limits"}
                      {playerModalMode === "freebets" && "Assign Free Bets"}
                    </h2>
                    <button
                      onClick={closePlayerModal}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {playerModalMode === "block" && (
                      <>
                        <p className="text-slate-300 text-sm">
                          Player:{" "}
                          <span className="font-mono text-white">
                            {selectedPlayer.username}
                          </span>
                        </p>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Block Reason
                          </label>
                          <textarea
                            value={blockReason}
                            onChange={(e) => setBlockReason(e.target.value)}
                            placeholder="Enter reason for blocking..."
                            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500 text-sm"
                            rows={3}
                          />
                        </div>
                        <button
                          onClick={() => {
                            handleBlockPlayer(selectedPlayer.id);
                          }}
                          disabled={playerActionLoading || !blockReason.trim()}
                          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                          {playerActionLoading ? "Blocking..." : "Block Player"}
                        </button>
                      </>
                    )}

                    {playerModalMode === "suspend" && (
                      <>
                        {selectedPlayer.isSuspended ? (
                          <>
                            <p className="text-slate-300 text-sm">
                              This player is currently suspended.
                            </p>
                            <button
                              onClick={handleUnsuspendPlayer}
                              disabled={playerActionLoading}
                              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                              {playerActionLoading
                                ? "Unsuspending..."
                                : "Unsuspend Player"}
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="text-slate-300 text-sm">
                              Player:{" "}
                              <span className="font-mono text-white">
                                {selectedPlayer.username}
                              </span>
                            </p>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">
                                Suspension Duration (days)
                              </label>
                              <input
                                type="number"
                                value={suspensionDays}
                                onChange={(e) =>
                                  setSuspensionDays(e.target.value)
                                }
                                min="1"
                                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">
                                Suspension Reason
                              </label>
                              <textarea
                                value={suspensionReason}
                                onChange={(e) =>
                                  setSuspensionReason(e.target.value)
                                }
                                placeholder="Enter reason for suspension..."
                                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500 text-sm"
                                rows={3}
                              />
                            </div>
                            <button
                              onClick={handleSuspendPlayer}
                              disabled={
                                playerActionLoading ||
                                !suspensionReason.trim() ||
                                !suspensionDays
                              }
                              className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                              {playerActionLoading
                                ? "Suspending..."
                                : "Suspend Player"}
                            </button>
                          </>
                        )}
                      </>
                    )}

                    {playerModalMode === "limits" && (
                      <>
                        <p className="text-slate-300 text-sm">
                          Player:{" "}
                          <span className="font-mono text-white">
                            {selectedPlayer.username}
                          </span>
                        </p>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Daily Bet Limit (USDC)
                          </label>
                          <input
                            type="number"
                            value={dailyLimit}
                            onChange={(e) => setDailyLimit(e.target.value)}
                            placeholder="Leave empty to skip"
                            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Weekly Bet Limit (USDC)
                          </label>
                          <input
                            type="number"
                            value={weeklyLimit}
                            onChange={(e) => setWeeklyLimit(e.target.value)}
                            placeholder="Leave empty to skip"
                            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Monthly Bet Limit (USDC)
                          </label>
                          <input
                            type="number"
                            value={monthlyLimit}
                            onChange={(e) => setMonthlyLimit(e.target.value)}
                            placeholder="Leave empty to skip"
                            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSetBetLimits}
                            disabled={
                              playerActionLoading ||
                              (!dailyLimit && !weeklyLimit && !monthlyLimit)
                            }
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                          >
                            {playerActionLoading ? "Setting..." : "Set Limits"}
                          </button>
                          <button
                            onClick={handleRemoveBetLimits}
                            disabled={playerActionLoading}
                            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                          >
                            {playerActionLoading ? "Removing..." : "Remove All"}
                          </button>
                        </div>
                      </>
                    )}

                    {playerModalMode === "freebets" && (
                      <>
                        <p className="text-slate-300 text-sm">
                          Player:{" "}
                          <span className="font-mono text-white">
                            {selectedPlayer.username}
                          </span>
                        </p>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Number of Free Bets
                          </label>
                          <input
                            type="number"
                            value={freeBetCount}
                            onChange={(e) => setFreeBetCount(e.target.value)}
                            min="1"
                            placeholder="Enter number of free bets..."
                            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                          />
                        </div>
                        <button
                          onClick={handleAssignFreeBets}
                          disabled={playerActionLoading || !freeBetCount}
                          className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                          {playerActionLoading
                            ? "Assigning..."
                            : "Assign Free Bets"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
