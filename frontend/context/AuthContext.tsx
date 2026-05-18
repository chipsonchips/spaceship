"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { UserRole, AuthUser, AuthTokens, AuthContextType } from "@/types";
import { useSignMessage } from "wagmi";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { signMessageAsync } = useSignMessage();

  // Load tokens from localStorage on mount
  useEffect(() => {
    const loadStoredAuth = () => {
      try {
        const storedTokens = localStorage.getItem("authTokens");
        const storedUser = localStorage.getItem("authUser");

        if (storedTokens && storedUser) {
          const parsedTokens = JSON.parse(storedTokens);
          const parsedUser = JSON.parse(storedUser);
          console.log("Loaded stored auth from localStorage:", parsedUser);
          setTokens(parsedTokens);
          setUser(parsedUser);
        } else {
          console.log("No stored auth found in localStorage");
        }
      } catch (err) {
        console.error("Failed to load stored auth:", err);
        localStorage.removeItem("authTokens");
        localStorage.removeItem("authUser");
      } finally {
        console.log("Setting isLoading to false after localStorage check");
        setIsLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  const saveAuth = useCallback((user: AuthUser, tokens: AuthTokens) => {
    setUser(user);
    setTokens(tokens);
    localStorage.setItem("authUser", JSON.stringify(user));
    localStorage.setItem("authTokens", JSON.stringify(tokens));
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem("authUser");
    localStorage.removeItem("authTokens");
  }, []);

  const loginWithWallet = useCallback(
    async (address: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const timestamp = Date.now();
        const message = `Welcome to Aviator! Sign this message to authenticate.\n\nWallet: ${address}\nTimestamp: ${timestamp}`;
        let signature = "";

        try {
          signature = await signMessageAsync({ message });
        } catch (signErr) {
          console.error("Message signing failed:", signErr);
          throw new Error("Failed to sign authentication message. Please approve the signature request in your wallet.");
        }

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

        const response = await fetch(`${apiUrl}/api/auth/wallet/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, signature, message }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMsg = data.error || "Login failed";
          console.error(
            "Login failed with status",
            response.status,
            ":",
            errorMsg,
          );
          throw new Error(errorMsg);
        }

        if (!data.user || !data.accessToken || !data.refreshToken) {
          console.error("Invalid response data:", data);
          console.error("Missing fields:", {
            hasUser: !!data.user,
            hasAccessToken: !!data.accessToken,
            hasRefreshToken: !!data.refreshToken,
          });
          throw new Error("Invalid login response - missing user or tokens");
        }

        const expiresIn = data.expiresIn || 86400000; // Default 24h

        saveAuth(data.user, {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresIn,
        });

        console.log("User saved to auth context:", data.user);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Login failed";
        console.error("Login error:", errorMsg);
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [saveAuth, signMessageAsync],
  );

  const loginWithFarcaster = useCallback(
    async (
      farcasterId: number,
      username: string,
      displayName: string,
      avatarUrl?: string,
      bio?: string,
      address?: string,
    ) => {
      try {
        console.log("loginWithFarcaster called with username:", username);
        setIsLoading(true);
        setError(null);

        let signature: string | undefined = undefined;
        let message: string | undefined = undefined;

        if (address) {
          try {
            const timestamp = Date.now();
            message = `Welcome to Aviator! Sign this message to authenticate.\n\nWallet: ${address}\nTimestamp: ${timestamp}`;
            signature = await signMessageAsync({ message });
          } catch (signErr) {
            console.error("Wallet signature for Farcaster link failed:", signErr);
            throw new Error("Failed to sign message to link wallet. Please approve the signature request in your wallet.");
          }
        }

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

        const response = await fetch(`${apiUrl}/api/auth/farcaster/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            farcasterId,
            username,
            displayName,
            avatarUrl,
            bio,
            address,
            signature,
            message,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMsg = data.error || "Login failed";
          console.error(
            "Farcaster login failed with status",
            response.status,
            ":",
            errorMsg,
          );
          throw new Error(errorMsg);
        }

        if (!data.user || !data.accessToken || !data.refreshToken) {
          console.error("Invalid response data:", data);
          console.error("Missing fields:", {
            hasUser: !!data.user,
            hasAccessToken: !!data.accessToken,
            hasRefreshToken: !!data.refreshToken,
          });
          throw new Error("Invalid login response - missing user or tokens");
        }

        const expiresIn = data.expiresIn || 86400000; // Default 24h

        saveAuth(data.user, {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresIn,
        });

        console.log("User saved to auth context:", data.user);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Login failed";
        console.error("Farcaster login error:", errorMsg);
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [saveAuth, signMessageAsync],
  );

  const refreshToken = useCallback(async () => {
    if (!tokens?.refreshToken) {
      clearAuth();
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      if (!response.ok) {
        clearAuth();
        return;
      }

      const data = await response.json();
      if (user) {
        setTokens({
          ...tokens,
          accessToken: data.accessToken,
        });
        localStorage.setItem(
          "authTokens",
          JSON.stringify({
            ...tokens,
            accessToken: data.accessToken,
          }),
        );
      }
    } catch (err) {
      console.error("Token refresh failed:", err);
      clearAuth();
    }
  }, [tokens, user, clearAuth]);

  const logout = useCallback(async () => {
    try {
      if (tokens?.accessToken) {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        await fetch(`${apiUrl}/api/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            "Content-Type": "application/json",
          },
        });
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      clearAuth();
    }
  }, [tokens, clearAuth]);

  const updateProfile = useCallback(
    async (updates: Partial<AuthUser>) => {
      if (!tokens?.accessToken) {
        throw new Error("Not authenticated");
      }

      try {
        setIsLoading(true);
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const response = await fetch(`${apiUrl}/api/auth/profile`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error("Failed to update profile");
        }

        const data = await response.json();
        const updatedUser = { ...user, ...data.user } as AuthUser;
        setUser(updatedUser);
        localStorage.setItem("authUser", JSON.stringify(updatedUser));
      } finally {
        setIsLoading(false);
      }
    },
    [tokens, user],
  );

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      if (user.role === UserRole.ADMIN) return true;
      return user.permissions.includes(permission);
    },
    [user],
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]): boolean => {
      if (!user) return false;
      if (user.role === UserRole.ADMIN) return true;
      return permissions.some((p) => user.permissions.includes(p));
    },
    [user],
  );

  const isAdmin = useCallback((): boolean => {
    return user?.role === UserRole.ADMIN;
  }, [user]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    tokens,
    loginWithWallet,
    loginWithFarcaster,
    refreshToken,
    logout,
    updateProfile,
    hasPermission,
    hasAnyPermission,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
