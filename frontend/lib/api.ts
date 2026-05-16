const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function fetchCurrentRound() {
  const res = await fetch(`${API_BASE}/api/rounds/current`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch current round: ${res.statusText}`);
  }
  const j = await res.json();
  return j.round;
}

export async function placeBetRest(
  roundId: number,
  address: string,
  amount: number,
  chainId?: number,
  useFreeBet: boolean = false,
  autoCashoutMultiplier?: number,
  clientSeed?: string,
) {
  const body: any = { address, amount, chainId, useFreeBet, clientSeed };
  if (autoCashoutMultiplier) {
    body.autoCashoutMultiplier = autoCashoutMultiplier;
  }
  const res = await fetch(`${API_BASE}/api/rounds/${roundId}/bets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to place bet: ${res.statusText}`);
  }
  return res.json();
}

export async function cashOutRest(betId: number, multiplier?: number, chainId?: number) {
  const res = await fetch(`${API_BASE}/api/rounds/bets/${betId}/cashout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ multiplier, chainId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to cash out: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchLeaderboard() {
  const res = await fetch(`${API_BASE}/api/leaderboard`);
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  const j = await res.json();
  return j.leaderboard || [];
}

export async function fetchUserByAddress(address: string) {
  const res = await fetch(`${API_BASE}/api/users/address/${address}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

// Admin API functions
export async function adminFetchContractStatus(adminSecret: string, chainId?: number) {
  const params = new URLSearchParams();
  if (chainId) params.append('chainId', chainId.toString());

  const res = await fetch(`${API_BASE}/api/admin/contract/status?${params}`, {
    headers: {
      'Authorization': `Bearer ${adminSecret}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) throw new Error("Failed to fetch contract status");
  return res.json();
}

export async function adminGetHouseBalance(adminSecret: string, chainId?: number) {
  const params = new URLSearchParams();
  if (chainId) params.append('chainId', chainId.toString());

  const res = await fetch(`${API_BASE}/api/admin/house/balance?${params}`, {
    headers: {
      'Authorization': `Bearer ${adminSecret}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) throw new Error("Failed to fetch house balance");
  return res.json();
}

export async function adminWithdrawHouse(adminSecret: string, amount: number, chainId?: number) {
  const res = await fetch(`${API_BASE}/api/admin/house/withdraw`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminSecret}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ amount, chainId })
  });
  if (!res.ok) throw new Error("Failed to withdraw house profits");
  return res.json();
}

export async function adminFundHouse(adminSecret: string, amount: number, chainId?: number) {
  const res = await fetch(`${API_BASE}/api/admin/house/fund`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminSecret}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ amount, chainId })
  });
  if (!res.ok) throw new Error("Failed to fund house");
  return res.json();
}

export async function adminPauseContract(adminSecret: string, chainId?: number) {
  const res = await fetch(`${API_BASE}/api/admin/contract/pause`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminSecret}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ chainId })
  });
  if (!res.ok) throw new Error("Failed to pause contract");
  return res.json();
}

export async function adminUnpauseContract(adminSecret: string, chainId?: number) {
  const res = await fetch(`${API_BASE}/api/admin/contract/unpause`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminSecret}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ chainId })
  });
  if (!res.ok) throw new Error("Failed to unpause contract");
  return res.json();
}

export async function adminSetOperator(adminSecret: string, address: string, chainId?: number) {
  const res = await fetch(`${API_BASE}/api/admin/contract/operator`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminSecret}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ address, chainId })
  });
  if (!res.ok) throw new Error("Failed to set operator");
  return res.json();
}

export async function adminWithdrawETH(adminSecret: string, to: string, amount: number, chainId?: number) {
  const res = await fetch(`${API_BASE}/api/admin/eth/withdraw`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminSecret}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ to, amount, chainId })
  });
  if (!res.ok) throw new Error("Failed to withdraw ETH");
  return res.json();
}
