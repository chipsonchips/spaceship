import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database.js';
import { authenticateTokenOrAdminSecret, requireAdmin } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';
import { PlayerBet } from '../entities/player-bet.entity.js';
import { Round } from '../entities/round.entity.js';
import { User, UserRole } from '../entities/user.entity.js';
import { GameHistory } from '../entities/game-history.entity.js';

const router = Router();

// All endpoints require admin authentication (supports both JWT and admin secret)
router.use(authenticateTokenOrAdminSecret);
router.use(requireAdmin);

/**
 * GET /api/admin/game/players
 * Get all players with their statistics
 */
router.get('/players', async (req: Request, res: Response) => {
    try {
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
        const offset = parseInt(req.query.offset as string) || 0;
        const search = req.query.search as string;
        const isActive = req.query.isActive as string;

        const userRepo = AppDataSource.getRepository(User);
        let query = userRepo.createQueryBuilder('user')
            .where('user.role = :role', { role: UserRole.PLAYER });

        if (search) {
            query = query.andWhere(
                '(user.username ILIKE :search OR user.address ILIKE :search OR user.displayName ILIKE :search)',
                { search: `%${search}%` }
            );
        }

        if (isActive !== undefined) {
            query = query.andWhere('user.isActive = :isActive', { isActive: isActive === 'true' });
        }

        const [players, total] = await query
            .orderBy('user.createdAt', 'DESC')
            .take(limit)
            .skip(offset)
            .getManyAndCount();

        // Get stats for each player
        const playerStats = await Promise.all(
            players.map(async (player) => {
                const betRepo = AppDataSource.getRepository(PlayerBet);
                const bets = await betRepo.find({ where: { address: player.address || '' } });

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
            })
        );

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
    } catch (error) {
        logger.error('Failed to fetch players', { error: (error as Error).message });
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

        const history = await historyRepo.find({ order: { createdAt: 'DESC' }, take: 100 });

        const totalBetAmount = history.reduce((sum, h) => sum + Number(h.totalBets), 0);
        const totalPayouts = history.reduce((sum, h) => sum + Number(h.totalPayouts), 0);
        const avgCrashMultiplier = history.length > 0
            ? (history.reduce((sum, h) => sum + Number(h.crashMultiplier), 0) / history.length).toFixed(2)
            : '0';

        res.json({
            success: true,
            statistics: {
                totalRounds,
                settledRounds,
                totalBets,
                totalPlayers,
                totalBetAmount: totalBetAmount.toFixed(8),
                totalPayouts: totalPayouts.toFixed(8),
                houseProfit: (totalBetAmount - totalPayouts).toFixed(8),
                averageCrashMultiplier: avgCrashMultiplier,
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
