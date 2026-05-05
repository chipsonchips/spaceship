/**
 * API client with authentication support
 * Automatically includes JWT tokens in requests
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        const tokens = localStorage.getItem('authTokens');
        if (tokens) {
            const parsed = JSON.parse(tokens);
            return parsed.accessToken;
        }
    } catch (err) {
        console.error('Failed to get auth token:', err);
    }
    return null;
}

function getAdminSecret(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('adminSecret');
}

function getAuthHeaders(): Record<string, string> {
    const token = getAuthToken();
    const adminSecret = getAdminSecret();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (token) {
        console.log('Using JWT token for authentication');
        headers['Authorization'] = `Bearer ${token}`;
    } else if (adminSecret) {
        console.log('Using admin secret for authentication');
        headers['X-Admin-Secret'] = adminSecret;
    } else {
        console.log('No authentication credentials found');
    }

    return headers;
}

/**
 * Fetch with automatic auth token injection
 */
export async function authenticatedFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const headers = {
        ...getAuthHeaders(),
        ...options.headers,
    };

    return fetch(url, {
        ...options,
        headers,
    });
}

// Auth endpoints
export async function loginWithWallet(address: string) {
    const res = await fetch(`${API_BASE}/api/auth/wallet/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json();
}

export async function loginWithFarcaster(
    farcasterId: number,
    username: string,
    displayName: string,
    avatarUrl?: string,
    bio?: string,
    address?: string
) {
    const res = await fetch(`${API_BASE}/api/auth/farcaster/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            farcasterId,
            username,
            displayName,
            avatarUrl,
            bio,
            address,
        }),
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json();
}

export async function refreshAuthToken(refreshToken: string) {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) throw new Error('Token refresh failed');
    return res.json();
}

export async function getCurrentUser() {
    const res = await authenticatedFetch(`${API_BASE}/api/auth/me`);
    if (!res.ok) throw new Error('Failed to fetch user');
    return res.json();
}

export async function updateUserProfile(updates: Record<string, any>) {
    const res = await authenticatedFetch(`${API_BASE}/api/auth/profile`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
}

export async function logout() {
    const res = await authenticatedFetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
    });
    if (!res.ok) throw new Error('Logout failed');
    return res.json();
}

// User endpoints
export async function getUser(userId: string) {
    const res = await fetch(`${API_BASE}/api/users/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch user');
    return res.json();
}

export async function getUserByAddress(address: string) {
    const res = await fetch(`${API_BASE}/api/users/address/${address}`);
    if (!res.ok) throw new Error('Failed to fetch user');
    return res.json();
}

// Admin endpoints
export async function getAllAdmins() {
    const res = await authenticatedFetch(`${API_BASE}/api/users/admin/all`);
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`Failed to fetch admins: ${res.status} ${res.statusText} - ${errorData.error || ''}`);
    }
    return res.json();
}

export async function createAdmin(
    username: string,
    address?: string,
    email?: string,
    permissions: string[] = []
) {
    const res = await authenticatedFetch(`${API_BASE}/api/users/admin/create`, {
        method: 'POST',
        body: JSON.stringify({ username, address, email, permissions }),
    });
    if (!res.ok) throw new Error('Failed to create admin');
    return res.json();
}

export async function updateUserRole(
    userId: string,
    role: string,
    permissions: string[] = []
) {
    const res = await authenticatedFetch(`${API_BASE}/api/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role, permissions }),
    });
    if (!res.ok) throw new Error('Failed to update user role');
    return res.json();
}

export async function deactivateUser(userId: string) {
    const res = await authenticatedFetch(`${API_BASE}/api/users/${userId}/deactivate`, {
        method: 'PUT',
    });
    if (!res.ok) throw new Error('Failed to deactivate user');
    return res.json();
}

export async function activateUser(userId: string) {
    const res = await authenticatedFetch(`${API_BASE}/api/users/${userId}/activate`, {
        method: 'PUT',
    });
    if (!res.ok) throw new Error('Failed to activate user');
    return res.json();
}

// Audit log endpoints
export async function getAuditLogs(
    limit: number = 100,
    offset: number = 0,
    filters?: Record<string, any>
) {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                params.append(key, value.toString());
            }
        });
    }

    const res = await authenticatedFetch(
        `${API_BASE}/api/audit-logs?${params.toString()}`
    );
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`Failed to fetch audit logs: ${res.status} ${res.statusText} - ${errorData.error || ''}`);
    }
    return res.json();
}

export async function getAdminLogs(adminId: string, limit: number = 100, offset: number = 0) {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const res = await authenticatedFetch(
        `${API_BASE}/api/audit-logs/admin/${adminId}?${params.toString()}`
    );
    if (!res.ok) throw new Error('Failed to fetch admin logs');
    return res.json();
}

export async function getFailedActions(limit: number = 50) {
    const res = await authenticatedFetch(
        `${API_BASE}/api/audit-logs/failed?limit=${limit}`
    );
    if (!res.ok) throw new Error('Failed to fetch failed actions');
    return res.json();
}

// Admin contract operations (with auth)
export async function adminGetContractStatus(chainId?: number) {
    const params = new URLSearchParams();
    if (chainId) params.append('chainId', chainId.toString());

    const res = await authenticatedFetch(
        `${API_BASE}/api/admin/contract/status?${params.toString()}`
    );
    if (!res.ok) throw new Error('Failed to fetch contract status');
    return res.json();
}

export async function adminGetHouseBalance(chainId?: number) {
    const params = new URLSearchParams();
    if (chainId) params.append('chainId', chainId.toString());

    const res = await authenticatedFetch(
        `${API_BASE}/api/admin/house/balance?${params.toString()}`
    );
    if (!res.ok) throw new Error('Failed to fetch house balance');
    return res.json();
}

export async function adminWithdrawHouse(amount: number, chainId?: number) {
    const res = await authenticatedFetch(`${API_BASE}/api/admin/house/withdraw`, {
        method: 'POST',
        body: JSON.stringify({ amount, chainId }),
    });
    if (!res.ok) throw new Error('Failed to withdraw house profits');
    return res.json();
}

export async function adminFundHouse(amount: number, chainId?: number) {
    const res = await authenticatedFetch(`${API_BASE}/api/admin/house/fund`, {
        method: 'POST',
        body: JSON.stringify({ amount, chainId }),
    });
    if (!res.ok) throw new Error('Failed to fund house');
    return res.json();
}

export async function adminPauseContract(chainId?: number) {
    const res = await authenticatedFetch(`${API_BASE}/api/admin/contract/pause`, {
        method: 'POST',
        body: JSON.stringify({ chainId }),
    });
    if (!res.ok) throw new Error('Failed to pause contract');
    return res.json();
}

export async function adminUnpauseContract(chainId?: number) {
    const res = await authenticatedFetch(`${API_BASE}/api/admin/contract/unpause`, {
        method: 'POST',
        body: JSON.stringify({ chainId }),
    });
    if (!res.ok) throw new Error('Failed to unpause contract');
    return res.json();
}

export async function adminSetOperator(address: string, chainId?: number) {
    const res = await authenticatedFetch(`${API_BASE}/api/admin/contract/operator`, {
        method: 'POST',
        body: JSON.stringify({ address, chainId }),
    });
    if (!res.ok) throw new Error('Failed to set operator');
    return res.json();
}

export async function adminWithdrawETH(to: string, amount: number, chainId?: number) {
    const res = await authenticatedFetch(`${API_BASE}/api/admin/eth/withdraw`, {
        method: 'POST',
        body: JSON.stringify({ to, amount, chainId }),
    });
    if (!res.ok) throw new Error('Failed to withdraw ETH');
    return res.json();
}

// Game activity observation endpoints
export async function getAdminPlayers(limit: number = 50, offset: number = 0, search?: string) {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    if (search) params.append('search', search);

    const res = await authenticatedFetch(
        `${API_BASE}/api/admin/game/players?${params.toString()}`
    );
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`Failed to fetch players: ${res.status} ${res.statusText} - ${errorData.error || ''}`);
    }
    return res.json();
}

export async function getPlayerDetails(userId: string) {
    const res = await authenticatedFetch(`${API_BASE}/api/admin/game/players/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch player details');
    return res.json();
}

export async function getPlayerBets(userId: string, limit: number = 50, offset: number = 0) {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const res = await authenticatedFetch(
        `${API_BASE}/api/admin/game/players/${userId}/bets?${params.toString()}`
    );
    if (!res.ok) throw new Error('Failed to fetch player bets');
    return res.json();
}

export async function getRoundDetails(roundId: number) {
    const res = await authenticatedFetch(`${API_BASE}/api/admin/game/rounds/${roundId}`);
    if (!res.ok) throw new Error('Failed to fetch round details');
    return res.json();
}

export async function getGameStatistics() {
    const res = await authenticatedFetch(`${API_BASE}/api/admin/game/statistics`);
    if (!res.ok) throw new Error('Failed to fetch game statistics');
    return res.json();
}
