/**
 * Authenticated & admin API — uses shared axios client (`lib/api/client.ts`).
 */
import { apiClient } from "./api/client";
import { getApiErrorMessage } from "./api/errors";

export { apiClient, getApiErrorMessage };

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function loginWithWallet(address: string) {
  const { data } = await apiClient.post("/api/auth/wallet/login", { address });
  return data;
}

export async function loginWithFarcaster(
  farcasterId: number,
  username: string,
  displayName: string,
  avatarUrl?: string,
  bio?: string,
  address?: string,
) {
  const { data } = await apiClient.post("/api/auth/farcaster/login", {
    farcasterId,
    username,
    displayName,
    avatarUrl,
    bio,
    address,
  });
  return data;
}

export async function refreshAuthToken(refreshToken: string) {
  const { data } = await apiClient.post("/api/auth/refresh", { refreshToken });
  return data;
}

export async function getCurrentUser() {
  const { data } = await apiClient.get("/api/auth/me");
  return data;
}

export async function updateUserProfile(updates: Record<string, unknown>) {
  const { data } = await apiClient.put("/api/auth/profile", updates);
  return data;
}

export async function logout() {
  const { data } = await apiClient.post("/api/auth/logout");
  return data;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function getUser(userId: string) {
  const { data } = await apiClient.get(`/api/users/${userId}`);
  return data;
}

export async function getUserByAddress(address: string) {
  const { data } = await apiClient.get(`/api/users/address/${address}`);
  return data;
}

// ---------------------------------------------------------------------------
// Admin users
// ---------------------------------------------------------------------------

export async function getAllAdmins() {
  const { data } = await apiClient.get("/api/users/admin/all");
  return data;
}

export async function createAdmin(
  username: string,
  address?: string,
  email?: string,
  permissions: string[] = [],
) {
  const { data } = await apiClient.post("/api/users/admin/create", {
    username,
    address,
    email,
    permissions,
  });
  return data;
}

export async function updateUserRole(
  userId: string,
  role: string,
  permissions: string[] = [],
) {
  const { data } = await apiClient.put(`/api/users/${userId}/role`, {
    role,
    permissions,
  });
  return data;
}

export async function deactivateUser(userId: string) {
  const { data } = await apiClient.put(`/api/users/${userId}/deactivate`);
  return data;
}

export async function activateUser(userId: string) {
  const { data } = await apiClient.put(`/api/users/${userId}/activate`);
  return data;
}

// ---------------------------------------------------------------------------
// Audit logs
// ---------------------------------------------------------------------------

export async function getAuditLogs(
  limit = 100,
  offset = 0,
  filters?: Record<string, unknown>,
) {
  const { data } = await apiClient.get("/api/audit-logs", {
    params: { limit, offset, ...filters },
  });
  return data;
}

export async function getAdminLogs(
  adminId: string,
  limit = 100,
  offset = 0,
) {
  const { data } = await apiClient.get(`/api/audit-logs/admin/${adminId}`, {
    params: { limit, offset },
  });
  return data;
}

export async function getFailedActions(limit = 50) {
  const { data } = await apiClient.get("/api/audit-logs/failed", {
    params: { limit },
  });
  return data;
}

// ---------------------------------------------------------------------------
// Admin contract / house (auth via interceptor)
// ---------------------------------------------------------------------------

export async function adminGetContractStatus(chainId?: number) {
  const { data } = await apiClient.get("/api/admin/contract/status", {
    params: chainId ? { chainId } : undefined,
  });
  return data;
}

export async function adminGetHouseBalance(chainId?: number) {
  const { data } = await apiClient.get("/api/admin/house/balance", {
    params: chainId ? { chainId } : undefined,
  });
  return data;
}

export async function adminWithdrawHouse(amount: number, chainId?: number) {
  const { data } = await apiClient.post("/api/admin/house/withdraw", {
    amount,
    chainId,
  });
  return data;
}

export async function adminFundHouse(amount: number, chainId?: number) {
  const { data } = await apiClient.post("/api/admin/house/fund", {
    amount,
    chainId,
  });
  return data;
}

export async function adminPauseContract(chainId?: number) {
  const { data } = await apiClient.post("/api/admin/contract/pause", { chainId });
  return data;
}

export async function adminUnpauseContract(chainId?: number) {
  const { data } = await apiClient.post("/api/admin/contract/unpause", {
    chainId,
  });
  return data;
}

export async function adminSetOperator(address: string, chainId?: number) {
  const { data } = await apiClient.post("/api/admin/contract/operator", {
    address,
    chainId,
  });
  return data;
}

export async function adminWithdrawETH(
  to: string,
  amount: number,
  chainId?: number,
) {
  const { data } = await apiClient.post("/api/admin/eth/withdraw", {
    to,
    amount,
    chainId,
  });
  return data;
}

// ---------------------------------------------------------------------------
// Admin game observation
// ---------------------------------------------------------------------------

export async function getAdminPlayers(
  limit = 50,
  offset = 0,
  search?: string,
) {
  const { data } = await apiClient.get("/api/admin/game/players", {
    params: { limit, offset, search },
  });
  return data;
}

export async function getPlayerDetails(userId: string) {
  const { data } = await apiClient.get(`/api/admin/game/players/${userId}`);
  return data;
}

export async function getPlayerBets(
  userId: string,
  limit = 50,
  offset = 0,
) {
  const { data } = await apiClient.get(
    `/api/admin/game/players/${userId}/bets`,
    { params: { limit, offset } },
  );
  return data;
}

export async function getRoundDetails(roundId: number) {
  const { data } = await apiClient.get(`/api/admin/game/rounds/${roundId}`);
  return data;
}

export async function getGameStatistics() {
  const { data } = await apiClient.get("/api/admin/game/statistics");
  return data;
}

export async function getAdminGameSettings() {
  const { data } = await apiClient.get("/api/admin/game/settings");
  return data;
}

export async function updateAdminGameSettings(
  settings: Record<string, unknown> | object,
) {
  const { data } = await apiClient.put("/api/admin/game/settings", settings);
  return data;
}

// ---------------------------------------------------------------------------
// Player restrictions & free bets
// ---------------------------------------------------------------------------

export async function blockPlayer(userId: string, reason: string) {
  const { data } = await apiClient.post(`/api/users/${userId}/block`, {
    reason,
  });
  return data;
}

export async function unblockPlayer(userId: string) {
  const { data } = await apiClient.post(`/api/users/${userId}/unblock`);
  return data;
}

export async function suspendPlayer(
  userId: string,
  durationDays: number,
  reason: string,
) {
  const { data } = await apiClient.post(`/api/users/${userId}/suspend`, {
    durationDays,
    reason,
  });
  return data;
}

export async function unsuspendPlayer(userId: string) {
  const { data } = await apiClient.post(`/api/users/${userId}/unsuspend`);
  return data;
}

export async function setDailyBetLimit(userId: string, limit: number) {
  const { data } = await apiClient.post(
    `/api/users/${userId}/bet-limits/daily`,
    { limit },
  );
  return data;
}

export async function setWeeklyBetLimit(userId: string, limit: number) {
  const { data } = await apiClient.post(
    `/api/users/${userId}/bet-limits/weekly`,
    { limit },
  );
  return data;
}

export async function setMonthlyBetLimit(userId: string, limit: number) {
  const { data } = await apiClient.post(
    `/api/users/${userId}/bet-limits/monthly`,
    { limit },
  );
  return data;
}

export async function removeBetLimits(userId: string) {
  const { data } = await apiClient.delete(`/api/users/${userId}/bet-limits`);
  return data;
}

export async function getUserRestrictions(userId: string) {
  const { data } = await apiClient.get(`/api/users/${userId}/restrictions`);
  return data;
}

export async function assignFreeBets(userId: string, count: number) {
  const { data } = await apiClient.post("/api/free-bets/admin/add", {
    userId,
    count,
  });
  return data;
}

export async function assignFreeBetsBulk(userIds: string[], count: number) {
  const { data } = await apiClient.post("/api/free-bets/admin/assign-bulk", {
    userIds,
    count,
  });
  return data;
}

export async function setFreeBets(userId: string, count: number) {
  const { data } = await apiClient.post("/api/free-bets/admin/set", {
    userId,
    count,
  });
  return data;
}

export async function setFreeBetsBulk(userIds: string[], count: number) {
  const { data } = await apiClient.post("/api/free-bets/admin/set-bulk", {
    userIds,
    count,
  });
  return data;
}
