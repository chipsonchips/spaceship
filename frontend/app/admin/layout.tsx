"use client";

import { AdminAuthProvider, useAdminAuth } from "@/context/AdminAuthContext";
import { useState } from "react";
import { AlertCircle, LogOut } from "lucide-react";
import Link from "next/link";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const {
    isAuthenticated,
    isLoading,
    error,
    logout,
    login,
    selectedChain,
    setSelectedChain,
  } = useAdminAuth();
  const [loginSecret, setLoginSecret] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (!loginSecret.trim()) {
      setLoginError("Please enter admin secret");
      return;
    }

    try {
      setIsLoggingIn(true);
      setLoginError("");
      await login(loginSecret, selectedChain);
      setLoginSecret("");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
        <div className="max-w-md mx-auto mt-20">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
            <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
            <p className="text-slate-400 mb-6">
              Enter your admin secret to continue
            </p>

            {(loginError || error) && (
              <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{loginError || error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Admin Secret
                </label>
                <input
                  type="password"
                  value={loginSecret}
                  onChange={(e) => setLoginSecret(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="Enter admin secret"
                  disabled={isLoggingIn}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 disabled:opacity-50"
                />
              </div>

              <button
                onClick={handleLogin}
                disabled={isLoggingIn || !loginSecret.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isLoggingIn ? "Logging in..." : "Login"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Admin Header */}
      <div className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="text-2xl font-bold text-white hover:text-green-400 transition-colors"
              >
                Admin Panel
              </Link>
              <nav className="hidden md:flex items-center gap-2">
                <Link
                  href="/admin"
                  className="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/game"
                  className="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
                >
                  Game
                </Link>
                <Link
                  href="/admin/users"
                  className="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
                >
                  Users
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <select
                value={selectedChain}
                onChange={(e) => setSelectedChain(Number(e.target.value))}
                className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
              >
                <option value={8453}>Base</option>
                <option value={42220}>Celo</option>
              </select>

              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">{children}</div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminAuthProvider>
  );
}
