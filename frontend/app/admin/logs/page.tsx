"use client";

import { useState, useEffect } from "react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import * as apiAuth from "@/lib/api-auth";

interface AuditLog {
  id: string;
  adminId: string | null;
  actionType: string;
  description: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  chainId: number | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  pages: number;
}

export default function AdminLogsPage() {
  const { isAuthenticated } = useAdminAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    limit: 50,
    offset: 0,
    pages: 0,
  });

  // Filter states
  const [actionType, setActionType] = useState("");
  const [successOnly, setSuccessOnly] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [chainId, setChainId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/admin");
    }
  }, [isAuthenticated, router]);

  const fetchLogs = async (page: number = 1) => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const filters: Record<string, any> = {};

      if (actionType) filters.actionType = actionType;
      if (successOnly) filters.successOnly = "true";
      if (adminId) filters.adminId = adminId;
      if (chainId) filters.chainId = chainId;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const data = await apiAuth.getAuditLogs(
        pagination.limit,
        (page - 1) * pagination.limit,
        filters,
      );

      setLogs(data.logs);
      setPagination(data.pagination);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching logs:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to fetch logs",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchLogs(1);
    }
  }, [
    actionType,
    successOnly,
    adminId,
    chainId,
    startDate,
    endDate,
    isAuthenticated,
  ]);

  const handleReset = () => {
    setActionType("");
    setSuccessOnly(false);
    setAdminId("");
    setChainId("");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const actionTypes = [
    "house_withdraw",
    "house_fund",
    "contract_pause",
    "contract_unpause",
    "operator_set",
    "eth_withdraw",
    "user_created",
    "user_updated",
    "user_deleted",
    "user_role_changed",
    "admin_created",
    "admin_deleted",
    "settings_changed",
    "user_blocked",
    "user_unblocked",
    "user_suspended",
    "user_unsuspended",
    "user_bet_limit_set",
    "free_bet_assigned",
    "security_alert",
    "seed_accessed",
    "suspicious_activity",
  ];

  const getActionColor = (action: string) => {
    if (action.includes("withdraw") || action.includes("pause"))
      return "bg-red-500/10 text-red-300 border-red-500/20";
    if (action.includes("fund") || action.includes("unpause"))
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
    if (action.includes("user") || action.includes("admin"))
      return "bg-blue-500/10 text-blue-300 border-blue-500/20";
    if (action.includes("security") || action.includes("suspicious"))
      return "bg-amber-500/10 text-amber-300 border-amber-500/20";
    return "bg-slate-500/10 text-slate-300 border-slate-500/20";
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-700 pb-6">
        <h1 className="text-3xl font-bold font-orbitron tracking-wide text-white mb-2">
          AUDIT<span className="text-emerald-500">LOGS</span>
        </h1>
        <p className="text-slate-400 text-sm">
          Monitor and filter all system actions
        </p>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : "bg-red-500/10 border-red-500/20 text-red-300"
          }`}
        >
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* Filters Card */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-lg">
        <h2 className="text-lg font-semibold font-orbitron tracking-wide text-white mb-4 flex items-center gap-2">
          <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
          FILTERS
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Action Type */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
              Action Type
            </label>
            <select
              value={actionType}
              onChange={(e) => {
                setActionType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            >
              <option value="">All Actions</option>
              {actionTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, " ").toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Admin ID */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
              Admin ID
            </label>
            <input
              type="text"
              value={adminId}
              onChange={(e) => {
                setAdminId(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Filter by admin ID"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          {/* Chain ID */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
              Chain ID
            </label>
            <input
              type="number"
              value={chainId}
              onChange={(e) => {
                setChainId(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Filter by chain ID"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
              Start Date
            </label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
              End Date
            </label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          {/* Success Only */}
          <div className="flex items-end">
            <label className="flex items-center cursor-pointer gap-2 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg hover:border-emerald-500/50 transition-all">
              <input
                type="checkbox"
                checked={successOnly}
                onChange={(e) => {
                  setSuccessOnly(e.target.checked);
                  setCurrentPage(1);
                }}
                className="w-4 h-4 accent-emerald-500"
              />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Success Only
              </span>
            </label>
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-lg text-slate-300 text-sm font-medium transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Filters
        </button>
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400">
          Showing{" "}
          <span className="text-emerald-400 font-semibold">{logs.length}</span>{" "}
          of{" "}
          <span className="text-emerald-400 font-semibold">
            {pagination.total}
          </span>{" "}
          logs
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 text-center">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
            <p className="text-slate-400 mt-3">Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 text-center">
            <p className="text-slate-400">
              No logs found matching your filters
            </p>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-all"
            >
              {/* Log Header */}
              <button
                onClick={() =>
                  setExpandedLog(expandedLog === log.id ? null : log.id)
                }
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 text-left">
                  {/* Timestamp */}
                  <div className="min-w-fit">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">
                      Time
                    </p>
                    <p className="text-sm font-medium text-slate-200">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Action Type */}
                  <div className="min-w-fit">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">
                      Action
                    </p>
                    <span
                      className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold border ${getActionColor(
                        log.actionType,
                      )}`}
                    >
                      {log.actionType.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="min-w-fit">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">
                      Status
                    </p>
                    {log.success ? (
                      <span className="inline-block px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        SUCCESS
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 rounded-lg text-xs font-semibold bg-red-500/10 text-red-300 border border-red-500/20">
                        FAILED
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">
                      Description
                    </p>
                    <p className="text-sm text-slate-300 truncate">
                      {log.description || "-"}
                    </p>
                  </div>
                </div>

                {/* Expand Icon */}
                <div className="ml-4 text-slate-400">
                  {expandedLog === log.id ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </button>

              {/* Expanded Details */}
              {expandedLog === log.id && (
                <div className="border-t border-slate-700 bg-slate-950 px-6 py-4 space-y-4">
                  {/* Details */}
                  <div>
                    <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                      Details
                    </p>
                    <pre className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-300 overflow-auto max-h-48 font-mono">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>

                  {/* Error Message */}
                  {log.errorMessage && (
                    <div>
                      <p className="text-xs font-bold text-red-400 mb-2 uppercase tracking-wider">
                        Error
                      </p>
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-300">
                        {log.errorMessage}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700">
                    {log.adminId && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">
                          Admin ID
                        </p>
                        <p className="text-sm text-slate-300 font-mono break-all">
                          {log.adminId}
                        </p>
                      </div>
                    )}
                    {log.chainId && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">
                          Chain ID
                        </p>
                        <p className="text-sm text-slate-300">{log.chainId}</p>
                      </div>
                    )}
                    {log.ipAddress && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">
                          IP Address
                        </p>
                        <p className="text-sm text-slate-300 font-mono">
                          {log.ipAddress}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4">
          <button
            onClick={() => fetchLogs(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 rounded-lg text-slate-300 text-sm font-medium transition-all"
          >
            Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
              if (page > pagination.pages) return null;
              return (
                <button
                  key={page}
                  onClick={() => fetchLogs(page)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    page === currentPage
                      ? "bg-emerald-600 text-white border border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                      : "bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            onClick={() =>
              fetchLogs(Math.min(pagination.pages, currentPage + 1))
            }
            disabled={currentPage === pagination.pages}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 rounded-lg text-slate-300 text-sm font-medium transition-all"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
