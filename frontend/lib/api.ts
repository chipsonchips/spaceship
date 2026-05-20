/**
 * Public API surface — backed by axios (`lib/api/client.ts`).
 * Import from `@/lib/api` or the focused modules under `@/lib/api/*`.
 */
import { apiClient } from "./api/client";
import { getApiErrorMessage } from "./api/errors";

export { apiClient, getApiErrorMessage };
export * from "./api/game";

// ---------------------------------------------------------------------------
// Admin helpers (Bearer admin secret via axios interceptor)
// ---------------------------------------------------------------------------

function adminHeaders(adminSecret: string) {
  return {
    Authorization: `Bearer ${adminSecret}`,
    "Content-Type": "application/json",
  };
}

export async function adminFetchContractStatus(
  adminSecret: string,
  chainId?: number,
) {
  const { data } = await apiClient.get("/api/admin/contract/status", {
    params: chainId ? { chainId } : undefined,
    headers: adminHeaders(adminSecret),
  });
  return data;
}

export async function adminGetHouseBalance(adminSecret: string, chainId?: number) {
  const { data } = await apiClient.get("/api/admin/house/balance", {
    params: chainId ? { chainId } : undefined,
    headers: adminHeaders(adminSecret),
  });
  return data;
}

export async function adminWithdrawHouse(
  adminSecret: string,
  amount: number,
  chainId?: number,
) {
  const { data } = await apiClient.post(
    "/api/admin/house/withdraw",
    { amount, chainId },
    { headers: adminHeaders(adminSecret) },
  );
  return data;
}

export async function adminFundHouse(
  adminSecret: string,
  amount: number,
  chainId?: number,
) {
  const { data } = await apiClient.post(
    "/api/admin/house/fund",
    { amount, chainId },
    { headers: adminHeaders(adminSecret) },
  );
  return data;
}

export async function adminPauseContract(adminSecret: string, chainId?: number) {
  const { data } = await apiClient.post(
    "/api/admin/contract/pause",
    { chainId },
    { headers: adminHeaders(adminSecret) },
  );
  return data;
}

export async function adminUnpauseContract(
  adminSecret: string,
  chainId?: number,
) {
  const { data } = await apiClient.post(
    "/api/admin/contract/unpause",
    { chainId },
    { headers: adminHeaders(adminSecret) },
  );
  return data;
}

export async function adminSetOperator(
  adminSecret: string,
  address: string,
  chainId?: number,
) {
  const { data } = await apiClient.post(
    "/api/admin/contract/operator",
    { address, chainId },
    { headers: adminHeaders(adminSecret) },
  );
  return data;
}

export async function adminWithdrawETH(
  adminSecret: string,
  to: string,
  amount: number,
  chainId?: number,
) {
  const { data } = await apiClient.post(
    "/api/admin/eth/withdraw",
    { to, amount, chainId },
    { headers: adminHeaders(adminSecret) },
  );
  return data;
}

// Backward-compatible aliases for existing call sites
export {
  placeBet as placeBetRest,
  cashOut as cashOutRest,
} from "./api/game";
