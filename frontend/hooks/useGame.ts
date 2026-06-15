import { useEffect, useState, useCallback, useRef } from "react";
import { useWalletClient, usePublicClient, useChainId } from "wagmi";
import { maxUint256 } from "viem";
import type { PlayerBet } from "@/types/game";
import useUSDC from "@/hooks/useUSDC";
import * as gameApi from "@/lib/api/game";
import { useGameSocket } from "./game/useGameSocket";
import {
  useMultiplierAnimation,
  usePlayerBet,
  useRoundCountdown,
} from "./game";

export { useMultiplierAnimation, usePlayerBet, useRoundCountdown };

type OptimisticBet = PlayerBet & { roundId: number };

export function useGame(options: { wsUrl?: string } = {}) {
  const wsUrl =
    options.wsUrl ||
    process.env.NEXT_PUBLIC_WS_URL ||
    "ws://localhost:3001";

  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { houseAddress, checkAllowance, approveUSDC } = useUSDC();

  const socket = useGameSocket(wsUrl);
  const [clientSeed, setClientSeed] = useState("");
  const [optimisticBets, setOptimisticBets] = useState<OptimisticBet[]>([]);

  const roundIdRef = useRef<number | null>(null);

  useEffect(() => {
    setClientSeed(
      Math.random().toString(36).substring(2) +
      Math.random().toString(36).substring(2),
    );
  }, []);

  useEffect(() => {
    roundIdRef.current = socket.roundData?.roundId ?? null;
  }, [socket.roundData?.roundId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [history, round, leaderboard] = await Promise.all([
          gameApi.fetchGameHistory(),
          gameApi.fetchCurrentRound(),
          gameApi.fetchLeaderboard(),
        ]);
        if (cancelled) return;
        socket.setGameHistory(history);
        if (round) socket.setRoundData(round);
        socket.setLeaderboard(leaderboard);
      } catch (e) {
        console.error("Failed to fetch initial game state:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!socket.roundData?.players) return;
    setOptimisticBets((prev) =>
      prev.filter((opt) => {
        const inServerList = socket.roundData!.players.some(
          (p) => p.address.toLowerCase() === opt.address.toLowerCase(),
        );
        return opt.roundId === socket.roundData!.roundId && !inServerList;
      }),
    );
  }, [socket.roundData?.players, socket.roundData?.roundId]);

  const placeBet = useCallback(
    async (
      address: string,
      amount: number,
      useFreeBet = false,
      autoCashoutMultiplier?: number,
    ) => {
      if (!useFreeBet && !walletClient?.account?.address) {
        return { success: false, error: "Wallet not connected" };
      }
      if (!useFreeBet && !publicClient) {
        return { success: false, error: "Public client not available" };
      }
      if (!houseAddress && !useFreeBet) {
        return {
          success: false,
          error: "Game contract address not configured for this chain",
        };
      }

      const currentRoundId = roundIdRef.current;
      if (!currentRoundId) {
        return { success: false, error: "No active round" };
      }

      try {
        // No wallet approval needed here anymore! 
        // Betting utilizes the user's game balance which they manage via Deposit/Withdraw.

        const res = await gameApi.placeBet(currentRoundId, {
          address,
          amount,
          chainId,
          useFreeBet,
          autoCashoutMultiplier,
          clientSeed,
        });

        if (res.success && res.bet) {
          setClientSeed(
            Math.random().toString(36).substring(2) +
            Math.random().toString(36).substring(2),
          );
          setOptimisticBets((prev) => [
            ...prev,
            {
              ...(res.bet as PlayerBet),
              roundId: currentRoundId,
              address,
            },
          ]);
          return {
            success: true,
            txHash: (res.bet as PlayerBet).txHash ?? undefined,
            betId: (res.bet as PlayerBet).id,
          };
        }

        return { success: false, error: res.error || "Failed to place bet" };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to place bet",
        };
      }
    },
    [
      walletClient,
      publicClient,
      houseAddress,
      checkAllowance,
      approveUSDC,
      chainId,
      clientSeed,
    ],
  );

  const cashOut = useCallback(
    async (betId: number) => {
      try {
        const res = await gameApi.cashOut(betId, { chainId });
        if (res.success) return { success: true };
        return { success: false, error: res.error };
      } catch {
        return { success: false, error: "Cashout failed" };
      }
    },
    [chainId],
  );

  return {
    roundData: socket.roundData,
    gameHistory: socket.gameHistory,
    leaderboard: socket.leaderboard,
    isConnected: socket.isConnected,
    error: socket.error,
    optimisticBets,
    placeBet,
    cashOut,
    reconnect: socket.reconnect,
    disconnect: socket.disconnect,
  };
}

export default useGame;
