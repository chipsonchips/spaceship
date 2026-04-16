import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import BetControls from "@/components/BetControls";
import { GameProvider } from "@/context/GameContext";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { base } from "wagmi/chains";

// Mock wagmi hooks
vi.mock("wagmi", async () => {
  const actual = await vi.importActual("wagmi");
  return {
    ...actual,
    useAccount: () => ({
      address: undefined,
      isConnected: false,
    }),
    useChainId: () => 8453,
  };
});

// Create a minimal wagmi config for testing
const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
});

describe("BetControls", () => {
  it("renders connect prompt if wallet not connected", () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <GameProvider>
            <BetControls />
          </GameProvider>
        </WagmiProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByText(/Connect wallet to play/i)).toBeTruthy();
  });
});
