import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database.js';
import { authenticateTokenOrAdminSecret, requireAdmin } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';
import { PlayerBet } from '../entities/player-bet.entity.js';
import { Round } from '../entities/round.entity.js';
import { User, UserRole } from '../entities/user.entity.js';
import { GameHistory } from '../entities/game-history.entity.js';

const router = Router();


router.get('/settings', async (req: Request, res: Response) => {
    try {
        const { gameSettingsService } = await import('../services/game-settings.service.js');
        const settings = await gameSettingsService.getSettings();

        res.json({
            success: true,
            settings: {
                minBetAmount: Number(settings.minBetAmount),
                maxBetAmount: Number(settings.maxBetAmount),
                bettingDurationMs: settings.bettingDurationMs,
                flyingDurationMs: settings.flyingDurationMs,
                roundRestartDelayMs: settings.roundRestartDelayMs,
                houseEdge: Number(settings.houseEdge),
                minCrashMultiplier: Number(settings.minCrashMultiplier),
                maxCrashMultiplier: Number(settings.maxCrashMultiplier),
            },
        });
    } catch (error) {
        logger.error('Failed to fetch game settings', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch game settings',
        });
    }
});

router.use(authenticateTokenOrAdminSecret);
router.use(requireAdmin);

/**
 * GET /api/admin/game/players
 * Get all players with their statistics
 */
router.get('/players', async (req: Request, res: Response) => {
    try {
        logger.info('GET /api/admin/game/players - Starting request', {
            userId: req.userId,
            userRole: req.user?.role,
        });

        const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
        const offset = parseInt(req.query.offset as string) || 0;
        const search = req.query.search as string;

        logger.info('GET /api/admin/game/players - Query params', {
            limit,
            offset,
            search,
        });

        try {
            const userRepo = AppDataSource.getRepository(User);

            logger.info('GET /api/admin/game/players - Creating base query');
            let query = userRepo.createQueryBuilder('user')
                .where('user.role = :role', { role: UserRole.PLAYER });

            if (search) {
                logger.info('GET /api/admin/game/players - Adding search filter', { search });
                query = query.andWhere(
                    '(user.username ILIKE :search OR user.address ILIKE :search OR user.displayName ILIKE :search)',
                    { search: `%${search}%` }
                );
            }

            logger.info('GET /api/admin/game/players - Executing query');
            const [players, total] = await query
                .orderBy('user.createdAt', 'DESC')
                .take(limit)
                .skip(offset)
                .getManyAndCount();

            logger.info('GET /api/admin/game/players - Query successful', {
                playerCount: players.length,
                total,
            });

            if (players.length === 0) {
                return res.json({
                    success: true,
                    players: [],
                    pagination: { total: 0, limit, offset, pages: 0 },
                });
            }

            // Get bets for all players
            logger.info('GET /api/admin/game/players - Fetching bets');
            const playerAddresses = players.map(p => p.address).filter(Boolean) as string[];

            let allBets: PlayerBet[] = [];
            if (playerAddresses.length > 0) {
                const betRepo = AppDataSource.getRepository(PlayerBet);
                allBets = await betRepo.find({
                    where: playerAddresses.map(address => ({ address })),
                });
                logger.info('GET /api/admin/game/players - Bets fetched', {
                    betCount: allBets.length,
                });
            }

            // Group bets by address
            const betsByAddress = new Map<string, PlayerBet[]>();
            for (const bet of allBets) {
                if (!betsByAddress.has(bet.address)) {
                    betsByAddress.set(bet.address, []);
                }
                betsByAddress.get(bet.address)!.push(bet);
            }

            // Build player stats
            const playerStats = players.map((player) => {
                const bets = betsByAddress.get(player.address || '') || [];
                const totalBetAmount = bets.reduce((sum, bet) => sum + Number(bet.amount), 0);
                const totalPayouts = bets.reduce((sum, bet) => sum + Number(bet.payout || 0), 0);
                const cashoutCount = bets.filter(b => b.cashedOut).length;

                return {
                    id: player.id,
                    address: player.address,
                    username: player.username,
                    displayName: player.displayName,
                    avatarUrl: player.avatarUrl,
                    isActive: player.isActive,
                    totalBets: bets.length,
                    totalBetAmount: totalBetAmount.toFixed(8),
                    totalPayouts: totalPayouts.toFixed(8),
                    cashoutCount,
                    lastLoginAt: player.lastLoginAt,
                    createdAt: player.createdAt,
                };
            });

            logger.info('GET /api/admin/game/players - Success');

            res.json({
                success: true,
                players: playerStats,
                pagination: {
                    total,
                    limit,
                    offset,
                    pages: Math.ceil(total / limit),
                },
            });
        } catch (queryError) {
            const errorMsg = queryError instanceof Error ? queryError.message : String(queryError);
            const errorStack = queryError instanceof Error ? queryError.stack : '';
            logger.error('Database query error', {
                error: errorMsg,
                stack: errorStack,
                errorName: queryError instanceof Error ? queryError.name : 'unknown',
            });
            throw queryError;
        }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : '';
        logger.error('Failed to fetch players', {
            error: errorMsg,
            stack: errorStack,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch players',
        });
    }
});

/**
 * GET /api/admin/game/players/:userId
 * Get detailed player information
 */
router.get('/players/:userId', async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId as string;
        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Player not found',
            });
        }

        const betRepo = AppDataSource.getRepository(PlayerBet);
        const bets = await betRepo.find({
            where: { address: user.address || '' },
            order: { timestamp: 'DESC' },
            take: 100,
        });

        const totalBetAmount = bets.reduce((sum, bet) => sum + Number(bet.amount), 0);
        const totalPayouts = bets.reduce((sum, bet) => sum + Number(bet.payout || 0), 0);
        const cashoutCount = bets.filter(b => b.cashedOut).length;
        const winRate = bets.length > 0 ? (cashoutCount / bets.length * 100).toFixed(2) : '0';

        res.json({
            success: true,
            player: {
                id: user.id,
                address: user.address,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                email: user.email,
                isActive: user.isActive,
                createdAt: user.createdAt,
                lastLoginAt: user.lastLoginAt,
                lastActivityAt: user.lastActivityAt,
            },
            statistics: {
                totalBets: bets.length,
                totalBetAmount: totalBetAmount.toFixed(8),
                totalPayouts: totalPayouts.toFixed(8),
                netProfit: (totalPayouts - totalBetAmount).toFixed(8),
                cashoutCount,
                winRate: `${winRate}%`,
                averageBet: bets.length > 0 ? (totalBetAmount / bets.length).toFixed(8) : '0',
            },
            recentBets: bets.map(bet => ({
                id: bet.id,
                amount: bet.amount.toString(),
                cashedOut: bet.cashedOut,
                cashoutMultiplier: bet.cashoutMultiplier,
                payout: bet.payout?.toString(),
                timestamp: bet.timestamp,
                txHash: bet.txHash,
            })),
        });
    } catch (error) {
        logger.error('Failed to fetch player details', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch player details',
        });
    }
});

/**
 * GET /api/admin/game/players/:userId/bets
 * Get player's bet history with pagination
 */
router.get('/players/:userId/bets', async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId as string;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
        const offset = parseInt(req.query.offset as string) || 0;

        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Player not found',
            });
        }

        const betRepo = AppDataSource.getRepository(PlayerBet);
        const [bets, total] = await betRepo.findAndCount({
            where: { address: user.address || '' },
            order: { timestamp: 'DESC' },
            take: limit,
            skip: offset,
        });

        res.json({
            success: true,
            bets: bets.map(bet => ({
                id: bet.id,
                roundId: bet.round?.id,
                amount: bet.amount.toString(),
                cashedOut: bet.cashedOut,
                cashoutMultiplier: bet.cashoutMultiplier,
                payout: bet.payout?.toString(),
                timestamp: bet.timestamp,
                txHash: bet.txHash,
                createdAt: bet.createdAt,
            })),
            pagination: {
                total,
                limit,
                offset,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        logger.error('Failed to fetch player bets', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch player bets',
        });
    }
});

/**
 * GET /api/admin/game/rounds/:roundId
 * Get round details with all bets
 */
router.get('/rounds/:roundId', async (req: Request, res: Response) => {
    try {
        const roundId = parseInt(req.params.roundId as string);
        const roundRepo = AppDataSource.getRepository(Round);
        const round = await roundRepo.findOne({
            where: { id: roundId },
            relations: ['players'],
        });

        if (!round) {
            return res.status(404).json({
                success: false,
                error: 'Round not found',
            });
        }

        const betRepo = AppDataSource.getRepository(PlayerBet);
        const bets = await betRepo.find({
            where: { round: { id: round.id } },
            order: { timestamp: 'ASC' },
        });

        res.json({
            success: true,
            round: {
                id: round.id,
                roundId: round.roundId,
                phase: round.phase,
                startTime: round.startTime,
                flyStartTime: round.flyStartTime,
                crashMultiplier: round.crashMultiplier,
                currentMultiplier: round.currentMultiplier,
                totalBets: round.totalBets.toString(),
                totalPayouts: round.totalPayouts.toString(),
                settled: round.settled,
                createdAt: round.createdAt,
            },
            bets: bets.map(bet => ({
                id: bet.id,
                address: bet.address,
                amount: bet.amount.toString(),
                cashedOut: bet.cashedOut,
                cashoutMultiplier: bet.cashoutMultiplier,
                payout: bet.payout?.toString(),
                timestamp: bet.timestamp,
                txHash: bet.txHash,
            })),
            statistics: {
                totalBets: bets.length,
                totalBetAmount: bets.reduce((sum, b) => sum + Number(b.amount), 0).toFixed(8),
                totalPayouts: bets.reduce((sum, b) => sum + Number(b.payout || 0), 0).toFixed(8),
                cashoutCount: bets.filter(b => b.cashedOut).length,
            },
        });
    } catch (error) {
        logger.error('Failed to fetch round details', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch round details',
        });
    }
});

/**
 * PUT /api/admin/game/settings
 * Update global game settings (admin only)
 */
router.put('/settings', async (req: Request, res: Response) => {
    try {
        const {
            minBetAmount,
            maxBetAmount,
            bettingDurationMs,
            flyingDurationMs,
            roundRestartDelayMs,
            houseEdge,
            minCrashMultiplier,
            maxCrashMultiplier
        } = req.body;

        // Save to database (service performs full range & integrity validations)
        const { gameSettingsService } = await import('../services/game-settings.service.js');
        const updatedSettings = await gameSettingsService.updateSettings({
            minBetAmount,
            maxBetAmount,
            bettingDurationMs,
            flyingDurationMs,
            roundRestartDelayMs,
            houseEdge,
            minCrashMultiplier,
            maxCrashMultiplier
        });

        logger.info('Game settings updated', {
            settings: updatedSettings,
            adminId: req.userId,
        });

        res.json({
            success: true,
            message: 'Game settings updated successfully',
            settings: {
                minBetAmount: Number(updatedSettings.minBetAmount),
                maxBetAmount: Number(updatedSettings.maxBetAmount),
                bettingDurationMs: updatedSettings.bettingDurationMs,
                flyingDurationMs: updatedSettings.flyingDurationMs,
                roundRestartDelayMs: updatedSettings.roundRestartDelayMs,
                houseEdge: Number(updatedSettings.houseEdge),
                minCrashMultiplier: Number(updatedSettings.minCrashMultiplier),
                maxCrashMultiplier: Number(updatedSettings.maxCrashMultiplier),
            },
        });
    } catch (error) {
        logger.error('Failed to update game settings', { error: (error as Error).message });
        res.status(400).json({
            success: false,
            error: (error as Error).message || 'Failed to update game settings',
        });
    }
});

/**
 * GET /api/admin/game/statistics
 * Get overall game statistics
 */
router.get('/statistics', async (req: Request, res: Response) => {
    try {
        const historyRepo = AppDataSource.getRepository(GameHistory);
        const roundRepo = AppDataSource.getRepository(Round);
        const betRepo = AppDataSource.getRepository(PlayerBet);
        const userRepo = AppDataSource.getRepository(User);

        const totalRounds = await roundRepo.count();
        const settledRounds = await roundRepo.count({ where: { settled: true } });
        const totalBets = await betRepo.count();
        const totalPlayers = await userRepo.count({ where: { role: UserRole.PLAYER } });

        const { totalBetAmount, totalPayouts } = await historyRepo
            .createQueryBuilder('h')
            .select('SUM(h.totalBets)', 'totalBetAmount')
            .addSelect('SUM(h.totalPayouts)', 'totalPayouts')
            .getRawOne();

        const avgCrashMultiplier = await historyRepo
            .createQueryBuilder('h')
            .select('AVG(h.crashMultiplier)', 'avg')
            .getRawOne();

        res.json({
            success: true,
            statistics: {
                totalRounds,
                settledRounds,
                totalBets,
                totalPlayers,
                totalBetAmount: (Number(totalBetAmount) || 0).toFixed(8),
                totalPayouts: (Number(totalPayouts) || 0).toFixed(8),
                houseProfit: ((Number(totalBetAmount) || 0) - (Number(totalPayouts) || 0)).toFixed(8),
                averageCrashMultiplier: (Number(avgCrashMultiplier?.avg) || 0).toFixed(2),
            },
        });
    } catch (error) {
        logger.error('Failed to fetch game statistics', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch game statistics',
        });
    }
});

export default router;
