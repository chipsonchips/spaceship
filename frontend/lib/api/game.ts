import type {
  GameHistory,
  LeaderboardEntry,
  RoundData,
  UserBetHistoryItem,
} from "@/types/game";
import { apiClient } from "./client";
import { getApiErrorMessage } from "./errors";

export async function fetchCurrentRound(): Promise<RoundData | null> {
  const { data } = await apiClient.get<{ success: boolean; round: RoundData }>(
    "/api/rounds/current",
  );
  return data.round ?? null;
}

export async function fetchGameHistory(): Promise<GameHistory[]> {
  const { data } = await apiClient.get<{ history: GameHistory[] }>("/api/history");
  return data.history ?? [];
}

export async function fetchMyBetHistory(
  limit = 50,
  offset = 0,
): Promise<{ bets: UserBetHistoryItem[]; pages: number; total: number }> {
  const { data } = await apiClient.get<{
    success: boolean;
    bets: UserBetHistoryItem[];
    pagination: { total: number; pages: number };
  }>("/api/rounds/bets/me", { params: { limit, offset } });
  return {
    bets: data.bets ?? [],
    pages: data.pagination?.pages ?? 1,
    total: data.pagination?.total ?? 0,
  };
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data } = await apiClient.get<{ leaderboard: LeaderboardEntry[] }>(
    "/api/leaderboard",
  );
  return data.leaderboard ?? [];
}

export async function fetchPublicGameSettings() {
  const { data } = await apiClient.get<{
    success: boolean;
    settings: Record<string, number>;
  }>("/api/rounds/settings");
  return data.settings;
}

export async function fetchUserByAddress(address: string) {
  try {
    const { data } = await apiClient.get(`/api/users/address/${address}`);
    return data;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw new Error(getApiErrorMessage(error, "Failed to fetch user"));
  }
}

export async function fetchFreeBetsForUser(userId: string) {
  const { data } = await apiClient.get<{
    freeBetsRemaining: number;
    freeBetMaxAmount: number;
    expiresAt: string | null;
  }>(`/api/free-bets/user/${userId}`);
  return data;
}

export async function verifyRound(roundId: number) {
  const { data } = await apiClient.get(`/api/verify/${roundId}`);
  return data;
}

export async function placeBet(
  roundId: number,
  body: {
    address: string;
    amount: number;
    chainId?: number;
    useFreeBet?: boolean;
    autoCashoutMultiplier?: number;
    clientSeed?: string;
  },
) {
  const { data } = await apiClient.post(`/api/rounds/${roundId}/bets`, body);
  return data as { success: boolean; bet?: unknown; error?: string };
}

export async function cashOut(
  betId: number,
  body: { multiplier?: number; chainId?: number },
) {
  const { data } = await apiClient.post(
    `/api/rounds/bets/${betId}/cashout`,
    body,
  );
  return data as { success: boolean; bet?: unknown; error?: string };
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    (error as { response?: { status?: number } }).response?.status === 404
  );
}
