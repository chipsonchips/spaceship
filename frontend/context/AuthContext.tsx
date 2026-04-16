"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { UserRole } from "@/types/user";

export interface AuthUser {
  id: string;
  address?: string;
  farcasterId?: number;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  email?: string;
  role: UserRole;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  tokens: AuthTokens | null;

  // Auth methods
  loginWithWallet: (address: string) => Promise<void>;
  loginWithFarcaster: (
    farcasterId: number,
    username: string,
    displayName: string,
    avatarUrl?: string,
    bio?: string,
    address?: string,
  ) => Promise<void>;
  refreshToken: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<AuthUser>) => Promise<void>;

  // Permission checks
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Log user changes
  useEffect(() => {
    console.log("AuthProvider: user state changed:", user);
  }, [user]);

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
    console.log("saveAuth called with user:", user);
    setUser(user);
    setTokens(tokens);
    localStorage.setItem("authUser", JSON.stringify(user));
    localStorage.setItem("authTokens", JSON.stringify(tokens));
    console.log("User saved to state and localStorage");
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
        console.log("loginWithWallet called with address:", address);
        setIsLoading(true);
        setError(null);

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        console.log("Calling API:", `${apiUrl}/api/auth/wallet/login`);

        const response = await fetch(`${apiUrl}/api/auth/wallet/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        });

        console.log("Login response status:", response.status);

        if (!response.ok) {
          throw new Error("Login failed");
        }

        const data = await response.json();
        console.log("Login response data:", data);

        saveAuth(data.user, {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresIn: data.expiresIn,
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
    [saveAuth],
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
        setIsLoading(true);
        setError(null);

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
          }),
        });

        if (!response.ok) {
          throw new Error("Login failed");
        }

        const data = await response.json();
        saveAuth(data.user, {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresIn: data.expiresIn,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Login failed";
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [saveAuth],
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
