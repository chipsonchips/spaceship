import { Router, Request, Response } from 'express';
import { freeBetService } from '../services/free-bet.service.js';
import { auditLogService } from '../services/audit-log.service.js';
import { authenticateTokenOrAdminSecret, requireAdmin } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';
import { AdminActionType } from '../entities/admin-log.entity.js';
import { AppDataSource } from '../config/database.js';
import { User } from '../entities/user.entity.js';

const router = Router();

/**
 * GET /api/free-bets/user/:userId
 * Get free bets info for a user (public)
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
    try {
        const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
        const remaining = await freeBetService.getFreeBetsRemaining(userId);
        const maxAmount = await freeBetService.getFreeBetMaxAmount(userId);

        // Get user to check expiration
        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { id: userId } });
        const expiresAt = user?.freeBetsExpiresAt || null;
        const isExpired = expiresAt ? new Date() > expiresAt : false;

        res.json({
            success: true,
            freeBetsRemaining: remaining,
            freeBetMaxAmount: maxAmount,
            expiresAt,
            isExpired,
        });
    } catch (error) {
        logger.error('Failed to get free bets info', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to get free bets info',
        });
    }
});

/**
 * GET /api/free-bets/history/:userId
 * Get free bet history for a user (public)
 */
router.get('/history/:userId', async (req: Request, res: Response) => {
    try {
        const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
        const history = await freeBetService.getFreeBetHistory(userId, limit);

        res.json({
            success: true,
            history,
        });
    } catch (error) {
        logger.error('Failed to get free bet history', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to get free bet history',
        });
    }
});

/**
 * POST /api/free-bets/admin/add
 * Add free bets to a user (admin only)
 */
router.post('/admin/add', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { userId, count } = req.body;

        if (!userId || !count || count <= 0) {
            return res.status(400).json({
                success: false,
                error: 'userId and count (positive number) are required',
            });
        }

        const user = await freeBetService.addFreeBets(userId, count);

        // Log admin action
        await auditLogService.logAction(
            req.userId || null,
            AdminActionType.SETTINGS_CHANGED,
            `Added ${count} free bets to user ${userId}`,
            { userId, count, newTotal: user.freeBetsRemaining },
            req.ip || null
        );

        res.json({
            success: true,
            message: `Added ${count} free bets to user`,
            freeBetsRemaining: user.freeBetsRemaining,
        });
    } catch (error) {
        logger.error('Failed to add free bets', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to add free bets',
        });
    }
});

/**
 * POST /api/free-bets/admin/set
 * Set free bets for a user (admin only)
 */
router.post('/admin/set', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { userId, count } = req.body;

        if (!userId || count === undefined || count < 0) {
            return res.status(400).json({
                success: false,
                error: 'userId and count (non-negative number) are required',
            });
        }

        const user = await freeBetService.setFreeBets(userId, count);

        // Log admin action
        await auditLogService.logAction(
            req.userId || null,
            AdminActionType.SETTINGS_CHANGED,
            `Set free bets for user ${userId} to ${count}`,
            { userId, count },
            req.ip || null
        );

        res.json({
            success: true,
            message: `Set free bets for user to ${count}`,
            freeBetsRemaining: user.freeBetsRemaining,
        });
    } catch (error) {
        logger.error('Failed to set free bets', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to set free bets',
        });
    }
});

/**
 * POST /api/free-bets/admin/set-max-amount
 * Set free bet max amount for a user (admin only)
 */
router.post('/admin/set-max-amount', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { userId, maxAmount } = req.body;

        if (!userId || !maxAmount || maxAmount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'userId and maxAmount (positive number) are required',
            });
        }

        const user = await freeBetService.setFreeBetMaxAmount(userId, maxAmount);

        // Log admin action
        await auditLogService.logAction(
            req.userId || null,
            AdminActionType.SETTINGS_CHANGED,
            `Set free bet max amount for user ${userId} to ${maxAmount}`,
            { userId, maxAmount },
            req.ip || null
        );

        res.json({
            success: true,
            message: `Set free bet max amount to ${maxAmount}`,
            freeBetMaxAmount: user.freeBetMaxAmount,
        });
    } catch (error) {
        logger.error('Failed to set free bet max amount', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to set free bet max amount',
        });
    }
});

/**
 * GET /api/free-bets/admin/users-with-free-bets
 * Get all users with remaining free bets (admin only)
 */
router.get('/admin/users-with-free-bets', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
    try {
        const users = await freeBetService.getUsersWithFreeBets();

        res.json({
            success: true,
            users: users.map(u => ({
                id: u.id,
                address: u.address,
                username: u.username,
                freeBetsRemaining: u.freeBetsRemaining,
                freeBetMaxAmount: u.freeBetMaxAmount,
                createdAt: u.createdAt,
            })),
        });
    } catch (error) {
        logger.error('Failed to get users with free bets', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to get users with free bets',
        });
    }
});

/**
 * POST /api/free-bets/admin/assign-bulk
 * Assign free bets to multiple users (admin only)
 */
router.post('/admin/assign-bulk', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { userIds, count } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'userIds array is required and must not be empty',
            });
        }

        if (!count || count <= 0) {
            return res.status(400).json({
                success: false,
                error: 'count (positive number) is required',
            });
        }

        const results = {
            successful: 0,
            failed: 0,
            errors: [] as { userId: string; error: string }[],
        };

        for (const userId of userIds) {
            try {
                await freeBetService.addFreeBets(userId, count);
                results.successful++;
            } catch (error) {
                results.failed++;
                results.errors.push({
                    userId,
                    error: (error as Error).message,
                });
            }
        }

        // Log admin action
        await auditLogService.logAction(
            req.userId || null,
            AdminActionType.FREE_BET_ASSIGNED,
            `Assigned ${count} free bets to ${results.successful} users`,
            { userIds, count, results },
            req.ip || null
        );

        res.json({
            success: true,
            message: `Assigned free bets to ${results.successful} users`,
            results,
        });
    } catch (error) {
        logger.error('Failed to assign bulk free bets', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to assign bulk free bets',
        });
    }
});

/**
 * POST /api/free-bets/admin/set-bulk
 * Set free bets for multiple users (admin only)
 */
router.post('/admin/set-bulk', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { userIds, count } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'userIds array is required and must not be empty',
            });
        }

        if (count === undefined || count < 0) {
            return res.status(400).json({
                success: false,
                error: 'count (non-negative number) is required',
            });
        }

        const results = {
            successful: 0,
            failed: 0,
            errors: [] as { userId: string; error: string }[],
        };

        for (const userId of userIds) {
            try {
                await freeBetService.setFreeBets(userId, count);
                results.successful++;
            } catch (error) {
                results.failed++;
                results.errors.push({
                    userId,
                    error: (error as Error).message,
                });
            }
        }

        // Log admin action
        await auditLogService.logAction(
            req.userId || null,
            AdminActionType.FREE_BET_ASSIGNED,
            `Set free bets to ${count} for ${results.successful} users`,
            { userIds, count, results },
            req.ip || null
        );

        res.json({
            success: true,
            message: `Set free bets for ${results.successful} users`,
            results,
        });
    } catch (error) {
        logger.error('Failed to set bulk free bets', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to set bulk free bets',
        });
    }
});

export default router;
