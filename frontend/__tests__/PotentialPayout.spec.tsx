import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import PotentialPayout from "@/components/game/PotentialPayout";
import { SettingsProvider } from "@/context/SettingsContext";
import React from "react";

let mockRoundData: any = null;
let mockWalletAddress = "0x1234567890123456789012345678901234567890";

vi.mock("@/hooks/useGame", () => ({
  useMultiplierAnimation: () => 2.5,
  usePlayerBet: (roundData: any, address: string) => {
    return roundData?.players?.find(
      (p: any) => p.address.toLowerCase() === address?.toLowerCase()
    ) || null;
  },
}));

vi.mock("@/hooks/useUSDC", () => ({
  default: () => ({
    walletAddress: mockWalletAddress,
  }),
}));

vi.mock("@/context/GameContext", () => ({
  useGameContext: () => ({
    roundData: mockRoundData,
  }),
}));

describe("PotentialPayout", () => {
  beforeEach(() => {
    mockRoundData = {
      roundId: 1,
      phase: "FLYING",
      players: [
        {
          address: "0x1234567890123456789012345678901234567890",
          amount: 10,
          cashedOut: false,
        },
      ],
    };
    mockWalletAddress = "0x1234567890123456789012345678901234567890";
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SettingsProvider>{children}</SettingsProvider>
  );

  it("calculates potential payout correctly", () => {
    const { container } = render(<PotentialPayout />, { wrapper });

    // 10 USDC bet × 2.5 multiplier = 25 USDC
    expect(container.textContent).toContain("25.00");
  });

  it("displays profit correctly", () => {
    const { container } = render(<PotentialPayout />, { wrapper });

    // Profit = 25 - 10 = 15 USDC
    expect(container.textContent).toContain("+15.00");
  });

  it("shows bet amount and multiplier", () => {
    const { container } = render(<PotentialPayout />, { wrapper });

    expect(container.textContent).toContain("10.00");
    expect(container.textContent).toContain("2.50x");
  });

  it("renders nothing when no active bet", () => {
    mockRoundData = {
      roundId: 1,
      phase: "FLYING",
      players: [],
    };

    const { container } = render(<PotentialPayout />, { wrapper });
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when phase is not FLYING", () => {
    mockRoundData = {
      roundId: 1,
      phase: "BETTING",
      players: [
        {
          address: "0x1234567890123456789012345678901234567890",
          amount: 10,
          cashedOut: false,
        },
      ],
    };

    const { container } = render(<PotentialPayout />, { wrapper });
    expect(container.firstChild).toBeNull();
  });
});
