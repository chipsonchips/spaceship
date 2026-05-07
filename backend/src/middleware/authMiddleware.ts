import { Request, Response, NextFunction } from 'express';
import {
    extractTokenFromHeader,
    verifyToken,
    JWTPayload,
    verifyAdminSecret,
} from '../utils/auth.js';
import { logger } from '../utils/logger.js';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: JWTPayload;
            userId?: string;
            ipAddress?: string;
        }
    }
}

/**
 * Extract IP address from request
 */
function getClientIp(req: Request): string {
    return (
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        req.socket.remoteAddress ||
        'unknown'
    );
}

/**
 * Middleware to authenticate JWT token
 */
export function authenticateToken(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
        res.status(401).json({
            success: false,
            error: 'Missing authentication token',
        });
        return;
    }

    const payload = verifyToken(token);
    if (!payload) {
        res.status(401).json({
            success: false,
            error: 'Invalid or expired token',
        });
        return;
    }

    req.user = payload;
    req.userId = payload.userId;
    req.ipAddress = getClientIp(req);

    next();
}

/**
 * Middleware to verify admin role
 */
export function requireAdmin(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    if (!req.user) {
        logger.error('requireAdmin: No user object found in request', {
            method: req.method,
            path: req.path,
            headers: {
                authorization: req.headers.authorization ? 'present' : 'missing',
                'x-admin-secret': req.headers['x-admin-secret'] ? 'present' : 'missing',
            },
        });
        res.status(401).json({
            success: false,
            error: 'Authentication required',
        });
        return;
    }

    if ((req.user.role as string) !== 'admin') {
        logger.warn(`Unauthorized admin access attempt by user ${req.user.userId}`, {
            ip: req.ipAddress,
            userRole: req.user.role,
            method: req.method,
            path: req.path,
        });
        res.status(403).json({
            success: false,
            error: 'Admin access required',
        });
        return;
    }

    next();
}

/**
 * Middleware to verify specific permission
 */
export function requirePermission(permission: string) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required',
            });
            return;
        }

        // Admins have all permissions
        if ((req.user.role as string) === 'admin') {
            next();
            return;
        }

        if (!req.user.permissions.includes(permission)) {
            logger.warn(
                `Unauthorized permission access by user ${req.user.userId}: ${permission}`,
                { ip: req.ipAddress }
            );
            res.status(403).json({
                success: false,
                error: `Permission required: ${permission}`,
            });
            return;
        }

        next();
    };
}

/**
 * Middleware to verify any of multiple permissions
 */
export function requireAnyPermission(permissions: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required',
            });
            return;
        }

        // Admins have all permissions
        if ((req.user.role as string) === 'admin') {
            next();
            return;
        }

        if (!permissions.some((p) => req.user!.permissions.includes(p))) {
            logger.warn(
                `Unauthorized permission access by user ${req.user.userId}: ${permissions.join(', ')}`,
                { ip: req.ipAddress }
            );
            res.status(403).json({
                success: false,
                error: `One of these permissions required: ${permissions.join(', ')}`,
            });
            return;
        }

        next();
    };
}

/**
 * Middleware to support both JWT and legacy admin secret
 * Used for backward compatibility during migration
 */
export function authenticateTokenOrAdminSecret(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers.authorization;
    const adminSecretHeader = req.headers['x-admin-secret'] as string;

    logger.info('authenticateTokenOrAdminSecret: Checking authentication', {
        method: req.method,
        path: req.path,
        hasAuthHeader: !!authHeader,
        hasAdminSecretHeader: !!adminSecretHeader,
        authHeaderPrefix: authHeader?.substring(0, 10),
    });

    // Try admin secret from header FIRST (Root override)
    if (adminSecretHeader) {
        logger.info('authenticateTokenOrAdminSecret: Found x-admin-secret header');
        if (verifyAdminSecret(adminSecretHeader)) {
            logger.info('authenticateTokenOrAdminSecret: Admin secret verified successfully');
            // Create a synthetic admin payload
            req.user = {
                userId: 'legacy-admin',
                role: 'admin' as any,
                permissions: [],
            };
            req.userId = 'legacy-admin';
            req.ipAddress = getClientIp(req);
            next();
            return;
        }
        logger.warn('authenticateTokenOrAdminSecret: Admin secret verification failed');
    }

    // Try JWT next
    const token = extractTokenFromHeader(authHeader);
    if (token) {
        logger.info('authenticateTokenOrAdminSecret: Found JWT token');
        const payload = verifyToken(token);
        if (payload) {
            logger.info('authenticateTokenOrAdminSecret: JWT token verified successfully');
            req.user = payload;
            req.userId = payload.userId;
            req.ipAddress = getClientIp(req);
            next();
            return;
        }
        logger.warn('authenticateTokenOrAdminSecret: JWT token verification failed');
    }

    // Fall back to Bearer token as admin secret (legacy)
    if (authHeader && authHeader.startsWith('Bearer ')) {
        logger.info('authenticateTokenOrAdminSecret: Trying Bearer token as admin secret');
        const secret = authHeader.substring(7);
        if (verifyAdminSecret(secret)) {
            logger.info('authenticateTokenOrAdminSecret: Bearer token verified as admin secret');
            // Create a synthetic admin payload
            req.user = {
                userId: 'legacy-admin',
                role: 'admin' as any,
                permissions: [],
            };
            req.userId = 'legacy-admin';
            req.ipAddress = getClientIp(req);
            next();
            return;
        }
        logger.warn('authenticateTokenOrAdminSecret: Bearer token not valid as admin secret');
    }

    logger.error('authenticateTokenOrAdminSecret: All authentication methods failed', {
        method: req.method,
        path: req.path,
        hasAuthHeader: !!authHeader,
        hasAdminSecretHeader: !!adminSecretHeader,
        authHeaderLength: authHeader?.length || 0,
    });

    res.status(401).json({
        success: false,
        error: 'Invalid authentication credentials',
    });
}

/**
 * Middleware to optionally authenticate (doesn't fail if no token)
 */
export function optionalAuth(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
        const payload = verifyToken(token);
        if (payload) {
            req.user = payload;
            req.userId = payload.userId;
        }
    }

    req.ipAddress = getClientIp(req);
    next();
}
