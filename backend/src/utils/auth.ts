import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, UserRole } from '../entities/user.entity.js';

const JWT_SECRET = (process.env.JWT_SECRET || 'your-secret-key-change-in-production') as string;
const JWT_EXPIRY = (process.env.JWT_EXPIRY || '24h') as string | number;
const REFRESH_TOKEN_EXPIRY = (process.env.REFRESH_TOKEN_EXPIRY || '7d') as string | number;

export interface JWTPayload {
    userId: string;
    address?: string;
    farcasterId?: number;
    role: UserRole;
    permissions: string[];
    iat?: number;
    exp?: number;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(user: User): string {
    const payload: JWTPayload = {
        userId: user.id,
        address: user.address || undefined,
        farcasterId: user.farcasterId || undefined,
        role: user.role,
        permissions: user.permissions,
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRY as any,
    });
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(user: User): string {
    const payload = {
        userId: user.id,
        type: 'refresh',
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRY as any,
    });
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokens(user: User): AuthTokens {
    try {
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Parse expiry time
        const decoded = jwt.decode(accessToken) as any;
        if (!decoded || !decoded.exp || !decoded.iat) {
            console.error('Failed to decode access token:', { decoded });
            // Fallback to 24 hours
            return {
                accessToken,
                refreshToken,
                expiresIn: 86400000,
            };
        }

        const expiresIn = (decoded.exp - decoded.iat) * 1000;

        return {
            accessToken,
            refreshToken,
            expiresIn,
        };
    } catch (error) {
        console.error('generateTokens error:', error);
        throw error;
    }
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
        return null;
    }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): { userId: string; type: string } | null {
    try {
        return jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
        return null;
    }
}

/**
 * Generate a secure random token (for verification, password reset, etc.)
 */
export function generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a token for storage
 */
export function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify admin secret (legacy support)
 */
export function verifyAdminSecret(providedSecret: string): boolean {
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret) return false;
    return providedSecret === adminSecret;
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }

    return parts[1];
}

/**
 * Check if user has permission
 */
export function hasPermission(payload: JWTPayload, permission: string): boolean {
    if (payload.role === UserRole.ADMIN) return true;
    return payload.permissions.includes(permission);
}

/**
 * Check if user has any of the permissions
 */
export function hasAnyPermission(payload: JWTPayload, permissions: string[]): boolean {
    if (payload.role === UserRole.ADMIN) return true;
    return permissions.some((p) => payload.permissions.includes(p));
}

/**
 * Check if user has all permissions
 */
export function hasAllPermissions(payload: JWTPayload, permissions: string[]): boolean {
    if (payload.role === UserRole.ADMIN) return true;
    return permissions.every((p) => payload.permissions.includes(p));
}
