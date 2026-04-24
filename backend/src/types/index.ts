/**
 * Central export file for all TypeScript types and interfaces
 * This file consolidates types from across the application for easier imports
 */

// ============================================================================
// Game Types
// ============================================================================

export type GamePhase = 'BETTING' | 'FLYING' | 'CRASHED';

export interface GameRoundData {
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
    players: PlayerBetData[];
    planePosition: { x: number; y: number };
}

export interface PlayerBetData {
    id?: number;
    address: string;
    amount: number;
    cashedOut: boolean;
    cashoutMultiplier: number | null;
    payout: number | null;
    txHash?: string | null;
    autoCashoutMultiplier?: number | null;
}

// ============================================================================
// Auth Types
// ============================================================================

export interface JWTPayload {
    userId: string;
    address?: string;
    farcasterId?: number;
    role: string;
    iat?: number;
    exp?: number;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class AppError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public code?: string
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export interface ErrorResponse {
    success: false;
    error: string;
    code?: string;
    statusCode: number;
}
