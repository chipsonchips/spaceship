import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import WalletAuthManager from "@/components/auth/WalletAuthManager";
import { useAccount, useDisconnect } from "wagmi";
import { useAuth } from "@/context/AuthContext";

// Mock wagmi
vi.mock("wagmi", () => ({
  useAccount: vi.fn(),
  useDisconnect: vi.fn(() => ({ disconnect: vi.fn() })),
}));

// Mock AuthContext
vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("WalletAuthManager", () => {
  const loginWithWallet = vi.fn().mockResolvedValue(undefined);
  const logout = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call loginWithWallet when wallet connects", async () => {
    vi.mocked(useAccount).mockReturnValue({
      address: "0x123",
      isConnected: true,
    } as any);

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loginWithWallet,
      logout,
      isLoading: false,
    } as any);

    render(<WalletAuthManager />);

    await waitFor(() => {
      expect(loginWithWallet).toHaveBeenCalledWith("0x123");
    });
  });

  it("should call logout and then login when address changes", async () => {
    // Initial state: connected with 0x123, user is 0x456 (mismatch)
    vi.mocked(useAccount).mockReturnValue({
      address: "0x123",
      isConnected: true,
    } as any);

    vi.mocked(useAuth).mockReturnValue({
      user: { address: "0x456" },
      loginWithWallet,
      logout,
      isLoading: false,
    } as any);

    render(<WalletAuthManager />);

    await waitFor(() => {
      expect(logout).toHaveBeenCalled();
    });
  });

  it("should call logout when wallet disconnects", async () => {
    vi.mocked(useAccount).mockReturnValue({
      address: undefined,
      isConnected: false,
    } as any);

    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1" },
      loginWithWallet,
      logout,
      isLoading: false,
    } as any);

    render(<WalletAuthManager />);

    await waitFor(() => {
      expect(logout).toHaveBeenCalled();
    });
  });
});
