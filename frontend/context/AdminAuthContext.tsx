"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useDisconnect } from "wagmi";
import { useAuth } from "./AuthContext";

interface AdminAuthContextType {
  adminSecret: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  selectedChain: number;
  login: (secret: string, chainId?: number) => Promise<void>;
  logout: () => void;
  setSelectedChain: (chainId: number) => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(
  undefined,
);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const {
    isAdmin,
    isAuthenticated: isAppAuthenticated,
    isLoading: isAppLoading,
    logout: appLogout,
  } = useAuth();
  const { disconnect } = useDisconnect();
  const [adminSecret, setAdminSecret] = useState<string | null>(null);
  const [isLegacyAuthenticated, setIsLegacyAuthenticated] = useState(false);
  const [isLegacyLoading, setIsLegacyLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChain, setSelectedChainState] = useState<number>(8453);

  // Load stored auth on mount
  useEffect(() => {
    const storedSecret = localStorage.getItem("adminSecret");
    const storedChain = localStorage.getItem("adminSelectedChain");

    if (storedChain) {
      setSelectedChainState(Number(storedChain));
    }

    if (storedSecret) {
      console.log("AdminAuthContext: Found stored admin secret");
      setAdminSecret(storedSecret);
      setIsLegacyAuthenticated(true);
    }

    setIsLegacyLoading(false);
  }, []);

  const combinedIsAuthenticated =
    (isAppAuthenticated && isAdmin()) || isLegacyAuthenticated;
  const combinedIsLoading = isAppLoading || isLegacyLoading;

  const login = useCallback(async (secret: string, chainId: number = 8453) => {
    try {
      setIsLegacyLoading(true);
      setError(null);

      console.log(
        "AdminAuthContext: Logging in with secret for chain",
        chainId,
      );

      // Verify the secret by making a test API call
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(
        `${apiUrl}/api/admin/contract/status?chainId=${chainId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Invalid admin credentials");
      }

      console.log("AdminAuthContext: Admin secret verified successfully");

      setAdminSecret(secret);
      setIsLegacyAuthenticated(true);
      setSelectedChainState(chainId);

      localStorage.setItem("adminSecret", secret);
      localStorage.setItem("adminSelectedChain", chainId.toString());
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Login failed";
      console.error("AdminAuthContext: Login error:", errorMsg);
      setError(errorMsg);
      setAdminSecret(null);
      setIsLegacyAuthenticated(false);
      localStorage.removeItem("adminSecret");
      localStorage.removeItem("adminSelectedChain");
      throw err;
    } finally {
      setIsLegacyLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    console.log("AdminAuthContext: Logging out");
    setAdminSecret(null);
    setIsLegacyAuthenticated(false);
    setError(null);
    localStorage.removeItem("adminSecret");
    localStorage.removeItem("adminSelectedChain");
    
    // Completely clear Web3 JWT session as well
    appLogout();
    // Disconnect wagmi wallet
    disconnect();
  }, [appLogout, disconnect]);

  const setSelectedChain = useCallback((chainId: number) => {
    console.log("AdminAuthContext: Changing chain to", chainId);
    setSelectedChainState(chainId);
    localStorage.setItem("adminSelectedChain", chainId.toString());
  }, []);

  const value: AdminAuthContextType = {
    adminSecret,
    isAuthenticated: combinedIsAuthenticated,
    isLoading: combinedIsLoading,
    error,
    selectedChain,
    login,
    logout,
    setSelectedChain,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}

