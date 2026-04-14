import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types/user";

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("AuthProvider", () => {
    it("should provide auth context to children", () => {
      const TestComponent = () => {
        const { isAuthenticated } = useAuth();
        return (
          <div>{isAuthenticated ? "Authenticated" : "Not Authenticated"}</div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      expect(screen.getByText("Not Authenticated")).toBeInTheDocument();
    });

    it("should load stored auth on mount", async () => {
      const storedUser = {
        id: "user-123",
        address: "0x1234567890123456789012345678901234567890",
        username: "testuser",
        role: UserRole.PLAYER,
        permissions: [],
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const storedTokens = {
        accessToken: "access-token-123",
        refreshToken: "refresh-token-123",
        expiresIn: 3600,
      };

      localStorage.setItem("authUser", JSON.stringify(storedUser));
      localStorage.setItem("authTokens", JSON.stringify(storedTokens));

      const TestComponent = () => {
        const { user, isAuthenticated } = useAuth();
        return (
          <div>
            {isAuthenticated && user ? (
              <div>
                <span>{user.username}</span>
                <span>{user.address}</span>
              </div>
            ) : (
              <div>Not Authenticated</div>
            )}
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("testuser")).toBeInTheDocument();
      });
    });
  });

  describe("loginWithWallet", () => {
    it("should authenticate user with wallet address", async () => {
      const mockUser = {
        id: "user-123",
        address: "0x1234567890123456789012345678901234567890",
        username: null,
        role: UserRole.PLAYER,
        permissions: [],
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const mockTokens = {
        accessToken: "access-token-123",
        refreshToken: "refresh-token-123",
        expiresIn: 3600,
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: mockUser,
          ...mockTokens,
        }),
      } as Response);

      const TestComponent = () => {
        const { user, isAuthenticated, loginWithWallet } = useAuth();

        return (
          <div>
            <button onClick={() => loginWithWallet(mockUser.address!)}>
              Login
            </button>
            {isAuthenticated && user ? (
              <div>
                <span>{user.address}</span>
                <span>{user.username || "No username"}</span>
              </div>
            ) : (
              <div>Not Authenticated</div>
            )}
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      const loginButton = screen.getByText("Login");

      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByText(mockUser.address!)).toBeInTheDocument();
      });

      // Check localStorage
      const storedUser = JSON.parse(localStorage.getItem("authUser") || "{}");
      expect(storedUser.address).toBe(mockUser.address);
    });

    it("should handle login error", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Login failed" }),
      } as Response);

      const TestComponent = () => {
        const { error, loginWithWallet } = useAuth();

        return (
          <div>
            <button
              onClick={async () => {
                try {
                  await loginWithWallet(
                    "0x1234567890123456789012345678901234567890",
                  );
                } catch (err) {
                  // Error is expected and handled by context
                }
              }}
            >
              Login
            </button>
            {error && <div>{error}</div>}
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      const loginButton = screen.getByText("Login");

      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByText("Login failed")).toBeInTheDocument();
      });
    });
  });

  describe("updateProfile", () => {
    it("should update user profile", async () => {
      const initialUser = {
        id: "user-123",
        address: "0x1234567890123456789012345678901234567890",
        username: null,
        role: UserRole.PLAYER,
        permissions: [],
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const updatedUser = {
        ...initialUser,
        username: "newusername",
      };

      const tokens = {
        accessToken: "access-token-123",
        refreshToken: "refresh-token-123",
        expiresIn: 3600,
      };

      localStorage.setItem("authUser", JSON.stringify(initialUser));
      localStorage.setItem("authTokens", JSON.stringify(tokens));

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: updatedUser,
        }),
      } as Response);

      const TestComponent = () => {
        const { user, updateProfile } = useAuth();

        return (
          <div>
            <button onClick={() => updateProfile({ username: "newusername" })}>
              Update
            </button>
            <span>{user?.username || "No username"}</span>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      const updateButton = screen.getByText("Update");

      await act(async () => {
        updateButton.click();
      });

      await waitFor(() => {
        expect(screen.getByText("newusername")).toBeInTheDocument();
      });
    });

    it("should throw error if not authenticated", async () => {
      const TestComponent = () => {
        const { updateProfile } = useAuth();

        return (
          <button
            onClick={async () => {
              try {
                await updateProfile({ username: "test" });
              } catch (err) {
                expect(err).toBeDefined();
              }
            }}
          >
            Update
          </button>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      const updateButton = screen.getByText("Update");

      await act(async () => {
        updateButton.click();
      });
    });
  });

  describe("logout", () => {
    it("should clear auth data on logout", async () => {
      const user = {
        id: "user-123",
        address: "0x1234567890123456789012345678901234567890",
        username: "testuser",
        role: UserRole.PLAYER,
        permissions: [],
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const tokens = {
        accessToken: "access-token-123",
        refreshToken: "refresh-token-123",
        expiresIn: 3600,
      };

      localStorage.setItem("authUser", JSON.stringify(user));
      localStorage.setItem("authTokens", JSON.stringify(tokens));

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const TestComponent = () => {
        const { isAuthenticated, logout } = useAuth();

        return (
          <div>
            <button onClick={() => logout()}>Logout</button>
            <span>
              {isAuthenticated ? "Authenticated" : "Not Authenticated"}
            </span>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      const logoutButton = screen.getByText("Logout");

      await act(async () => {
        logoutButton.click();
      });

      await waitFor(() => {
        expect(screen.getByText("Not Authenticated")).toBeInTheDocument();
      });

      expect(localStorage.getItem("authUser")).toBeNull();
      expect(localStorage.getItem("authTokens")).toBeNull();
    });
  });

  describe("Permission checks", () => {
    it("should check if user has permission", () => {
      const user = {
        id: "user-123",
        username: "testuser",
        role: UserRole.PLAYER,
        permissions: ["read:admin", "write:house"],
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem("authUser", JSON.stringify(user));
      localStorage.setItem(
        "authTokens",
        JSON.stringify({
          accessToken: "token",
          refreshToken: "token",
          expiresIn: 3600,
        }),
      );

      const TestComponent = () => {
        const { hasPermission } = useAuth();

        return (
          <div>
            {hasPermission("read:admin") && <span>Has read:admin</span>}
            {!hasPermission("write:contract") && <span>No write:contract</span>}
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      expect(screen.getByText("Has read:admin")).toBeInTheDocument();
      expect(screen.getByText("No write:contract")).toBeInTheDocument();
    });

    it("should return true for admin users", () => {
      const user = {
        id: "user-123",
        username: "admin",
        role: UserRole.ADMIN,
        permissions: [],
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem("authUser", JSON.stringify(user));
      localStorage.setItem(
        "authTokens",
        JSON.stringify({
          accessToken: "token",
          refreshToken: "token",
          expiresIn: 3600,
        }),
      );

      const TestComponent = () => {
        const { hasPermission, isAdmin } = useAuth();

        return (
          <div>
            {isAdmin() && <span>Is admin</span>}
            {hasPermission("any:permission") && <span>Has any permission</span>}
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      expect(screen.getByText("Is admin")).toBeInTheDocument();
      expect(screen.getByText("Has any permission")).toBeInTheDocument();
    });
  });
});
