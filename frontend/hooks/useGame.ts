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
  const [clientSeed, setClientSeed] = useState<string>("");

  useEffect(() => {
    // Generate initial client seed
    setClientSeed(Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2));
  }, []);

  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticBets, setOptimisticBets] = useState<any[]>([]);

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

  // 1. Fetch initial REST API states exactly once on mount
  useEffect(() => {
    fetchInitialHistory();

    (async () => {
      try {
        const r = await import("@/lib/api");
        const round = await r.fetchCurrentRound();
        if (round) setRoundData(round);
        const lb = await r.fetchLeaderboard();
        console.log("Fetched leaderboard:", lb);
        setLeaderboard(lb);
      } catch (e) {
        console.error("Failed to fetch initial state via REST:", e);
      }
    })();
  }, [fetchInitialHistory]);

  // 2. Purely handle socket manager subscription and connection
  const wsUrlRef = useRef(wsUrl);
  const lastUpdateRef = useRef<number>(0);
  const lastPhaseRef = useRef<string | null>(null);
  const lastRoundIdRef = useRef<number | null>(null);
  const UPDATE_THROTTLE_MS = 50; // Throttle in-flight ticks only; never drop phase changes

  // Update ref when wsUrl changes, but don't trigger re-subscription
  wsUrlRef.current = wsUrl;

  useEffect(() => {
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

      // Throttle rapid updates to prevent infinite loops
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;

      switch (message.type) {
        case "GAME_STATE_UPDATE": {
          const incoming = message.data as RoundData | null;
          if (!incoming) break;

          const phaseChanged = incoming.phase !== lastPhaseRef.current;
          const roundChanged = incoming.roundId !== lastRoundIdRef.current;
          const mustApply =
            phaseChanged ||
            roundChanged ||
            timeSinceLastUpdate >= UPDATE_THROTTLE_MS;

          if (mustApply) {
            setRoundData(incoming);
            lastPhaseRef.current = incoming.phase;
            lastRoundIdRef.current = incoming.roundId;
            lastUpdateRef.current = now;
          }
          break;
        }
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
    manager.connect(wsUrlRef.current);

    return () => {
      unsubscribe();
    };
  }, []); // Empty dependency array - only run once on mount

  // Clear optimistic bets once they appear in roundData or when round changes
  useEffect(() => {
    if (!roundData?.players) return;

    setOptimisticBets(prev => prev.filter(opt => {
      // Keep only if same round and not yet in server list
      const inServerList = roundData.players.some(
        p => p.address.toLowerCase() === opt.address.toLowerCase()
      );
      return opt.roundId === roundData.roundId && !inServerList;
    }));
  }, [roundData?.players, roundData?.roundId]);

  const roundIdRef = useRef<number | null>(null);

  useEffect(() => {
    roundIdRef.current = roundData?.roundId || null;
  }, [roundData?.roundId]);

  const placeBet = useCallback(
    async (address: string, amount: number, useFreeBet: boolean = false, autoCashoutMultiplier?: number) => {
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

        const currentRoundId = roundIdRef.current;
        if (!currentRoundId) {
          return { success: false, error: 'No active round' };
        }

        console.log("placing bet", currentRoundId, address, amount, useFreeBet ? "(free bet)" : "", autoCashoutMultiplier ? `(auto-cashout: ${autoCashoutMultiplier}x)` : "");
        const res = await api.placeBetRest(currentRoundId, address, amount, chainId, useFreeBet, autoCashoutMultiplier, clientSeed);

        if (res.success && res.bet) {
          // Generate new seed for next bet
          setClientSeed(Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2));

          // Add to optimistic bets
          setOptimisticBets(prev => [...prev, {
            ...res.bet,
            roundId: currentRoundId,
            address: address
          }]);

          return { success: true, txHash: res.bet.txHash };
        } else {
          return { success: false, error: res.error || 'Failed to place bet' };
        }

      } catch (err) {
        console.error("Error placing bet:", err);
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to place bet'
        };
      }
    },
    [
      transferUSDC,
      houseAddress,
      walletClient,
      publicClient,
      checkAllowance,
      approveUSDC,
      chainId,
      clientSeed
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
    manager.connect(wsUrlRef.current);
  }, []);

  const disconnect = useCallback(() => {
    manager.disconnect();
  }, []);

  return {
    roundData,
    gameHistory,
    leaderboard,
    isConnected,
    error,
    optimisticBets,

    placeBet,
    cashOut,
    reconnect,
    disconnect,
  };
}

export function usePlayerBet(
  roundData: RoundData | null,
  playerAddress: string | null,
  optimisticBets: any[] = []
) {
  if (!playerAddress) return null;

  // 1. Check roundData (authoritative)
  const serverBet = roundData?.players.find(
    (p) => p.address.toLowerCase() === playerAddress.toLowerCase(),
  );
  if (serverBet) return serverBet;

  // 2. Check optimistic bets (fallback)
  const optimisticBet = optimisticBets.find(
    (p) => p.address.toLowerCase() === playerAddress.toLowerCase() && p.roundId === roundData?.roundId
  );

  return optimisticBet || null;
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
      // Use dynamic round restart delay set by admin (default to 5s)
      const restartDelay = Number(roundData.roundRestartDelayMs || 5000);
      let timeLeft = Math.max(1, Math.ceil(restartDelay / 1000));
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
      // Calculate offset based on the serverTime we received with this roundData
      const timeOffset = roundData.serverTime ? Date.now() - roundData.serverTime : 0;
      const flyAt = roundData.flyStartTime
        ? Number(roundData.flyStartTime)
        : Date.now() - timeOffset + 60000;

      const update = () => {
        const adjustedNow = Date.now() - timeOffset;
        const secsLeft = Math.max(0, Math.ceil((flyAt - adjustedNow) / 1000));
        setCountdown(secsLeft);
        if (secsLeft <= 0 && interval) {
          clearInterval(interval);
          interval = null;
        }
      };
      update();
      interval = setInterval(update, 1000);
    } else {
      // FLYING phase - clear countdown
      setCountdown(0);
    }

    return cleanup;
  }, [roundData?.phase, roundData?.flyStartTime, roundData?.roundId]);

  return countdown;
}

/** Match backend `calculateCurrentMultiplier` for smooth client-side display. */
function multiplierAtElapsedMs(elapsedMs: number, maxCrash = 100): number {
  const t = elapsedMs / 1000;
  return Math.min(1.0 + Math.pow(t, 1.5) / 5, maxCrash);
}

function flyStartFromRound(round: RoundData): number {
  if (round.flyStartTime) {
    const clockOffset = round.serverTime ? Date.now() - round.serverTime : 0;
    return Number(round.flyStartTime) + clockOffset;
  }
  const mult = Number(round.currentMultiplier) || 1;
  const serverElapsed = Math.pow((mult - 1.0) * 5, 2 / 3) * 1000;
  return Date.now() - serverElapsed;
}

export function useMultiplierAnimation(roundData: RoundData | null) {
  const [displayMultiplier, setDisplayMultiplier] = useState(1.0);
  const rafRef = useRef<number | null>(null);
  const flyStartRef = useRef<number>(Date.now());
  const maxCrashRef = useRef(100);

  // Anchor takeoff time only when entering FLYING or switching rounds — not every tick.
  useEffect(() => {
    if (roundData?.phase === "FLYING") {
      flyStartRef.current = flyStartFromRound(roundData);
      maxCrashRef.current = Number(roundData.maxCrashMultiplier) || 100;
    }
  }, [roundData?.phase, roundData?.roundId, roundData?.flyStartTime]);

  useEffect(() => {
    const stop = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const currentPhase = roundData?.phase;

    if (currentPhase === "FLYING") {
      const animate = () => {
        const elapsed = Math.max(0, Date.now() - flyStartRef.current);
        setDisplayMultiplier(multiplierAtElapsedMs(elapsed, maxCrashRef.current));
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
      return () => stop();
    }

    stop();
    if (currentPhase === "CRASHED") {
      setDisplayMultiplier(Number(roundData?.crashMultiplier || 1.0));
    } else {
      setDisplayMultiplier(1.0);
    }
  }, [roundData?.phase, roundData?.crashMultiplier, roundData?.roundId]);

  return displayMultiplier;
}

export default useGame;
