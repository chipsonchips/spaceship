"use client";

import { AdminAuthProvider, useAdminAuth } from "@/context/AdminAuthContext";
import { useState, useEffect } from "react";
import {
  AlertCircle,
  LogOut,
  LayoutDashboard,
  Users,
  Gamepad2,
  KeySquare,
  Menu,
  X,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Wallet,
  ConnectWallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import {
  Identity,
  Avatar,
  Name,
  Address,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import { useAccount } from "wagmi";

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
  const { isConnected } = useAccount();
  const pathname = usePathname();

  const [loginSecret, setLoginSecret] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showEmergencyLogin, setShowEmergencyLogin] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500"></div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 font-orbitron tracking-wide">
              ADMIN<span className="text-emerald-500">PORTAL</span>
            </h1>
            <p className="text-slate-400 text-sm">
              Secure area for authorized personnel
            </p>
          </div>

          {(loginError || error) && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{loginError || error}</p>
            </div>
          )}

          {/* Primary Login (Wallet) */}
          <div className="space-y-4 text-center">
            <p className="text-sm text-slate-300 font-medium">
              Authenticate via Web3 Wallet
            </p>
            <div className="flex justify-center">
              <Wallet>
                <ConnectWallet className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all text-sm font-bold font-orbitron tracking-wider text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  CONNECT WALLET
                </ConnectWallet>
                <WalletDropdown className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl backdrop-blur-xl">
                  <Identity
                    className="px-4 pt-3 pb-2 font-inter"
                    hasCopyAddressOnClick
                  >
                    <Avatar className="border border-slate-600/50" />
                    <Name className="text-white font-medium" />
                    <Address className="text-slate-400 text-xs" />
                    <EthBalance className="text-emerald-400 text-xs font-courier" />
                  </Identity>
                  <WalletDropdownDisconnect className="hover:bg-red-500/10 text-red-400 font-medium text-sm transition-colors" />
                </WalletDropdown>
              </Wallet>
            </div>
            {isConnected && (
              <p className="text-amber-400 text-xs mt-2 bg-amber-500/10 border border-amber-500/20 rounded p-2 text-left">
                Wallet connected but unauthorized. Only accounts with the ADMIN
                role can access this portal.
              </p>
            )}
          </div>

          <div className="my-8 relative flex items-center justify-center">
            <div className="border-t border-slate-700 w-full"></div>
            <span className="absolute bg-slate-900 px-3 text-xs text-slate-500 font-medium uppercase tracking-wider">
              Alternatively
            </span>
          </div>

          {/* Fallback Login (Secret) */}
          {!showEmergencyLogin ? (
            <button
              onClick={() => setShowEmergencyLogin(true)}
              className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-colors text-sm py-2"
            >
              <KeySquare className="w-4 h-4" />
              Use Emergency Root Secret
            </button>
          ) : (
            <div className="space-y-4 animate-[slideDown_0.2s_ease-out]">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
                  Root Admin Secret
                </label>
                <input
                  type="password"
                  value={loginSecret}
                  onChange={(e) => setLoginSecret(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="Enter secret key..."
                  disabled={isLoggingIn}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50"
                />
              </div>

              <div className="flex items-center justify-between mb-4">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Target Chain
                </label>
                <select
                  value={selectedChain}
                  onChange={(e) => setSelectedChain(Number(e.target.value))}
                  className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-300 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value={8453}>Base</option>
                  <option value={42220}>Celo</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowEmergencyLogin(false);
                    setLoginError("");
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogin}
                  disabled={isLoggingIn || !loginSecret.trim()}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-2 rounded-xl font-medium transition-colors disabled:opacity-50 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                >
                  {isLoggingIn ? "Authenticating..." : "Authorize"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const navigation = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Game Control", href: "/admin/game", icon: Gamepad2 },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Audit Logs", href: "/admin/logs", icon: FileText },
  ];

  return (
    <div className="h-screen bg-slate-950 flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50">
        <div className="font-orbitron font-bold text-lg tracking-wide text-white">
          ADMIN<span className="text-emerald-500">PORTAL</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-slate-400 hover:text-white"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-6 hidden md:block border-b border-slate-800">
          <div className="font-orbitron font-bold text-2xl tracking-wide text-white text-center">
            ADMIN
            <span className="text-emerald-500 truncate block text-sm tracking-[0.2em] mt-1">
              PORTAL
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto mt-16 md:mt-0">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[inset_0_0_15px_rgba(16,185,129,0.05)]"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <item.icon
                  className={`w-5 h-5 ${isActive ? "text-emerald-400" : "text-slate-500"}`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
              Active Network
            </label>
            <select
              value={selectedChain}
              onChange={(e) => setSelectedChain(Number(e.target.value))}
              className="w-full bg-transparent text-emerald-400 text-sm font-medium focus:outline-none"
            >
              <option value={8453}>Base Mainnet</option>
              <option value={42220}>Celo Mainnet</option>
            </select>
          </div>

          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl transition-colors font-medium text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto pt-4 md:pt-0 custom-scrollbar">
        <div className="max-w-6xl mx-auto p-4 md:p-8">{children}</div>
      </main>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
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
