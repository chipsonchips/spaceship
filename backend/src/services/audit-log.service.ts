import { AppDataSource } from '../config/database.js';
import { AdminLog, AdminActionType } from '../entities/admin-log.entity.js';
import { logger } from '../utils/logger.js';
import { Repository } from 'typeorm';

export class AuditLogService {
    private logRepo: Repository<AdminLog> | null = null;

    private getRepo(): Repository<AdminLog> {
        if (!this.logRepo) {
            this.logRepo = AppDataSource.getRepository(AdminLog);
        }
        return this.logRepo;
    }

    /**
     * Log an admin action
     */
    async logAction(
        adminId: string | null,
        actionType: AdminActionType,
        description: string | null,
        details: Record<string, unknown> = {},
        ipAddress: string | null = null,
        chainId: number | null = null,
        success: boolean = true,
        errorMessage: string | null = null
    ): Promise<AdminLog | null> {
        try {
            const log = this.getRepo().create({
                adminId,
                actionType,
                description,
                details,
                ipAddress,
                chainId,
                success,
                errorMessage,
            });

            await this.getRepo().save(log);

            if (!success) {
                logger.error(`Admin action failed: ${actionType}`, {
                    adminId,
                    error: errorMessage,
                    details,
                });
            } else {
                logger.info(`Admin action: ${actionType}`, { adminId, details });
            }

            return log;
        } catch (error) {
            logger.error(`Failed to save audit log for action: ${actionType}`, {
                error: (error as Error).message,
                adminId,
                details,
            });
            return null;
        }
    }

    /**
     * Get logs for a specific admin
     */
    async getAdminLogs(
        adminId: string,
        limit: number = 100,
        offset: number = 0
    ): Promise<{ logs: AdminLog[]; total: number }> {
        const [logs, total] = await this.getRepo().findAndCount({
            where: { adminId },
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });

        return { logs, total };
    }

    /**
     * Get all logs by action type
     */
    async getLogsByActionType(
        actionType: AdminActionType,
        limit: number = 100,
        offset: number = 0
    ): Promise<{ logs: AdminLog[]; total: number }> {
        const [logs, total] = await this.getRepo().findAndCount({
            where: { actionType },
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });

        return { logs, total };
    }

    /**
     * Get logs for a specific chain
     */
    async getChainLogs(
        chainId: number,
        limit: number = 100,
        offset: number = 0
    ): Promise<{ logs: AdminLog[]; total: number }> {
        const [logs, total] = await this.getRepo().findAndCount({
            where: { chainId },
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });

        return { logs, total };
    }

    /**
     * Get all logs with optional filters
     */
    async getAllLogs(
        filters: {
            adminId?: string;
            actionType?: AdminActionType;
            chainId?: number;
            startDate?: Date;
            endDate?: Date;
            successOnly?: boolean;
        } = {},
        limit: number = 100,
        offset: number = 0
    ): Promise<{ logs: AdminLog[]; total: number }> {
        let query = this.getRepo().createQueryBuilder('log');

        if (filters.adminId) {
            query = query.where('log.adminId = :adminId', { adminId: filters.adminId });
        }

        if (filters.actionType) {
            query = query.andWhere('log.actionType = :actionType', {
                actionType: filters.actionType,
            });
        }

        if (filters.chainId) {
            query = query.andWhere('log.chainId = :chainId', { chainId: filters.chainId });
        }

        if (filters.startDate) {
            query = query.andWhere('log.createdAt >= :startDate', {
                startDate: filters.startDate,
            });
        }

        if (filters.endDate) {
            query = query.andWhere('log.createdAt <= :endDate', {
                endDate: filters.endDate,
            });
        }

        if (filters.successOnly) {
            query = query.andWhere('log.success = true');
        }

        const [logs, total] = await query
            .orderBy('log.createdAt', 'DESC')
            .take(limit)
            .skip(offset)
            .getManyAndCount();

        return { logs, total };
    }

    /**
     * Get recent failed actions
     */
    async getFailedActions(
        limit: number = 50
    ): Promise<AdminLog[]> {
        return this.getRepo().find({
            where: { success: false },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
}

export const auditLogService = new AuditLogService();
