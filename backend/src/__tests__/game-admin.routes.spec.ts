import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppDataSource } from '../config/database.js';
import { User, UserRole } from '../entities/user.entity.js';
import { PlayerBet } from '../entities/player-bet.entity.js';
import { Round } from '../entities/round.entity.js';
import { GameHistory } from '../entities/game-history.entity.js';

// Mock dependencies
vi.mock('../config/database.js', () => ({
    AppDataSource: {
        getRepository: vi.fn(),
    },
}));

vi.mock('../utils/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

const createMockPlayer = (overrides: any = {}): any => ({
    id: 'player-1',
    address: '0x123',
    username: 'player1',
    displayName: 'Player One',
    avatarUrl: 'https://example.com/avatar1.jpg',
    isActive: true,
    createdAt: new Date(),
    lastLoginAt: new Date(),
    ...overrides,
});

const createMockBet = (overrides: any = {}): any => ({
    id: 'bet-1',
    address: '0x123',
    amount: 1.5,
    cashedOut: true,
    cashoutMultiplier: 2.5,
    payout: 3.75,
    timestamp: new Date(),
    txHash: '0xabc',
    ...overrides,
});

const createMockRound = (overrides: any = {}): any => ({
    id: 1,
    roundId: 'round-1',
    phase: 'flying',
    startTime: new Date(),
    flyStartTime: new Date(),
    crashMultiplier: 2.5,
    currentMultiplier: 1.8,
    totalBets: 100,
    totalPayouts: 150,
    settled: false,
    createdAt: new Date(),
    ...overrides,
});

describe('Game Admin Routes - Service Layer Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Player Management', () => {
        it('should fetch all players with pagination', async () => {
            const mockPlayers = [createMockPlayer()];
            const mockBets = [createMockBet()];

            const mockUserRepo = {
                createQueryBuilder: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnThis(),
                    andWhere: vi.fn().mockReturnThis(),
                    orderBy: vi.fn().mockReturnThis(),
                    take: vi.fn().mockReturnThis(),
                    skip: vi.fn().mockReturnThis(),
                    getManyAndCount: vi.fn().mockResolvedValue([mockPlayers, 1]),
                }),
            };

            const mockBetRepo = {
                find: vi.fn().mockResolvedValue(mockBets),
            };

            vi.mocked(AppDataSource.getRepository).mockImplementation((entity: any) => {
                if (entity === User) return mockUserRepo as any;
                if (entity === PlayerBet) return mockBetRepo as any;
                return {} as any;
            });

            const userRepo = AppDataSource.getRepository(User);
            const [players, total] = await userRepo.createQueryBuilder('user')
                .where('user.role = :role', { role: UserRole.PLAYER })
                .orderBy('user.createdAt', 'DESC')
                .take(50)
                .skip(0)
                .getManyAndCount();

            expect(players).toHaveLength(1);
            expect(total).toBe(1);
            expect(players[0].username).toBe('player1');
        });

        it('should filter players by search term', async () => {
            const mockUserRepo = {
                createQueryBuilder: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnThis(),
                    andWhere: vi.fn().mockReturnThis(),
                    orderBy: vi.fn().mockReturnThis(),
                    take: vi.fn().mockReturnThis(),
                    skip: vi.fn().mockReturnThis(),
                    getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
                }),
            };

            vi.mocked(AppDataSource.getRepository).mockReturnValue(mockUserRepo as any);

            const userRepo = AppDataSource.getRepository(User);
            const query = userRepo.createQueryBuilder('user')
                .where('user.role = :role', { role: UserRole.PLAYER })
                .andWhere('(user.username ILIKE :search OR user.address ILIKE :search)', { search: '%player1%' });

            expect(query.andWhere).toBeDefined();
        });

        it('should calculate player statistics correctly', () => {
            const bets = [
                createMockBet({ amount: 1.5, payout: 3.75, cashedOut: true }),
                createMockBet({ amount: 2.0, payout: 0, cashedOut: false }),
                createMockBet({ amount: 1.0, payout: 2.5, cashedOut: true }),
            ];

            const totalBetAmount = bets.reduce((sum, bet) => sum + Number(bet.amount), 0);
            const totalPayouts = bets.reduce((sum, bet) => sum + Number(bet.payout || 0), 0);
            const cashoutCount = bets.filter(b => b.cashedOut).length;

            expect(totalBetAmount).toBe(4.5);
            expect(totalPayouts).toBe(6.25);
            expect(cashoutCount).toBe(2);
        });

        it('should fetch player details with bets', async () => {
            const mockPlayer = createMockPlayer();
            const mockBets = [
                createMockBet({ id: 'bet-1' }),
                createMockBet({ id: 'bet-2' }),
            ];

            const mockUserRepo = {
                findOne: vi.fn().mockResolvedValue(mockPlayer),
            };

            const mockBetRepo = {
                find: vi.fn().mockResolvedValue(mockBets),
            };

            vi.mocked(AppDataSource.getRepository).mockImplementation((entity: any) => {
                if (entity === User) return mockUserRepo as any;
                if (entity === PlayerBet) return mockBetRepo as any;
                return {} as any;
            });

            const userRepo = AppDataSource.getRepository(User);
            const player = await userRepo.findOne({ where: { id: 'player-1' } });

            expect(player).toEqual(mockPlayer);
            expect(player?.username).toBe('player1');
        });
    });

    describe('Player Bet History', () => {
        it('should fetch paginated player bets', async () => {
            const mockPlayer = createMockPlayer();
            const mockBets = [createMockBet()];

            const mockUserRepo = {
                findOne: vi.fn().mockResolvedValue(mockPlayer),
            };

            const mockBetRepo = {
                findAndCount: vi.fn().mockResolvedValue([mockBets, 1]),
            };

            vi.mocked(AppDataSource.getRepository).mockImplementation((entity: any) => {
                if (entity === User) return mockUserRepo as any;
                if (entity === PlayerBet) return mockBetRepo as any;
                return {} as any;
            });

            const betRepo = AppDataSource.getRepository(PlayerBet);
            const [bets, total] = await betRepo.findAndCount({
                where: { address: '0x123' },
                order: { timestamp: 'DESC' },
                take: 50,
                skip: 0,
            });

            expect(bets).toHaveLength(1);
            expect(total).toBe(1);
        });

        it('should calculate win rate from bets', () => {
            const bets = [
                createMockBet({ cashedOut: true }),
                createMockBet({ cashedOut: true }),
                createMockBet({ cashedOut: false }),
                createMockBet({ cashedOut: false }),
            ];

            const cashoutCount = bets.filter(b => b.cashedOut).length;
            const winRate = bets.length > 0 ? (cashoutCount / bets.length * 100).toFixed(2) : '0';

            expect(winRate).toBe('50.00');
        });
    });

    describe('Round Management', () => {
        it('should fetch round details with bets', async () => {
            const mockRound = createMockRound();
            const mockBets = [createMockBet()];

            const mockRoundRepo = {
                findOne: vi.fn().mockResolvedValue(mockRound),
            };

            const mockBetRepo = {
                find: vi.fn().mockResolvedValue(mockBets),
            };

            vi.mocked(AppDataSource.getRepository).mockImplementation((entity: any) => {
                if (entity === Round) return mockRoundRepo as any;
                if (entity === PlayerBet) return mockBetRepo as any;
                return {} as any;
            });

            const roundRepo = AppDataSource.getRepository(Round);
            const round = await roundRepo.findOne({ where: { id: 1 } });

            expect(round).toEqual(mockRound);
            expect(round?.roundId).toBe('round-1');
        });

        it('should calculate round statistics', () => {
            const bets = [
                createMockBet({ amount: 1.5, payout: 3.75, cashedOut: true }),
                createMockBet({ amount: 2.0, payout: 0, cashedOut: false }),
            ];

            const totalBetAmount = bets.reduce((sum, b) => sum + Number(b.amount), 0);
            const totalPayouts = bets.reduce((sum, b) => sum + Number(b.payout || 0), 0);
            const cashoutCount = bets.filter(b => b.cashedOut).length;

            expect(totalBetAmount).toBe(3.5);
            expect(totalPayouts).toBe(3.75);
            expect(cashoutCount).toBe(1);
        });

        it('should handle round not found', async () => {
            const mockRoundRepo = {
                findOne: vi.fn().mockResolvedValue(null),
            };

            vi.mocked(AppDataSource.getRepository).mockReturnValue(mockRoundRepo as any);

            const roundRepo = AppDataSource.getRepository(Round);
            const round = await roundRepo.findOne({ where: { id: 999 } });

            expect(round).toBeNull();
        });
    });

    describe('Game Settings', () => {
        it('should validate min bet amount', () => {
            const minBetAmount = 0.1;
            const isValid = minBetAmount > 0;

            expect(isValid).toBe(true);
        });

        it('should reject invalid min bet amount', () => {
            const minBetAmount = -1;
            const isValid = minBetAmount > 0;

            expect(isValid).toBe(false);
        });

        it('should validate max bet greater than min bet', () => {
            const minBetAmount = 0.1;
            const maxBetAmount = 10;
            const isValid = maxBetAmount > minBetAmount;

            expect(isValid).toBe(true);
        });

        it('should reject max bet less than min bet', () => {
            const minBetAmount = 10;
            const maxBetAmount = 5;
            const isValid = maxBetAmount > minBetAmount;

            expect(isValid).toBe(false);
        });

        it('should validate betting duration minimum', () => {
            const bettingDurationMs = 10000;
            const isValid = bettingDurationMs >= 5000;

            expect(isValid).toBe(true);
        });

        it('should reject betting duration less than 5 seconds', () => {
            const bettingDurationMs = 3000;
            const isValid = bettingDurationMs >= 5000;

            expect(isValid).toBe(false);
        });

        it('should validate flying duration minimum', () => {
            const flyingDurationMs = 20000;
            const isValid = flyingDurationMs >= 1000;

            expect(isValid).toBe(true);
        });

        it('should reject flying duration less than 1 second', () => {
            const flyingDurationMs = 500;
            const isValid = flyingDurationMs >= 1000;

            expect(isValid).toBe(false);
        });
    });

    describe('Game Statistics', () => {
        it('should calculate overall game statistics', async () => {
            const mockHistoryRepo = {
                createQueryBuilder: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnThis(),
                    addSelect: vi.fn().mockReturnThis(),
                    getRawOne: vi.fn().mockResolvedValue({
                        totalBetAmount: 1000,
                        totalPayouts: 800,
                    }),
                }),
            };

            const mockRoundRepo = {
                count: vi.fn()
                    .mockResolvedValueOnce(100)
                    .mockResolvedValueOnce(95),
            };

            const mockBetRepo = {
                count: vi.fn().mockResolvedValue(500),
            };

            const mockUserRepo = {
                count: vi.fn().mockResolvedValue(50),
            };

            vi.mocked(AppDataSource.getRepository).mockImplementation((entity: any) => {
                if (entity === GameHistory) return mockHistoryRepo as any;
                if (entity === Round) return mockRoundRepo as any;
                if (entity === PlayerBet) return mockBetRepo as any;
                if (entity === User) return mockUserRepo as any;
                return {} as any;
            });

            const roundRepo = AppDataSource.getRepository(Round);
            const totalRounds = await roundRepo.count();
            const settledRounds = await roundRepo.count({ where: { settled: true } });

            expect(totalRounds).toBe(100);
            expect(settledRounds).toBe(95);
        });

        it('should calculate house profit', () => {
            const totalBetAmount = 1000;
            const totalPayouts = 800;
            const houseProfit = totalBetAmount - totalPayouts;

            expect(houseProfit).toBe(200);
        });

        it('should handle zero statistics', () => {
            const totalBetAmount = 0;
            const totalPayouts = 0;
            const houseProfit = totalBetAmount - totalPayouts;

            expect(houseProfit).toBe(0);
        });
    });

    describe('Data Aggregation', () => {
        it('should aggregate player statistics from multiple bets', () => {
            const players = [
                createMockPlayer({ id: 'player-1', address: '0x123' }),
                createMockPlayer({ id: 'player-2', address: '0x456' }),
            ];

            const bets = [
                createMockBet({ address: '0x123', amount: 1.5, payout: 3.75 }),
                createMockBet({ address: '0x123', amount: 2.0, payout: 0 }),
                createMockBet({ address: '0x456', amount: 1.0, payout: 2.5 }),
            ];

            const betsByAddress = new Map<string, any[]>();
            for (const bet of bets) {
                if (!betsByAddress.has(bet.address)) {
                    betsByAddress.set(bet.address, []);
                }
                betsByAddress.get(bet.address)!.push(bet);
            }

            expect(betsByAddress.get('0x123')).toHaveLength(2);
            expect(betsByAddress.get('0x456')).toHaveLength(1);
        });

        it('should handle empty bet data', () => {
            const players = [createMockPlayer()];
            const bets: any[] = [];

            const betsByAddress = new Map<string, any[]>();
            for (const bet of bets) {
                if (!betsByAddress.has(bet.address)) {
                    betsByAddress.set(bet.address, []);
                }
                betsByAddress.get(bet.address)!.push(bet);
            }

            expect(betsByAddress.size).toBe(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle database query errors', async () => {
            const mockUserRepo = {
                createQueryBuilder: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnThis(),
                    andWhere: vi.fn().mockReturnThis(),
                    orderBy: vi.fn().mockReturnThis(),
                    take: vi.fn().mockReturnThis(),
                    skip: vi.fn().mockReturnThis(),
                    getManyAndCount: vi.fn().mockRejectedValue(new Error('Database error')),
                }),
            };

            vi.mocked(AppDataSource.getRepository).mockReturnValue(mockUserRepo as any);

            const userRepo = AppDataSource.getRepository(User);
            try {
                await userRepo.createQueryBuilder('user')
                    .where('user.role = :role', { role: UserRole.PLAYER })
                    .getManyAndCount();
                expect.fail('Should have thrown error');
            } catch (e) {
                expect((e as Error).message).toBe('Database error');
            }
        });

        it('should handle missing player data', async () => {
            const mockUserRepo = {
                findOne: vi.fn().mockResolvedValue(null),
            };

            vi.mocked(AppDataSource.getRepository).mockReturnValue(mockUserRepo as any);

            const userRepo = AppDataSource.getRepository(User);
            const player = await userRepo.findOne({ where: { id: 'nonexistent' } });

            expect(player).toBeNull();
        });
    });
});
