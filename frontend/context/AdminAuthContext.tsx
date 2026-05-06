"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

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
  const [adminSecret, setAdminSecret] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
      setIsAuthenticated(true);
    }

    setIsLoading(false);
  }, []);

  const login = useCallback(async (secret: string, chainId: number = 8453) => {
    try {
      setIsLoading(true);
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
            "x-admin-secret": secret,
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
      setIsAuthenticated(true);
      setSelectedChainState(chainId);

      localStorage.setItem("adminSecret", secret);
      localStorage.setItem("adminSelectedChain", chainId.toString());
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Login failed";
      console.error("AdminAuthContext: Login error:", errorMsg);
      setError(errorMsg);
      setAdminSecret(null);
      setIsAuthenticated(false);
      localStorage.removeItem("adminSecret");
      localStorage.removeItem("adminSelectedChain");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    console.log("AdminAuthContext: Logging out");
    setAdminSecret(null);
    setIsAuthenticated(false);
    setError(null);
    localStorage.removeItem("adminSecret");
    localStorage.removeItem("adminSelectedChain");
  }, []);

  const setSelectedChain = useCallback((chainId: number) => {
    console.log("AdminAuthContext: Changing chain to", chainId);
    setSelectedChainState(chainId);
    localStorage.setItem("adminSelectedChain", chainId.toString());
  }, []);

  const value: AdminAuthContextType = {
    adminSecret,
    isAuthenticated,
    isLoading,
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
