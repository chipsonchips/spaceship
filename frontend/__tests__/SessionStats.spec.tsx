import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import SessionStats from "@/components/game/SessionStats";
import { SettingsProvider } from "@/context/SettingsContext";
import React from "react";

let mockWalletAddress = "0x1234567890123456789012345678901234567890";
let mockBets = [
  {
    id: 1,
    roundId: 1,
    amount: 100,
    cashedOut: true,
    cashoutMultiplier: 1.5,
    payout: 150,
    crashMultiplier: 2.5,
    timestamp: Date.now(),
    txHash: "0x123",
    status: "completed",
  },
  {
    id: 2,
    roundId: 2,
    amount: 80,
    cashedOut: false,
    cashoutMultiplier: null,
    payout: 0,
    crashMultiplier: 1.2,
    timestamp: Date.now(),
    txHash: null,
    status: "lost",
  },
  {
    id: 3,
    roundId: 3,
    amount: 120,
    cashedOut: true,
    cashoutMultiplier: 1.8,
    payout: 200,
    crashMultiplier: 3.5,
    timestamp: Date.now(),
    txHash: "0x456",
    status: "completed",
  },
];

vi.mock("@/hooks/useUSDC", () => ({
  default: () => ({
    walletAddress: mockWalletAddress,
  }),
}));

vi.mock("@/lib/api", () => ({
  fetchMyBetHistory: vi.fn(async () => ({ bets: mockBets })),
}));

describe("SessionStats", () => {
  beforeEach(() => {
    mockWalletAddress = "0x1234567890123456789012345678901234567890";
    mockBets = [
      {
        id: 1,
        roundId: 1,
        amount: 100,
        cashedOut: true,
        cashoutMultiplier: 1.5,
        payout: 150,
        crashMultiplier: 2.5,
        timestamp: Date.now(),
        txHash: "0x123",
        status: "completed",
      },
      {
        id: 2,
        roundId: 2,
        amount: 80,
        cashedOut: false,
        cashoutMultiplier: null,
        payout: 0,
        crashMultiplier: 1.2,
        timestamp: Date.now(),
        txHash: null,
        status: "lost",
      },
      {
        id: 3,
        roundId: 3,
        amount: 120,
        cashedOut: true,
        cashoutMultiplier: 1.8,
        payout: 200,
        crashMultiplier: 3.5,
        timestamp: Date.now(),
        txHash: "0x456",
        status: "completed",
      },
    ];
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SettingsProvider>{children}</SettingsProvider>
  );

  it("displays session stats header", async () => {
    const { container } = render(<SessionStats />, { wrapper });
    await waitFor(() => {
      expect(container.textContent).toContain("Session Stats");
    });
  });

  it("calculates wins correctly", async () => {
    const { container } = render(<SessionStats />, { wrapper });
    // 2 bets with cashedOut=true and payout > 0
    await waitFor(() => {
      expect(container.textContent).toContain("2");
      expect(container.textContent).toContain("Wins");
    });
  });

  it("calculates losses correctly", async () => {
    const { container } = render(<SessionStats />, { wrapper });
    // 1 bet with cashedOut=false
    await waitFor(() => {
      expect(container.textContent).toContain("1");
      expect(container.textContent).toContain("Losses");
    });
  });

  it("calculates win rate correctly", async () => {
    const { container } = render(<SessionStats />, { wrapper });
    // 2 wins out of 3 rounds = 66.7%
    await waitFor(() => {
      expect(container.textContent).toContain("66.7%");
    });
  });

  it("displays total rounds", async () => {
    const { container } = render(<SessionStats />, { wrapper });
    await waitFor(() => {
      expect(container.textContent).toContain("Rounds: 3");
    });
  });

  it("handles empty game history", async () => {
    mockBets = [];
    const { container } = render(<SessionStats />, { wrapper });
    await waitFor(() => {
      expect(container.textContent).toContain("0.0%");
    });
  });

  it("handles no wallet address", async () => {
    mockWalletAddress = null as any;
    const { container } = render(<SessionStats />, { wrapper });
    // Component should render with 0 stats when no wallet
    await waitFor(() => {
      expect(container.textContent).toContain("Session Stats");
    });
  });
});
