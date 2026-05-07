/**
 * Central constants file for magic numbers, enums, and configuration values
 */

// ============================================================================
// Game Constants
// ============================================================================

export const GAME_CONSTANTS = {
    BETTING_DURATION_MS: Number(process.env.BETTING_DURATION_MS) || 15000,
    FLYING_DURATION_MS: Number(process.env.FLYING_DURATION_MS) || 60000,
    HOUSE_EDGE: 0.03, // 3% house edge
    MIN_BET_AMOUNT: 0.01,
    MAX_BET_AMOUNT: 1000,
    MIN_CRASH_MULTIPLIER: 1.01,
    MAX_CRASH_MULTIPLIER: 100,
} as const;

// ============================================================================
// Chain Constants
// ============================================================================

export const CHAIN_CONSTANTS = {
    PROVIDER_RETRY_ATTEMPTS: 3,
    PROVIDER_RETRY_DELAY_MS: 1000,
    TRANSACTION_TIMEOUT_MS: 60000,
    BLOCK_CONFIRMATION_WAIT: 1,
} as const;

// ============================================================================
// Free Bet Constants
// ============================================================================

export const FREE_BET_CONSTANTS = {
    DEFAULT_EXPIRATION_DAYS: 7,
    MIN_MULTIPLIER_TO_CLAIM: 1.5,
} as const;

// ============================================================================
// Pagination Constants
// ============================================================================

export const PAGINATION_CONSTANTS = {
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 1000,
    DEFAULT_OFFSET: 0,
} as const;

// ============================================================================
// Admin Action Types
// ============================================================================

export enum AdminActionType {
    PAUSE_CONTRACT = 'PAUSE_CONTRACT',
    UNPAUSE_CONTRACT = 'UNPAUSE_CONTRACT',
    SET_OPERATOR = 'SET_OPERATOR',
    WITHDRAW_PROFITS = 'WITHDRAW_PROFITS',
    FUND_HOUSE = 'FUND_HOUSE',
    WITHDRAW_ETH = 'WITHDRAW_ETH',
    ALLOCATE_FREE_BETS = 'ALLOCATE_FREE_BETS',
    DEACTIVATE_USER = 'DEACTIVATE_USER',
    ACTIVATE_USER = 'ACTIVATE_USER',
    UPDATE_USER_ROLE = 'UPDATE_USER_ROLE',
    CREATE_ADMIN = 'CREATE_ADMIN',
    VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',
}

// ============================================================================
// User Roles
// ============================================================================

export enum UserRole {
    PLAYER = 'player',
    ADMIN = 'admin',
    MODERATOR = 'moderator',
}

// ============================================================================
// User Sources
// ============================================================================

export enum UserSource {
    WALLET = 'wallet',
    FARCASTER = 'farcaster',
}

// ============================================================================
// Game Phases
// ============================================================================

export enum GamePhase {
    BETTING = 'BETTING',
    FLYING = 'FLYING',
    CRASHED = 'CRASHED',
}

// ============================================================================
// HTTP Status Codes
// ============================================================================

export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Forbidden',
    NOT_FOUND: 'Resource not found',
    INVALID_INPUT: 'Invalid input provided',
    DATABASE_ERROR: 'Database error occurred',
    BLOCKCHAIN_ERROR: 'Blockchain operation failed',
    INSUFFICIENT_BALANCE: 'Insufficient balance',
    INVALID_CHAIN: 'Invalid or unsupported chain',
    ROUND_NOT_FOUND: 'Round not found',
    USER_NOT_FOUND: 'User not found',
    ADMIN_ONLY: 'Admin access required',
} as const;
