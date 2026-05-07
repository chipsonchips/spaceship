import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import UsernamePrompt from "@/components/auth/UsernamePrompt";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types/user";

// Mock useAuth
vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock UsernameModal
vi.mock("@/components/auth/UsernameModal", () => ({
  default: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="username-modal">
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null,
}));

describe("UsernamePrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Modal Visibility", () => {
    it("should not show modal when user is not authenticated", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
      } as any);

      render(<UsernamePrompt />);

      expect(screen.queryByTestId("username-modal")).not.toBeInTheDocument();
    });

    it("should not show modal when user has a username", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "user-123",
          username: "testuser",
          role: UserRole.PLAYER,
          permissions: [],
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        isAuthenticated: true,
      } as any);

      render(<UsernamePrompt />);

      expect(screen.queryByTestId("username-modal")).not.toBeInTheDocument();
    });

    it("should show modal when user is authenticated but has no username", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "user-123",
          username: null,
          role: UserRole.PLAYER,
          permissions: [],
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        isAuthenticated: true,
      } as any);

      render(<UsernamePrompt />);

      expect(screen.getByTestId("username-modal")).toBeInTheDocument();
    });

    it("should show modal when user is authenticated but username is undefined", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "user-123",
          username: undefined,
          role: UserRole.PLAYER,
          permissions: [],
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        isAuthenticated: true,
      } as any);

      render(<UsernamePrompt />);

      expect(screen.getByTestId("username-modal")).toBeInTheDocument();
    });
  });

  describe("Modal State Changes", () => {
    it("should hide modal when user gets a username", () => {
      const { rerender } = render(<UsernamePrompt />);

      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "user-123",
          username: null,
          role: UserRole.PLAYER,
          permissions: [],
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        isAuthenticated: true,
      } as any);

      rerender(<UsernamePrompt />);
      expect(screen.getByTestId("username-modal")).toBeInTheDocument();

      // Update user with username
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "user-123",
          username: "newusername",
          role: UserRole.PLAYER,
          permissions: [],
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        isAuthenticated: true,
      } as any);

      rerender(<UsernamePrompt />);
      expect(screen.queryByTestId("username-modal")).not.toBeInTheDocument();
    });

    it("should show modal when user logs out and logs back in without username", () => {
      const { rerender } = render(<UsernamePrompt />);

      // Initially not authenticated
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
      } as any);

      rerender(<UsernamePrompt />);
      expect(screen.queryByTestId("username-modal")).not.toBeInTheDocument();

      // User logs in without username
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "user-456",
          username: null,
          role: UserRole.PLAYER,
          permissions: [],
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        isAuthenticated: true,
      } as any);

      rerender(<UsernamePrompt />);
      expect(screen.getByTestId("username-modal")).toBeInTheDocument();
    });
  });

  describe("Modal Behavior", () => {
    it("should not close modal when onClose is called", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "user-123",
          username: null,
          role: UserRole.PLAYER,
          permissions: [],
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        isAuthenticated: true,
      } as any);

      render(<UsernamePrompt />);

      const closeButton = screen.getByText("Close Modal");
      closeButton.click();

      // Modal should still be visible
      expect(screen.getByTestId("username-modal")).toBeInTheDocument();
    });

    it("should handle rapid authentication state changes", async () => {
      const { rerender } = render(<UsernamePrompt />);

      // User authenticates without username
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "user-123",
          username: null,
          role: UserRole.PLAYER,
          permissions: [],
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        isAuthenticated: true,
      } as any);

      rerender(<UsernamePrompt />);
      expect(screen.getByTestId("username-modal")).toBeInTheDocument();

      // User sets username
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "user-123",
          username: "newusername",
          role: UserRole.PLAYER,
          permissions: [],
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        isAuthenticated: true,
      } as any);

      rerender(<UsernamePrompt />);
      expect(screen.queryByTestId("username-modal")).not.toBeInTheDocument();

      // User logs out
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
      } as any);

      rerender(<UsernamePrompt />);
      expect(screen.queryByTestId("username-modal")).not.toBeInTheDocument();
    });
  });

  describe("Different User Roles", () => {
    it("should show modal for player without username", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "user-123",
          username: null,
          role: UserRole.PLAYER,
          permissions: [],
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        isAuthenticated: true,
      } as any);

      render(<UsernamePrompt />);

      expect(screen.getByTestId("username-modal")).toBeInTheDocument();
    });

    it("should show modal for admin without username", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "admin-123",
          username: null,
          role: UserRole.ADMIN,
          permissions: ["read:admin", "write:house"],
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        isAuthenticated: true,
      } as any);

      render(<UsernamePrompt />);

      expect(screen.getByTestId("username-modal")).toBeInTheDocument();
    });

    it("should not show modal for admin with username", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "admin-123",
          username: "adminuser",
          role: UserRole.ADMIN,
          permissions: ["read:admin", "write:house"],
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        isAuthenticated: true,
      } as any);

      render(<UsernamePrompt />);

      expect(screen.queryByTestId("username-modal")).not.toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string username", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "user-123",
          username: "",
          role: UserRole.PLAYER,
          permissions: [],
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        isAuthenticated: true,
      } as any);

      render(<UsernamePrompt />);

      // Empty string is falsy, so modal should show
      expect(screen.getByTestId("username-modal")).toBeInTheDocument();
    });

    it("should handle whitespace-only username", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "user-123",
          username: "   ",
          role: UserRole.PLAYER,
          permissions: [],
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        isAuthenticated: true,
      } as any);

      render(<UsernamePrompt />);

      // Whitespace-only username should be treated as missing, so modal should show
      expect(screen.getByTestId("username-modal")).toBeInTheDocument();
    });

    it("should handle user object with missing fields", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "user-123",
          // username is missing
          role: UserRole.PLAYER,
          permissions: [],
          isActive: true,
          createdAt: new Date().toISOString(),
        } as any,
        isAuthenticated: true,
      } as any);

      render(<UsernamePrompt />);

      // Missing username property should be treated as undefined
      expect(screen.getByTestId("username-modal")).toBeInTheDocument();
    });
  });
});
