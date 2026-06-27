/**
 * Central export file for all TypeScript types and interfaces
 * This file consolidates types from across the application for easier imports
 */

// ============================================================================
// Game Types
// ============================================================================

export type GamePhase = "BETTING" | "FLYING" | "CRASHED";

export interface PlayerBet {
    id?: number;
    address: string;
    amount: number;
    cashedOut: boolean;
    cashoutMultiplier: number | null;
    payout: number | null;
    status?: "PENDING" | "VALIDATED" | "FAILED";
    validationError?: string | null;
    txHash?: string | null;
    autoCashoutMultiplier?: number | null;
}

export interface RoundData {
    roundId: number;
    phase: GamePhase;
    startTime: number;
    flyStartTime: number | null;
    crashMultiplier: number | null;
    currentMultiplier: number;
    serverSeed?: string;
    serverSeedHash?: string;
    totalBets: number;
    totalPayouts: number;
    settled: boolean;
    players: PlayerBet[];
    planePosition?: { x: number; y: number };
    serverTime?: number;
    minBetAmount?: number;
    maxBetAmount?: number;
    roundRestartDelayMs?: number;
    bettingDurationMs?: number;
    bettingLockMs?: number;
    flyingDurationMs?: number;
    houseEdge?: number;
    minCrashMultiplier?: number;
    maxCrashMultiplier?: number;
}

export interface GameHistory {
    roundId: number;
    crashMultiplier: number;
    timestamp: number;
    totalBets: number;
    totalPayouts: number;
    winnersCount: number;
}

export interface LeaderboardEntry {
    address: string;
    username?: string | null;
    totalWagered: number;
    totalWon: number;
    gamesPlayed: number;
    biggestWin: number;
    biggestMultiplier: number;
}

export interface PlaneState {
    x: number;
    y: number;
    ts: number;
    angle?: number;
}

// ============================================================================
// User & Auth Types
// ============================================================================

export enum UserRole {
    PLAYER = "player",
    ADMIN = "admin",
    MODERATOR = "moderator",
}

export enum UserSource {
    WALLET = "wallet",
    FARCASTER = "farcaster",
}

export interface User {
    id: string;
    address?: string;
    farcasterId?: number;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    email?: string;
    role: UserRole;
    permissions: string[];
    isActive: boolean;
    createdAt: string;
}

export interface AuthUser extends User {
    // AuthUser is an alias for User in auth context
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface AdminLog {
    id: string;
    adminId?: string;
    actionType: string;
    description?: string;
    details: Record<string, any>;
    ipAddress?: string;
    chainId?: number;
    success: boolean;
    errorMessage?: string;
    createdAt: string;
}

// ============================================================================
// Context Types
// ============================================================================

export interface GameContextType {
    roundData: RoundData | null;
    gameHistory: GameHistory[];
    leaderboard: LeaderboardEntry[];
    isConnected: boolean;
    error: string | null;
    displayMultiplier: number;
    optimisticBets: Array<PlayerBet & { roundId?: number }>;
    placeBet: (
        address: string,
        amount: number,
        useFreeBet?: boolean,
        autoCashoutMultiplier?: number,
    ) => Promise<{ success: boolean; error?: string; txHash?: string; betId?: number }>;
    cashOut: (betId: number) => Promise<{ success: boolean; error?: string }>;
    reconnect: () => void;
    disconnect: () => void;
}

export interface AuthContextType {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    tokens: AuthTokens | null;

    // Auth methods
    loginWithWallet: (address: string) => Promise<void>;
    loginWithFarcaster: (
        farcasterId: number,
        username: string,
        displayName: string,
        avatarUrl?: string,
        bio?: string,
        address?: string,
    ) => Promise<void>;
    refreshToken: () => Promise<void>;
    logout: () => Promise<void>;
    updateProfile: (updates: Partial<AuthUser>) => Promise<void>;

    // Permission checks
    hasPermission: (permission: string) => boolean;
    hasAnyPermission: (permissions: string[]) => boolean;
    isAdmin: () => boolean;
}

// ============================================================================
// Re-export from individual files for backward compatibility
// ============================================================================

export * from "./game";
export * from "./user";
