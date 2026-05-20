import { useEffect, useRef, useState, useCallback } from "react";
import manager from "../gameSocketManager";
import type { GameHistory, LeaderboardEntry, RoundData } from "@/types/game";

const DEFAULT_WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
const UPDATE_THROTTLE_MS = 50;

type SocketMessage = {
  type: string;
  data?: unknown;
  message?: string;
};

function mergeFlyingTick(prev: RoundData, incoming: RoundData): RoundData {
  return {
    ...prev,
    currentMultiplier: incoming.currentMultiplier,
    planePosition: incoming.planePosition,
    players: incoming.players,
    serverTime: incoming.serverTime,
    totalBets: incoming.totalBets,
    totalPayouts: incoming.totalPayouts,
  };
}

export function useGameSocket(wsUrl = DEFAULT_WS_URL) {
  const [roundData, setRoundData] = useState<RoundData | null>(null);
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsUrlRef = useRef(wsUrl);
  const lastUpdateRef = useRef(0);
  const lastPhaseRef = useRef<string | null>(null);
  const lastRoundIdRef = useRef<number | null>(null);

  wsUrlRef.current = wsUrl;

  const applyGameState = useCallback((incoming: RoundData | null) => {
    if (!incoming) return;

    const now = Date.now();
    const phaseChanged = incoming.phase !== lastPhaseRef.current;
    const roundChanged = incoming.roundId !== lastRoundIdRef.current;
    const mustApply =
      phaseChanged ||
      roundChanged ||
      now - lastUpdateRef.current >= UPDATE_THROTTLE_MS;

    if (mustApply) {
      setRoundData(incoming);
      lastPhaseRef.current = incoming.phase;
      lastRoundIdRef.current = incoming.roundId;
      lastUpdateRef.current = now;
      return;
    }

    setRoundData((prev) => {
      if (!prev || prev.phase !== "FLYING" || incoming.phase !== "FLYING") {
        return prev;
      }
      if (prev.roundId !== incoming.roundId) return prev;
      return mergeFlyingTick(prev, incoming);
    });
  }, []);

  useEffect(() => {
    const handler = (message: SocketMessage) => {
      switch (message.type) {
        case "_OPEN":
          setIsConnected(true);
          setError(null);
          break;
        case "_CLOSE":
          setIsConnected(false);
          break;
        case "_ERROR":
          setError("Connection error");
          break;
        case "GAME_STATE_UPDATE":
          applyGameState(message.data as RoundData | null);
          break;
        case "HISTORY_UPDATE":
          setGameHistory((message.data as GameHistory[]) || []);
          break;
        case "LEADERBOARD_UPDATE":
          setLeaderboard((message.data as LeaderboardEntry[]) || []);
          break;
        case "ERROR":
          setError(message.message || "Server error");
          setTimeout(() => setError(null), 5000);
          break;
        default:
          break;
      }
    };

    const unsubscribe = manager.subscribe(handler as (msg: Record<string, unknown>) => void);
    manager.connect(wsUrlRef.current);
    return () => {
      unsubscribe();
    };
  }, [applyGameState]);

  const reconnect = useCallback(() => {
    manager.connect(wsUrlRef.current);
  }, []);

  const disconnect = useCallback(() => {
    manager.disconnect();
  }, []);

  return {
    roundData,
    setRoundData,
    gameHistory,
    setGameHistory,
    leaderboard,
    setLeaderboard,
    isConnected,
    error,
    reconnect,
    disconnect,
  };
}
