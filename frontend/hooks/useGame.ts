import { useEffect, useState, useCallback, useRef } from "react";
import manager from "./gameSocketManager";
import { RoundData, GameHistory, LeaderboardEntry } from "@/types/game";
import { useWalletClient, usePublicClient, useChainId } from 'wagmi';
import GameABI from "@/abis/aviator.json";
const DEFAULT_WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
import useUSDC from "@/hooks/useUSDC";
import { amountInWei } from "@/lib/gameUtils";
import { maxUint256 } from "viem";
import * as api from "@/lib/api";

export function useGame(options: { wsUrl?: string } = {}) {
  const wsUrl = options.wsUrl || DEFAULT_WS_URL;
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();

  const {
    transferUSDC,
    houseAddress,
    checkAllowance,
    approveUSDC
  } = useUSDC();

  const [roundData, setRoundData] = useState<RoundData | null>(null);
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInitialHistory = useCallback(async () => {
    try {

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/history`);
      if (response.ok) {
        const data = await response.json();
        setGameHistory(data.history);
      }
    } catch (err) {
      console.error("Failed to fetch game history:", err);
    }
  }, []);

  useEffect(() => {
    fetchInitialHistory();

    const handler = (message: any) => {
      if (message.type === "_OPEN") {
        setIsConnected(true);
        setError(null);
        return;
      }

      if (message.type === "_CLOSE") {
        setIsConnected(false);
        return;
      }

      if (message.type === "_ERROR") {
        setError("Connection error");
        return;
      }

      switch (message.type) {
        case "GAME_STATE_UPDATE":
          setRoundData(message.data);
          break;
        case "HISTORY_UPDATE":
          setGameHistory(message.data || []);
          break;
        case "LEADERBOARD_UPDATE":
          setLeaderboard(message.data || []);
          break;
        case "ERROR":
          setError(message.message || "Server error");
          setTimeout(() => setError(null), 5000);
          break;
        default:
        // ignore
      }
    };

    const unsubscribe = manager.subscribe(handler);
    manager.connect(wsUrl);

    // fetch initial server state via REST as a fallback
    (async () => {
      try {
        const r = await import("@/lib/api");
        const round = await r.fetchCurrentRound();
        if (round) setRoundData(round);
        const lb = await r.fetchLeaderboard();
        console.log("Fetched leaderboard:", lb);
        setLeaderboard(lb);
      } catch (e) {
        console.error("Failed to fetch leaderboard:", e);
        // ignore; socket will update state when ready
      }
    })();

    // Refresh leaderboard every 10 seconds
    const leaderboardInterval = setInterval(async () => {
      try {
        const r = await import("@/lib/api");
        const lb = await r.fetchLeaderboard();
        setLeaderboard(lb);
      } catch (e) {
        console.error("Failed to refresh leaderboard:", e);
      }
    }, 10000);

    return () => {
      clearInterval(leaderboardInterval);
      // unsubscribe();
    };
  }, [wsUrl]);

  const placeBet = useCallback(
    async (address: string, amount: number, useFreeBet: boolean = false) => {
      // For free bets, we don't need wallet connection
      if (!useFreeBet && !walletClient?.account?.address) {
        return { success: false, error: 'Wallet not connected' };
      }

      if (!useFreeBet && !publicClient) {
        return { success: false, error: 'Public client not available' };
      }

      const gameContractAddress = houseAddress;
      if (!gameContractAddress && !useFreeBet) {
        return { success: false, error: 'Game contract address not configured for this chain' };
      }

      try {
        if (!useFreeBet) {
          const currentAllowance = await checkAllowance(address, gameContractAddress);

          if (currentAllowance < amount) {
            try {
              const approvalTxHash = await approveUSDC(gameContractAddress, maxUint256);
              console.log('USDC approval transaction hash:', approvalTxHash);

              if (publicClient) {
                await publicClient.waitForTransactionReceipt({
                  hash: approvalTxHash as `0x${string}`
                });
              }
            } catch (err) {
              console.error('USDC approval failed:', err);
              return { success: false, error: 'Failed to approve USDC transfer' };
            }
          }
        }

        if (!roundData?.roundId) {
          return { success: false, error: 'No active round' };
        }

        console.log("placing bet", roundData.roundId, address, amount, useFreeBet ? "(free bet)" : "");
        const res = await api.placeBetRest(roundData.roundId, address, amount, chainId, useFreeBet);

        if (res.success && res.bet) {
          // Notify socket (optimistic) or wait for server push
          // manager.send({ type: "PLACE_BET", data: { address, amount, txHash: res.bet.txHash } });
          return { success: true, txHash: res.bet.txHash };
        } else {
          return { success: false, error: res.error || 'Failed to place bet' };
        }

      } catch (err) {
        console.error("Error placing bet:", err);
        return {
          success: false,
          error: 'Failed to place bet'
        };
      }
    },
    [
      roundData,
      transferUSDC,
      houseAddress,
      walletClient,
      publicClient,
      checkAllowance,
      approveUSDC,
      chainId
    ],
  );

  const cashOut = useCallback(async (betId: number) => {
    try {
      console.log("cashout", betId);
      const res = await api.cashOutRest(betId, undefined, chainId);
      console.log("cashout result", res);
      if (res.success) {
        return { success: true };
      } else {
        return { success: false, error: res.error };
      }
    } catch (e) {
      console.warn("REST cashout failed", e);
      return { success: false, error: 'Cashout failed' };
    }
  }, [chainId]);

  const reconnect = useCallback(() => {
    manager.connect(wsUrl);
  }, [wsUrl]);

  const disconnect = useCallback(() => {
    manager.disconnect();
  }, []);

  return {
    roundData,
    gameHistory,
    leaderboard,
    isConnected,
    error,

    placeBet,
    cashOut,
    reconnect,
    disconnect,
  };
}

export function usePlayerBet(
  roundData: RoundData | null,
  playerAddress: string | null,
) {
  if (!roundData || !playerAddress) return null;
  return (
    roundData.players.find(
      (p) => p.address.toLowerCase() === playerAddress.toLowerCase(),
    ) || null
  );
}

export function useRoundCountdown(roundData: RoundData | null) {
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };

    if (!roundData) {
      setCountdown(0);
      return cleanup;
    }

    if (roundData.phase === "CRASHED") {
      let timeLeft = 5;
      setCountdown(timeLeft);
      interval = setInterval(() => {
        timeLeft--;
        setCountdown(timeLeft);
        if (timeLeft <= 0 && interval) {
          clearInterval(interval);
          interval = null;
        }
      }, 1000);
    } else if (roundData.phase === "BETTING") {
      const flyAt = roundData.flyStartTime
        ? Number(roundData.flyStartTime)
        : Date.now() + 60000;
      const update = () => {
        const secsLeft = Math.max(0, Math.ceil((flyAt - Date.now()) / 1000));
        setCountdown(secsLeft);
        if (secsLeft <= 0 && interval) {
          clearInterval(interval);
          interval = null;
        }
      };
      update();
      interval = setInterval(update, 1000);
    } else {
      setCountdown(0);
    }

    return cleanup;
  }, [roundData?.phase, roundData?.flyStartTime, roundData?.roundId]);

  return countdown;
}

export function useMultiplierAnimation(roundData: RoundData | null) {
  const [displayMultiplier, setDisplayMultiplier] = useState(1.0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const stop = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    if (roundData?.phase === "FLYING") {
      setDisplayMultiplier(roundData.currentMultiplier);
      const animate = () => {
        setDisplayMultiplier((m) =>
          Math.max(m, roundData?.currentMultiplier ?? m),
        );
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
      return () => stop();
    } else {
      stop();
      if (roundData?.phase === "CRASHED") {
        setDisplayMultiplier(roundData.crashMultiplier || 1.0);
      } else {
        setDisplayMultiplier(1.0);
      }
    }
  }, [
    roundData?.phase,
    roundData?.currentMultiplier,
    roundData?.crashMultiplier,
  ]);

  return displayMultiplier;
}

export default useGame;
