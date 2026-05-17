import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine } from '../services/game-engine.service.js';
import { AppDataSource } from '../config/database.js';
import { User, UserRole } from '../entities/user.entity.js';
import { Round } from '../entities/round.entity.js';

// Mock dependencies
vi.mock('../config/database.ts', () => ({
    AppDataSource: {
        isInitialized: false,
        initialize: vi.fn(),
        getRepository: vi.fn(),
        createQueryRunner: vi.fn(),
    },
}));

vi.mock('../services/game-utils.ts', () => ({
    generateServerSeed: vi.fn(() => 'test-seed-123'),
    hashServerSeed: vi.fn(() => '0xhash123'),
    generateCrashMultiplier: vi.fn(() => 2.5),
    calculateCurrentMultiplier: vi.fn((elapsed) => 1.0 + elapsed / 1000),
    calculatePlanePosition: vi.fn((elapsed) => ({ x: 10 + elapsed / 100, y: 80 })),
    sanitizeRound: vi.fn((round) => round),
}));

vi.mock('../utils/encryption.ts', () => ({
    encrypt: vi.fn(() => ({ encrypted: 'enc', iv: 'iv', authTag: 'tag' })),
    decrypt: vi.fn(() => 'test-seed-123'),
}));

vi.mock('../utils/provably-fair.ts', () => ({
    combineClientSeeds: vi.fn(() => 'combined-hash'),
    createFinalSeed: vi.fn(() => 'final-seed'),
}));

vi.mock('../services/security-monitor.service.ts', () => ({
    securityMonitor: {
        detectHighWinRate: vi.fn(),
        detectPerfectCashouts: vi.fn(),
        detectConsecutiveWins: vi.fn(),
        isSuspicious: vi.fn(() => false),
    },
}));

vi.mock('./audit-log.service.js', () => ({
    auditLogService: {
        logAction: vi.fn(),
    },
}));

vi.mock('../services/leaderboard.service.ts', () => ({
    LeaderboardService: vi.fn(() => ({
        updateFromBet: vi.fn(),
    })),
}));

vi.mock('../services/history.service.ts', () => ({
    HistoryService: vi.fn(() => ({
        record: vi.fn(),
        latest: vi.fn(() => []),
    })),
}));

vi.mock('../services/chain.service.ts', () => ({
    ChainService: vi.fn(() => ({
        submitRoundSnapshot: vi.fn(),
        placeBetFor: vi.fn(() => '0xtxhash'),
        cashOutFor: vi.fn(() => '0xcashouttx'),
        validatePlayerFunds: vi.fn(() => Promise.resolve({ ok: true })),
        getHouseBalance: vi.fn(() => Promise.resolve(10000)), // Mock sufficient balance
    })),
}));

vi.mock('../services/free-bet.service.ts', () => ({
    FreeBetService: vi.fn(() => ({
        getFreeBetsRemaining: vi.fn(() => 0),
        getFreeBetMaxAmount: vi.fn(() => 1),
        useFreeBet: vi.fn(),
    })),
}));

vi.mock('../services/user.service.ts', () => ({
    UserService: vi.fn(() => ({
        getUserByAddress: vi.fn(),
    })),
}));

vi.mock('@/utils/logger.ts', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

describe('Max Bet Amount Validation', () => {
    let gameEngine: GameEngine;
    let mockIo: any;
    let mockUserService: any;
    let mockBetRepo: any;
    let mockRoundRepo: any;
    let mockQueryRunner: any;

    beforeEach(async () => {
        vi.clearAllMocks();

        // Mock Socket.IO
        mockIo = {
            on: vi.fn(),
            emit: vi.fn(),
            to: vi.fn().mockReturnThis(),
        };

        // Mock repositories
        mockBetRepo = {
            create: vi.fn(),
            save: vi.fn(),
            findOne: vi.fn(),
            find: vi.fn(),
        };

        mockRoundRepo = {
            create: vi.fn(),
            save: vi.fn(),
            findOne: vi.fn(),
            find: vi.fn(),
        };

        // Mock query runner
        mockQueryRunner = {
            connect: vi.fn().mockResolvedValue(undefined),
            startTransaction: vi.fn().mockResolvedValue(undefined),
            commitTransaction: vi.fn().mockResolvedValue(undefined),
            rollbackTransaction: vi.fn().mockResolvedValue(undefined),
            release: vi.fn().mockResolvedValue(undefined),
            manager: {
                findOne: vi.fn().mockResolvedValue(null),
                save: vi.fn().mockResolvedValue({ id: 1, roundId: 1 }),
            },
        };

        vi.mocked(AppDataSource.getRepository).mockImplementation((entity: any) => {
            if (entity === Round || entity?.name === 'Round') {
                return mockRoundRepo;
            }
            return mockBetRepo;
        });

        vi.mocked(AppDataSource.createQueryRunner).mockReturnValue(mockQueryRunner);
        vi.mocked(AppDataSource.initialize).mockResolvedValue(AppDataSource);

        (AppDataSource as any).isInitialized = true;

        // Initialize game engine
        gameEngine = new GameEngine(mockIo);

        // Wait for async initialization
        await vi.waitUntil(() => (gameEngine as any).isRunning === true, { timeout: 1000 });

        // Set up current round
        (gameEngine as any).currentRound = {
            id: 1,
            roundId: 1,
            phase: 'BETTING',
            totalBets: 0,
        };

        mockUserService = gameEngine.userService;
    });

    it('should reject bet exceeding global max bet amount', async () => {
        // Set global max bet to 10 USDC
        process.env.MAX_BET_AMOUNT = '10';

        // Mock user service to return a user
        vi.mocked(mockUserService.getUserByAddress).mockResolvedValue({
            id: 1,
            address: '0xTestAddress1',
            username: 'testuser1',
            role: UserRole.PLAYER,
            maxBetAmount: null, // Use global default
        });

        // Try to place a bet exceeding global max
        await expect(
            gameEngine.placeBet('0xTestAddress1', 15, 8453)
        ).rejects.toThrow('Bet amount exceeds global maximum of 10 USDC');
    });

    it('should reject bet exceeding user-specific max bet amount', async () => {
        // Set global max bet to 10 USDC
        process.env.MAX_BET_AMOUNT = '10';

        // Mock user service to return a user with custom max bet
        vi.mocked(mockUserService.getUserByAddress).mockResolvedValue({
            id: 2,
            address: '0xTestAddress2',
            username: 'testuser2',
            role: UserRole.PLAYER,
            maxBetAmount: 2, // User-specific limit
        });

        // Try to place a bet exceeding user's max
        await expect(
            gameEngine.placeBet('0xTestAddress2', 5, 8453)
        ).rejects.toThrow('Bet amount exceeds your maximum of 2 USDC');
    });

    it('should accept bet within user-specific max bet amount', async () => {
        // Set global max bet to 10 USDC
        process.env.MAX_BET_AMOUNT = '10';

        // Mock user service to return a user with custom max bet
        vi.mocked(mockUserService.getUserByAddress).mockResolvedValue({
            id: 3,
            address: '0xTestAddress3',
            username: 'testuser3',
            role: UserRole.PLAYER,
            maxBetAmount: 5,
        });

        // Mock bet creation and saving
        const betData = { id: 1, address: '0xTestAddress3', amount: 3, cashedOut: false };
        mockBetRepo.create.mockReturnValue(betData);
        mockBetRepo.save.mockResolvedValue(betData);
        mockRoundRepo.save.mockResolvedValue({});

        // Place a bet within user's max
        const bet = await gameEngine.placeBet('0xTestAddress3', 3, 8453);
        expect(bet).toBeDefined();
        expect(bet.amount).toBe(3);
    });

    it('should enforce max bet for free bets', async () => {
        // Mock user service to return a user with free bets
        vi.mocked(mockUserService.getUserByAddress).mockResolvedValue({
            id: 4,
            address: '0xTestAddress4',
            username: 'testuser4',
            role: UserRole.PLAYER,
            maxBetAmount: 5,
            freeBetsRemaining: 2,
            freeBetMaxAmount: 0.5,
        });

        // Try to place a free bet exceeding user's max bet amount
        await expect(
            gameEngine.placeBet('0xTestAddress4', 7, 8453, true)
        ).rejects.toThrow('Bet amount exceeds your maximum of 5 USDC');
    });

    it('should use global max when user max is not set', async () => {
        // Set global max bet to 10 USDC
        process.env.MAX_BET_AMOUNT = '10';

        // Mock user service to return a user without custom max bet
        vi.mocked(mockUserService.getUserByAddress).mockResolvedValue({
            id: 5,
            address: '0xTestAddress5',
            username: 'testuser5',
            role: UserRole.PLAYER,
            maxBetAmount: null,
        });

        // Mock bet creation and saving
        const betData = { id: 2, address: '0xTestAddress5', amount: 8, cashedOut: false };
        mockBetRepo.create.mockReturnValue(betData);
        mockBetRepo.save.mockResolvedValue(betData);
        mockRoundRepo.save.mockResolvedValue({});

        // Place a bet within global max
        const bet = await gameEngine.placeBet('0xTestAddress5', 8, 8453);
        expect(bet).toBeDefined();
        expect(bet.amount).toBe(8);
    });

    it('should reject bet below global minimum', async () => {
        // Set global min bet to 0.1 USDC
        process.env.MIN_BET_AMOUNT = '0.1';

        // Mock user service to return a user
        vi.mocked(mockUserService.getUserByAddress).mockResolvedValue({
            id: 6,
            address: '0xTestAddress6',
            username: 'testuser6',
            role: UserRole.PLAYER,
        });

        // Try to place a bet below minimum
        await expect(
            gameEngine.placeBet('0xTestAddress6', 0.05, 8453)
        ).rejects.toThrow('Bet amount must be at least 0.1 USDC');
    });
});
