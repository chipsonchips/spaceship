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
} from "@/lib/api-auth";
import { User, UserRole } from "@/types/user";
import { ArrowLeft, Users, Plus, AlertCircle, Loader2 } from "lucide-react";

export default function UserManagementPage() {
  const {
    isAuthenticated,
    adminSecret,
    isLoading: authLoading,
  } = useAdminAuth();
  const [admins, setAdmins] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"admins" | "logs" | "players">(
    "admins",
  );

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
      loadAdmins();
      loadAuditLogs();
    }
  }, [isAuthenticated, authLoading]);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllAdmins();
      setAdmins(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const data = await getAuditLogs(50, 0);
      setAuditLogs(data.logs || []);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    }
  };

  const handleCreateAdmin = async () => {
    if (!newAdminForm.username.trim()) {
      setError("Username is required");
      return;
    }

    if (!newAdminForm.address.trim()) {
      setError("Wallet Address is required. Admins authenticate using their Web3 wallet.");
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  User Management
                </h1>
                <p className="text-slate-400">
                  Manage admin users and permissions
                </p>
              </div>
              <Link
                href="/admin/users/players"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Users className="w-5 h-5" />
                View Players
              </Link>
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
                        disabled={loading || !newAdminForm.username.trim() || !newAdminForm.address.trim()}
                        className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {loading ? "Creating..." : "Create Admin"}
                      </button>
                    </div>
                  </div>

                  {/* Admins List */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">
                      Admin Users
                    </h3>
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                      </div>
                    ) : admins.length === 0 ? (
                      <p className="text-slate-400">No admin users found</p>
                    ) : (
                      <div className="space-y-2">
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
                                  onClick={() => handleActivateAdmin(admin.id)}
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
                    )}
                  </div>
                </div>
              )}

              {activeTab === "logs" && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Audit Logs
                  </h3>
                  {auditLogs.length === 0 ? (
                    <p className="text-slate-400">No audit logs found</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {auditLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-slate-800/30 rounded-lg border border-slate-700"
                        >
                          <p className="text-white font-medium">{log.action}</p>
                          <p className="text-slate-400 text-sm">
                            {log.description}
                          </p>
                          <p className="text-slate-500 text-xs mt-1">
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "players" && (
                <div className="text-center py-8">
                  <p className="text-slate-400 mb-4">
                    View and manage player accounts
                  </p>
                  <Link
                    href="/admin/users/players"
                    className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Users className="w-5 h-5" />
                    Go to Player Management
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
