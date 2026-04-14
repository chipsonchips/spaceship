import { Router, Request, Response } from 'express';
import { auditLogService } from '../services/audit-log.service.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';
import { AdminActionType } from '../entities/admin-log.entity.js';

const router = Router();

// All audit log endpoints require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/audit-logs
 * Get all audit logs with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
        const offset = parseInt(req.query.offset as string) || 0;

        const filters: any = {};

        if (req.query.adminId) {
            filters.adminId = req.query.adminId as string;
        }

        if (req.query.actionType) {
            filters.actionType = req.query.actionType as AdminActionType;
        }

        if (req.query.chainId) {
            filters.chainId = parseInt(req.query.chainId as string);
        }

        if (req.query.startDate) {
            filters.startDate = new Date(req.query.startDate as string);
        }

        if (req.query.endDate) {
            filters.endDate = new Date(req.query.endDate as string);
        }

        if (req.query.successOnly === 'true') {
            filters.successOnly = true;
        }

        const { logs, total } = await auditLogService.getAllLogs(filters, limit, offset);

        res.json({
            success: true,
            logs: logs.map((log) => ({
                id: log.id,
                adminId: log.adminId,
                actionType: log.actionType,
                description: log.description,
                details: log.details,
                ipAddress: log.ipAddress,
                chainId: log.chainId,
                success: log.success,
                errorMessage: log.errorMessage,
                createdAt: log.createdAt,
            })),
            pagination: {
                total,
                limit,
                offset,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        logger.error('Failed to fetch audit logs', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch audit logs',
        });
    }
});

/**
 * GET /api/audit-logs/admin/:adminId
 * Get logs for a specific admin
 */
router.get('/admin/:adminId', async (req: Request, res: Response) => {
    try {
        const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
        const offset = parseInt(req.query.offset as string) || 0;

        const { logs, total } = await auditLogService.getAdminLogs(req.params.adminId as string, limit, offset);

        res.json({
            success: true,
            logs: logs.map((log) => ({
                id: log.id,
                actionType: log.actionType,
                description: log.description,
                details: log.details,
                success: log.success,
                createdAt: log.createdAt,
            })),
            pagination: {
                total,
                limit,
                offset,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        logger.error('Failed to fetch admin logs', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch admin logs',
        });
    }
});

/**
 * GET /api/audit-logs/action/:actionType
 * Get logs by action type
 */
router.get('/action/:actionType', async (req: Request, res: Response) => {
    try {
        const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
        const offset = parseInt(req.query.offset as string) || 0;

        const { logs, total } = await auditLogService.getLogsByActionType(
            req.params.actionType as AdminActionType,
            limit,
            offset
        );

        res.json({
            success: true,
            logs: logs.map((log) => ({
                id: log.id,
                adminId: log.adminId,
                actionType: log.actionType,
                description: log.description,
                details: log.details,
                success: log.success,
                createdAt: log.createdAt,
            })),
            pagination: {
                total,
                limit,
                offset,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        logger.error('Failed to fetch logs by action type', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch logs',
        });
    }
});

/**
 * GET /api/audit-logs/chain/:chainId
 * Get logs for a specific chain
 */
router.get('/chain/:chainId', async (req: Request, res: Response) => {
    try {
        const chainId = parseInt(req.params.chainId as string);
        const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
        const offset = parseInt(req.query.offset as string) || 0;

        const { logs, total } = await auditLogService.getChainLogs(chainId, limit, offset);

        res.json({
            success: true,
            logs: logs.map((log) => ({
                id: log.id,
                adminId: log.adminId,
                actionType: log.actionType,
                description: log.description,
                details: log.details,
                success: log.success,
                createdAt: log.createdAt,
            })),
            pagination: {
                total,
                limit,
                offset,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        logger.error('Failed to fetch chain logs', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch logs',
        });
    }
});

/**
 * GET /api/audit-logs/failed
 * Get recent failed actions
 */
router.get('/failed', async (req: Request, res: Response) => {
    try {
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);

        const logs = await auditLogService.getFailedActions(limit);

        res.json({
            success: true,
            logs: logs.map((log) => ({
                id: log.id,
                adminId: log.adminId,
                actionType: log.actionType,
                description: log.description,
                errorMessage: log.errorMessage,
                details: log.details,
                createdAt: log.createdAt,
            })),
        });
    } catch (error) {
        logger.error('Failed to fetch failed actions', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch failed actions',
        });
    }
});

export default router;
