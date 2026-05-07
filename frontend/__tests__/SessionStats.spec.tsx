import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import SessionStats from "@/components/game/SessionStats";
import { SettingsProvider } from "@/context/SettingsContext";
import React from "react";

const mockGameHistory = [
  {
    roundId: 1,
    crashMultiplier: 2.5,
    timestamp: Date.now(),
    totalBets: 100,
    totalPayouts: 150,
    winnersCount: 5,
  },
  {
    roundId: 2,
    crashMultiplier: 1.2,
    timestamp: Date.now(),
    totalBets: 80,
    totalPayouts: 0,
    winnersCount: 0,
  },
  {
    roundId: 3,
    crashMultiplier: 3.5,
    timestamp: Date.now(),
    totalBets: 120,
    totalPayouts: 200,
    winnersCount: 8,
  },
];

let mockWalletAddress = "0x1234567890123456789012345678901234567890";
let mockHistory = mockGameHistory;

vi.mock("@/hooks/useUSDC", () => ({
  default: () => ({
    walletAddress: mockWalletAddress,
  }),
}));

vi.mock("@/context/GameContext", () => ({
  useGameContext: () => ({
    gameHistory: mockHistory,
  }),
}));

describe("SessionStats", () => {
  beforeEach(() => {
    mockWalletAddress = "0x1234567890123456789012345678901234567890";
    mockHistory = mockGameHistory;
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SettingsProvider>{children}</SettingsProvider>
  );

  it("displays session stats header", () => {
    const { container } = render(<SessionStats />, { wrapper });
    expect(container.textContent).toContain("Session Stats");
  });

  it("calculates wins correctly", () => {
    const { container } = render(<SessionStats />, { wrapper });
    // 2 rounds with winners
    expect(container.textContent).toContain("2");
    expect(container.textContent).toContain("Wins");
  });

  it("calculates losses correctly", () => {
    const { container } = render(<SessionStats />, { wrapper });
    // 1 round with no winners
    expect(container.textContent).toContain("1");
    expect(container.textContent).toContain("Losses");
  });

  it("calculates win rate correctly", () => {
    const { container } = render(<SessionStats />, { wrapper });
    // 2 wins out of 3 rounds = 66.7%
    expect(container.textContent).toContain("66.7%");
  });

  it("displays total rounds", () => {
    const { container } = render(<SessionStats />, { wrapper });
    expect(container.textContent).toContain("Rounds: 3");
  });

  it("handles empty game history", () => {
    mockHistory = [];
    const { container } = render(<SessionStats />, { wrapper });
    expect(container.textContent).toContain("0.0%");
  });

  it("handles no wallet address", () => {
    mockWalletAddress = null as any;
    const { container } = render(<SessionStats />, { wrapper });
    // Component should render with 0 stats when no wallet
    expect(container.textContent).toContain("Session Stats");
  });
});
