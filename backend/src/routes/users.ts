import { Router, Request, Response } from 'express';
import { userService } from '../services/user.service.js';
import { auditLogService } from '../services/audit-log.service.js';
import { authenticateTokenOrAdminSecret, requireAdmin } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';
import { AdminActionType } from '../entities/admin-log.entity.js';
import { UserRole } from '../entities/user.entity.js';

const router = Router();

/**
 * GET /api/users/address/:address
 * Get user by wallet address
 */
router.get('/address/:address', async (req: Request, res: Response) => {
    try {
        const user = await userService.getUserByAddress(req.params.address as string);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                address: user.address,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                role: user.role,
            },
        });
    } catch (error) {
        logger.error('Failed to fetch user by address', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user',
        });
    }
});

/**
 * GET /api/users/:userId
 * Get user profile (public info)
 */
router.get('/:userId', async (req: Request, res: Response) => {
    try {
        const user = await userService.getUserById(req.params.userId as string);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                address: user.address,
                farcasterId: user.farcasterId,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                role: user.role,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        logger.error('Failed to fetch user', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user',
        });
    }
});

/**
 * Admin endpoints
 */

/**
 * GET /api/users/admin/all
 * Get all users (admin only)
 */
router.get('/admin/all', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
    try {
        const users = await userService.getAllAdmins();

        res.json({
            success: true,
            users: users.map((u) => ({
                id: u.id,
                address: u.address,
                farcasterId: u.farcasterId,
                username: u.username,
                displayName: u.displayName,
                role: u.role,
                permissions: u.permissions,
                isActive: u.isActive,
                createdAt: u.createdAt,
            })),
        });
    } catch (error) {
        logger.error('Failed to fetch users', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users',
        });
    }
});

/**
 * POST /api/users/admin/create
 * Create a new admin user
 */
router.post('/admin/create', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { address, email, username, permissions } = req.body;

        if (!username) {
            return res.status(400).json({
                success: false,
                error: 'Username is required',
            });
        }

        const admin = await userService.createAdmin(address || null, email || null, username, permissions || []);

        await auditLogService.logAction(
            req.userId || null,
            AdminActionType.ADMIN_CREATED,
            `Created admin user: ${username}`,
            { adminId: admin.id, username, permissions },
            req.ipAddress
        );

        res.json({
            success: true,
            user: {
                id: admin.id,
                username: admin.username,
                role: admin.role,
                permissions: admin.permissions,
            },
        });
    } catch (error) {
        const errorMsg = (error as Error).message;
        await auditLogService.logAction(
            req.userId || null,
            AdminActionType.ADMIN_CREATED,
            'Failed to create admin',
            { username: req.body.username },
            req.ipAddress,
            undefined,
            false,
            errorMsg
        );

        logger.error('Failed to create admin', { error: errorMsg });
        res.status(500).json({
            success: false,
            error: errorMsg,
        });
    }
});

/**
 * PUT /api/users/:userId/role
 * Update user role and permissions (admin only)
 */
router.put('/:userId/role', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { role, permissions } = req.body;

        if (!role || !Object.values(UserRole).includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role',
            });
        }

        const user = await userService.updateUserRole(req.params.userId as string, role, permissions || []);

        await auditLogService.logAction(
            req.userId || null,
            AdminActionType.USER_ROLE_CHANGED,
            `Changed user ${user.id} role to ${role}`,
            { userId: user.id, role, permissions },
            req.ipAddress
        );

        res.json({
            success: true,
            user: {
                id: user.id,
                role: user.role,
                permissions: user.permissions,
            },
        });
    } catch (error) {
        logger.error('Failed to update user role', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to update user role',
        });
    }
});

/**
 * PUT /api/users/:userId/deactivate
 * Deactivate user (admin only)
 */
router.put('/:userId/deactivate', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
    try {
        const user = await userService.deactivateUser(req.params.userId as string);

        await auditLogService.logAction(
            req.userId || null,
            AdminActionType.USER_UPDATED,
            `Deactivated user ${user.id}`,
            { userId: user.id },
            req.ipAddress
        );

        res.json({
            success: true,
            user: {
                id: user.id,
                isActive: user.isActive,
            },
        });
    } catch (error) {
        logger.error('Failed to deactivate user', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to deactivate user',
        });
    }
});

/**
 * PUT /api/users/:userId/activate
 * Activate user (admin only)
 */
router.put('/:userId/activate', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
    try {
        const user = await userService.activateUser(req.params.userId as string);

        await auditLogService.logAction(
            req.userId || null,
            AdminActionType.USER_UPDATED,
            `Activated user ${user.id}`,
            { userId: user.id },
            req.ipAddress
        );

        res.json({
            success: true,
            user: {
                id: user.id,
                isActive: user.isActive,
            },
        });
    } catch (error) {
        logger.error('Failed to activate user', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to activate user',
        });
    }
});

/**
 * POST /api/users/:userId/block
 * Block a user (admin only)
 */
router.post('/:userId/block', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: 'Block reason is required',
            });
        }

        const user = await userService.blockUser(req.params.userId as string, reason);

        await auditLogService.logAction(
            req.userId || null,
            AdminActionType.USER_BLOCKED,
            `Blocked user ${user.id}`,
            { userId: user.id, reason },
            req.ipAddress
        );

        res.json({
            success: true,
            user: {
                id: user.id,
                isBlocked: user.isBlocked,
                blockedAt: user.blockedAt,
                blockReason: user.blockReason,
            },
        });
    } catch (error) {
        logger.error('Failed to block user', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to block user',
        });
    }
});

/**
 * POST /api/users/:userId/unblock
 * Unblock a user (admin only)
 */
router.post('/:userId/unblock', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
    try {
        const user = await userService.unblockUser(req.params.userId as string);

        await auditLogService.logAction(
            req.userId || null,
            AdminActionType.USER_UNBLOCKED,
            `Unblocked user ${user.id}`,
            { userId: user.id },
            req.ipAddress
        );

        res.json({
            success: true,
            user: {
                id: user.id,
                isBlocked: user.isBlocked,
            },
        });
    } catch (error) {
        logger.error('Failed to unblock user', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to unblock user',
        });
    }
});

/**
 * POST /api/users/:userId/suspend
 * Suspend a user temporarily (admin only)
 */
router.post('/:userId/suspend', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { durationDays, reason } = req.body;

        if (!durationDays || durationDays <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Duration in days is required and must be positive',
            });
        }

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: 'Suspension reason is required',
            });
        }

        const user = await userService.suspendUser(req.params.userId as string, durationDays, reason);

        await auditLogService.logAction(
            req.userId || null,
            AdminActionType.USER_SUSPENDED,
            `Suspended user ${user.id} for ${durationDays} days`,
            { userId: user.id, durationDays, reason },
            req.ipAddress
        );

        res.json({
            success: true,
            user: {
                id: user.id,
                isSuspended: user.isSuspended,
                suspendedAt: user.suspendedAt,
                suspensionExpiresAt: user.suspensionExpiresAt,
                suspensionReason: user.suspensionReason,
            },
        });
    } catch (error) {
        logger.error('Failed to suspend user', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to suspend user',
        });
    }
});

/**
 * POST /api/users/:userId/unsuspend
 * Unsuspend a user (admin only)
 */
router.post('/:userId/unsuspend', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
    try {
        const user = await userService.unsuspendUser(req.params.userId as string);

        await auditLogService.logAction(
            req.userId || null,
            AdminActionType.USER_UNSUSPENDED,
            `Unsuspended user ${user.id}`,
            { userId: user.id },
            req.ipAddress
        );

        res.json({
            success: true,
            user: {
                id: user.id,
                isSuspended: user.isSuspended,
            },
        });
    } catch (error) {
        logger.error('Failed to unsuspend user', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to unsuspend user',
        });
    }
});

/**
 * POST /api/users/:userId/bet-limits/daily
 * Set daily bet limit (admin only)
 */
router.post('/:userId/bet-limits/daily', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { limit } = req.body;

        if (limit === undefined || limit < 0) {
            return res.status(400).json({
                success: false,
                error: 'Limit must be a non-negative number',
            });
        }

        const user = await userService.setDailyBetLimit(req.params.userId as string, limit);

        await auditLogService.logAction(
            req.userId || null,
            AdminActionType.USER_BET_LIMIT_SET,
            `Set daily bet limit for user ${user.id} to ${limit}`,
            { userId: user.id, limitType: 'daily', limit },
            req.ipAddress
        );

        res.json({
            success: true,
            user: {
                id: user.id,
                dailyBetLimit: user.dailyBetLimit,
            },
        });
    } catch (error) {
        logger.error('Failed to set daily bet limit', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to set daily bet limit',
        });
    }
});

/**
 * POST /api/users/:userId/bet-limits/weekly
 * Set weekly bet limit (admin only)
 */
router.post('/:userId/bet-limits/weekly', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { limit } = req.body;

        if (limit === undefined || limit < 0) {
            return res.status(400).json({
                success: false,
                error: 'Limit must be a non-negative number',
            });
        }

        const user = await userService.setWeeklyBetLimit(req.params.userId as string, limit);

        await auditLogService.logAction(
            req.userId || null,
            AdminActionType.USER_BET_LIMIT_SET,
            `Set weekly bet limit for user ${user.id} to ${limit}`,
            { userId: user.id, limitType: 'weekly', limit },
            req.ipAddress
        );

        res.json({
            success: true,
            user: {
                id: user.id,
                weeklyBetLimit: user.weeklyBetLimit,
            },
        });
    } catch (error) {
        logger.error('Failed to set weekly bet limit', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to set weekly bet limit',
        });
    }
});

/**
 * POST /api/users/:userId/bet-limits/monthly
 * Set monthly bet limit (admin only)
 */
router.post('/:userId/bet-limits/monthly', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { limit } = req.body;

        if (limit === undefined || limit < 0) {
            return res.status(400).json({
                success: false,
                error: 'Limit must be a non-negative number',
            });
        }

        const user = await userService.setMonthlyBetLimit(req.params.userId as string, limit);

        await auditLogService.logAction(
            req.userId || null,
            AdminActionType.USER_BET_LIMIT_SET,
            `Set monthly bet limit for user ${user.id} to ${limit}`,
            { userId: user.id, limitType: 'monthly', limit },
            req.ipAddress
        );

        res.json({
            success: true,
            user: {
                id: user.id,
                monthlyBetLimit: user.monthlyBetLimit,
            },
        });
    } catch (error) {
        logger.error('Failed to set monthly bet limit', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to set monthly bet limit',
        });
    }
});

/**
 * DELETE /api/users/:userId/bet-limits
 * Remove all bet limits (admin only)
 */
router.delete('/:userId/bet-limits', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
    try {
        const user = await userService.removeBetLimits(req.params.userId as string);

        await auditLogService.logAction(
            req.userId || null,
            AdminActionType.USER_BET_LIMIT_SET,
            `Removed all bet limits for user ${user.id}`,
            { userId: user.id },
            req.ipAddress
        );

        res.json({
            success: true,
            user: {
                id: user.id,
                dailyBetLimit: user.dailyBetLimit,
                weeklyBetLimit: user.weeklyBetLimit,
                monthlyBetLimit: user.monthlyBetLimit,
            },
        });
    } catch (error) {
        logger.error('Failed to remove bet limits', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to remove bet limits',
        });
    }
});

/**
 * GET /api/users/:userId/restrictions
 * Get user restrictions and limits (admin only)
 */
router.get('/:userId/restrictions', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
    try {
        const user = await userService.getUserById(req.params.userId as string);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        res.json({
            success: true,
            restrictions: {
                isBlocked: user.isBlocked,
                blockedAt: user.blockedAt,
                blockReason: user.blockReason,
                isSuspended: user.isSuspended,
                suspendedAt: user.suspendedAt,
                suspensionExpiresAt: user.suspensionExpiresAt,
                suspensionReason: user.suspensionReason,
                dailyBetLimit: user.dailyBetLimit,
                weeklyBetLimit: user.weeklyBetLimit,
                monthlyBetLimit: user.monthlyBetLimit,
                dailyBetAmount: user.dailyBetAmount,
                weeklyBetAmount: user.weeklyBetAmount,
                monthlyBetAmount: user.monthlyBetAmount,
            },
        });
    } catch (error) {
        logger.error('Failed to get user restrictions', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to get user restrictions',
        });
    }
});

export default router;
