/**
 * Central constants file for magic numbers, enums, and configuration values
 */

// ============================================================================
// Game Constants
// ============================================================================

export const GAME_CONSTANTS = {
    BETTING_DURATION_MS: Number(process.env.BETTING_DURATION_MS) || 10000,
    ROUND_RESTART_DELAY_MS: Number(process.env.ROUND_RESTART_DELAY_MS) || 5000,
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
    HOUSE_WITHDRAW = 'house_withdraw',
    HOUSE_FUND = 'house_fund',
    CONTRACT_PAUSE = 'contract_pause',
    CONTRACT_UNPAUSE = 'contract_unpause',
    OPERATOR_SET = 'operator_set',
    ETH_WITHDRAW = 'eth_withdraw',
    USER_CREATED = 'user_created',
    USER_UPDATED = 'user_updated',
    USER_DELETED = 'user_deleted',
    USER_ROLE_CHANGED = 'user_role_changed',
    ADMIN_CREATED = 'admin_created',
    ADMIN_DELETED = 'admin_deleted',
    SETTINGS_CHANGED = 'settings_changed',
    USER_BLOCKED = 'user_blocked',
    USER_UNBLOCKED = 'user_unblocked',
    USER_SUSPENDED = 'user_suspended',
    USER_UNSUSPENDED = 'user_unsuspended',
    USER_BET_LIMIT_SET = 'user_bet_limit_set',
    FREE_BET_ASSIGNED = 'free_bet_assigned',
    SECURITY_ALERT = 'security_alert',
    SEED_ACCESSED = 'seed_accessed',
    SUSPICIOUS_ACTIVITY = 'suspicious_activity',
    VIEW_AUDIT_LOGS = 'view_audit_logs',
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
