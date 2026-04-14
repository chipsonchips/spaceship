import { Router, Request, Response } from 'express';
import { userService } from '../services/user.service.js';
import { auditLogService } from '../services/audit-log.service.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';
import { AdminActionType } from '../entities/admin-log.entity.js';
import { UserRole } from '../entities/user.entity.js';

const router = Router();

/**
 * GET /api/users/:userId
 * Get user profile (public info)
 */
router.get('/:userId', async (req: Request, res: Response) => {
    try {
        const user = await userService.getUserById(req.params.userId);

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
 * GET /api/users/address/:address
 * Get user by wallet address
 */
router.get('/address/:address', async (req: Request, res: Response) => {
    try {
        const user = await userService.getUserByAddress(req.params.address);

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
 * Admin endpoints
 */

/**
 * GET /api/users/admin/all
 * Get all users (admin only)
 */
router.get('/admin/all', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
        const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
        const offset = parseInt(req.query.offset as string) || 0;

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
router.post('/admin/create', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
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
            req.userId,
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
            req.userId,
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
router.put('/:userId/role', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { role, permissions } = req.body;

        if (!role || !Object.values(UserRole).includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role',
            });
        }

        const user = await userService.updateUserRole(req.params.userId, role, permissions || []);

        await auditLogService.logAction(
            req.userId,
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
router.put('/:userId/deactivate', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
        const user = await userService.deactivateUser(req.params.userId);

        await auditLogService.logAction(
            req.userId,
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
router.put('/:userId/activate', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
        const user = await userService.activateUser(req.params.userId);

        await auditLogService.logAction(
            req.userId,
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

export default router;
