"use client";

import { useAuthUser } from "@/hooks/useAuthUser";
import { useEffect, useState } from "react";
import {
  getAllAdmins,
  createAdmin,
  updateUserRole,
  deactivateUser,
  activateUser,
  getAuditLogs,
} from "@/lib/api-auth";
import { User, UserRole } from "@/types/user";

export default function UserManagementPage() {
  const { isAdmin, user } = useAuthUser();
  const [admins, setAdmins] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"admins" | "logs">("admins");

  // Form state for creating admin
  const [newAdminForm, setNewAdminForm] = useState({
    username: "",
    email: "",
    address: "",
    permissions: [] as string[],
  });

  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-900 mb-2">
              Access Denied
            </h1>
            <p className="text-red-700">
              You need admin privileges to access this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
      setLoading(true);
      setError(null);
      const data = await getAuditLogs(100, 0);
      setAuditLogs(data.logs || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load audit logs",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "admins") {
      loadAdmins();
    } else {
      loadAuditLogs();
    }
  }, [activeTab]);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleTogglePermission = (permission: string) => {
    setNewAdminForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm("Are you sure you want to deactivate this user?")) return;

    try {
      setLoading(true);
      await deactivateUser(userId);
      await loadAdmins();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to deactivate user",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      setLoading(true);
      await activateUser(userId);
      await loadAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate user");
    } finally {
      setLoading(false);
    }
  };

  const permissions = [
    { id: "read:audit", label: "View Audit Logs" },
    { id: "write:house", label: "Manage House" },
    { id: "write:contract", label: "Manage Contract" },
    { id: "manage:users", label: "Manage Users" },
    { id: "manage:admins", label: "Manage Admins" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            User Management
          </h1>
          <p className="text-gray-600">
            Manage admin users and view audit logs
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab("admins")}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === "admins"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Admin Users
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === "logs"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Audit Logs
            </button>
          </div>
        </div>

        {/* Admins Tab */}
        {activeTab === "admins" && (
          <div className="space-y-8">
            {/* Create Admin Form */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Create New Admin
              </h2>

              <form onSubmit={handleCreateAdmin} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={newAdminForm.username}
                      onChange={(e) =>
                        setNewAdminForm((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="admin_username"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newAdminForm.email}
                      onChange={(e) =>
                        setNewAdminForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="admin@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Wallet Address
                    </label>
                    <input
                      type="text"
                      value={newAdminForm.address}
                      onChange={(e) =>
                        setNewAdminForm((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0x..."
                    />
                  </div>
                </div>

                {/* Permissions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Permissions
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {permissions.map((perm) => (
                      <label
                        key={perm.id}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={newAdminForm.permissions.includes(perm.id)}
                          onChange={() => handleTogglePermission(perm.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          {perm.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                >
                  {loading ? "Creating..." : "Create Admin"}
                </button>
              </form>
            </div>

            {/* Admins List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">
                  Admin Users
                </h2>
              </div>

              {loading && admins.length === 0 ? (
                <div className="p-6 text-center text-gray-500">Loading...</div>
              ) : admins.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No admin users found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Username
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Permissions
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {admins.map((admin) => (
                        <tr key={admin.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {admin.displayName || admin.username || "N/A"}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {admin.email || "N/A"}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex flex-wrap gap-1">
                              {admin.permissions.length > 0 ? (
                                admin.permissions.map((perm) => (
                                  <span
                                    key={perm}
                                    className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                                  >
                                    {perm}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-500">
                                  No permissions
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                                admin.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {admin.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm space-x-2">
                            {admin.isActive ? (
                              <button
                                onClick={() => handleDeactivateUser(admin.id)}
                                disabled={loading}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivateUser(admin.id)}
                                disabled={loading}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50"
                              >
                                Activate
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audit Logs Tab */}
        {activeTab === "logs" && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Audit Logs</h2>
            </div>

            {loading && auditLogs.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Loading...</div>
            ) : auditLogs.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No audit logs found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Timestamp
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {log.actionType}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {log.description || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              log.success
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {log.success ? "Success" : "Failed"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
