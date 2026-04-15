"use client";

import { useAuth } from "@/context/AuthContext";
import { useAccount } from "wagmi";
import { useState, useEffect } from "react";

/**
 * A diagnostic component that shows the current authentication state.
 * Only visible when show=true (can be toggled).
 */
export default function AuthDebugger() {
  const { user, isAuthenticated, isLoading, error } = useAuth();
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed top-20 left-4 z-[10000] bg-black/90 border border-green-500/50 p-3 rounded text-[10px] font-mono shadow-2xl pointer-events-none">
      <div className="text-green-400 font-bold mb-1 border-b border-green-500/30 pb-1 uppercase tracking-tighter">
        Auth Status
      </div>
      <div className="grid grid-cols-[60px_1fr] gap-x-2 gap-y-0.5">
        <span className="text-green-600/70">Wagmi:</span>
        <span className={isConnected ? "text-green-400" : "text-red-400"}>
          {isConnected ? "Connected" : "Disconnected"}
        </span>
        
        <span className="text-green-600/70">Addr:</span>
        <span className="text-green-400 text-opacity-80">
          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "None"}
        </span>

        <span className="text-green-600/70">Auth:</span>
        <span className={isAuthenticated ? "text-green-400" : "text-red-400"}>
          {isAuthenticated ? "Yes" : "No"}
        </span>

        <span className="text-green-600/70">User_ID:</span>
        <span className="text-cyan-400">
          {user?.id ? user.id.slice(0, 8) : "null"}
        </span>

        <span className="text-green-600/70">User_Un:</span>
        <span className={user?.username ? "text-green-400" : "text-yellow-400"}>
          {user?.username === null ? "null" : user?.username === undefined ? "undef" : user?.username === "" ? '""' : user?.username}
        </span>

        <span className="text-green-600/70">Loading:</span>
        <span className={isLoading ? "text-yellow-400 animate-pulse" : "text-green-400"}>
          {isLoading ? "True" : "False"}
        </span>
      </div>
      {error && (
        <div className="mt-2 text-red-500 border-t border-red-500/20 pt-1">
          Err: {error.slice(0, 20)}
        </div>
      )}
    </div>
  );
}
