import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../services/game-engine.service.ts';
import { AppDataSource } from '../config/database.ts';
import { Round } from '../entities/round.entity.ts';

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
  })),
}));

vi.mock('@/utils/logger.ts', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('GameEngine', () => {
  let gameEngine: GameEngine;
  let mockIo: any;
  let mockRoundRepo: any;
  let mockBetRepo: any;
  let mockQueryRunner: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Socket.IO
    mockIo = {
      on: vi.fn(),
      emit: vi.fn(),
    };

    // Mock repositories
    mockRoundRepo = {
      create: vi.fn(),
      save: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
    };

    mockBetRepo = {
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
        findOne: vi.fn(),
        save: vi.fn(),
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

    // Make AppDataSource initialized
    (AppDataSource as any).isInitialized = true;

    // Mock the query runner to prevent hanging on initialization
    mockQueryRunner.manager.findOne.mockResolvedValue(null);
    mockQueryRunner.manager.save.mockResolvedValue({ id: 1, roundId: 1 });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('constructor', () => {
    it('should initialize with Socket.IO server', async () => {
      gameEngine = new GameEngine(mockIo);

      // Wait for async initialization to complete
      await vi.waitUntil(() => (gameEngine as any).isRunning === true, { timeout: 1000 });

      expect(gameEngine).toBeDefined();
      expect(mockIo.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('should setup socket event listeners', async () => {
      const mockSocket = {
        on: vi.fn(),
        emit: vi.fn(),
      };

      mockIo.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connection') {
          handler(mockSocket);
        }
      });

      gameEngine = new GameEngine(mockIo);

      // Wait for async initialization
      await vi.waitUntil(() => (gameEngine as any).isRunning === true, { timeout: 1000 });

      expect(mockSocket.on).toHaveBeenCalledWith('PLACE_BET', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('CASH_OUT', expect.any(Function));
    });
  });

  describe('startNewRound', () => {
    beforeEach(async () => {
      // Prevent infinite init loops
      mockRoundRepo.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.save.mockResolvedValue({ id: 1, roundId: 1 });

      gameEngine = new GameEngine(mockIo);
      // Wait for constructor's async initialization
      await vi.waitUntil(() => (gameEngine as any).isRunning === true, { timeout: 1000 });
      vi.clearAllMocks();
    });

    it('should generate server seed and hash', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockRoundRepo.create.mockImplementation((data: any) => data);
      mockQueryRunner.manager.save.mockResolvedValue({ id: 1, roundId: 1 });

      await gameEngine.startNewRound();

      expect(mockRoundRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          serverSeed: 'test-seed-123',
          serverSeedHash: '0xhash123',
        })
      );
    });

    it('should create round with id 1 when no previous rounds', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockRoundRepo.create.mockImplementation((data: any) => data);
      mockQueryRunner.manager.save.mockResolvedValue({ id: 1, roundId: 1 });

      await gameEngine.startNewRound();

      expect(mockRoundRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          roundId: 1,
        })
      );
    });

    it('should increment roundId from last round', async () => {
      const lastRound = { id: 5, roundId: 10 };
      mockQueryRunner.manager.findOne.mockResolvedValue(lastRound);
      mockRoundRepo.create.mockImplementation((data: any) => data);
      mockQueryRunner.manager.save.mockResolvedValue({ id: 6, roundId: 11 });

      await gameEngine.startNewRound();

      expect(mockRoundRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          roundId: 11,
        })
      );
    });

    it('should set phase to BETTING', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockRoundRepo.create.mockImplementation((data: any) => data);
      mockQueryRunner.manager.save.mockResolvedValue({ id: 1, roundId: 1 });

      await gameEngine.startNewRound();

      expect(mockRoundRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'BETTING',
        })
      );
    });

    it('should use transaction with SERIALIZABLE isolation', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockRoundRepo.create.mockImplementation((data: any) => data);
      mockQueryRunner.manager.save.mockResolvedValue({ id: 1, roundId: 1 });

      await gameEngine.startNewRound();

      expect(mockQueryRunner.startTransaction).toHaveBeenCalledWith('SERIALIZABLE');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      const error = new Error('Database error');
      mockQueryRunner.manager.findOne.mockRejectedValue(error);
      // Ensure release returns a resolved promise even on error path
      mockQueryRunner.release.mockResolvedValue(undefined);

      await expect(gameEngine.startNewRound()).rejects.toThrow('Database error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('placeBet', () => {
    beforeEach(async () => {
      mockRoundRepo.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.save.mockResolvedValue({ id: 1, roundId: 1 });

      gameEngine = new GameEngine(mockIo);
      await vi.waitUntil(() => (gameEngine as any).isRunning === true, { timeout: 1000 });

      (gameEngine as any).currentRound = {
        id: 1,
        roundId: 1,
        phase: 'BETTING',
        totalBets: 100,
      };
    });

    it('should throw error when chainId is not provided', async () => {
      await expect(gameEngine.placeBet('0x111', 50, undefined as any)).rejects.toThrow(
        'chainId is required'
      );
    });

    it('should create bet in current round', async () => {
      const betData = { id: 1, address: '0x111', amount: 50 };
      mockBetRepo.create.mockReturnValue(betData);
      mockBetRepo.save.mockResolvedValue(betData);
      mockRoundRepo.save.mockResolvedValue({});

      await gameEngine.placeBet('0x111', 50, 8453);

      expect(mockBetRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          address: '0x111',
          amount: 50,
          cashedOut: false,
        })
      );
      expect(mockBetRepo.save).toHaveBeenCalled();
    });

    it('should throw error when no active round', async () => {
      (gameEngine as any).currentRound = null;

      await expect(gameEngine.placeBet('0x111', 50, 8453)).rejects.toThrow('Betting closed');
    });

    it('should throw error during flying phase', async () => {
      (gameEngine as any).currentRound.phase = 'FLYING';

      await expect(gameEngine.placeBet('0x111', 50, 8453)).rejects.toThrow('Betting closed');
    });

    it('should validate bet amount (minimum)', async () => {
      await expect(gameEngine.placeBet('0x111', 0.05, 8453)).rejects.toThrow(
        'Invalid bet amount'
      );
    });

    it('should validate bet amount (maximum)', async () => {
      await expect(gameEngine.placeBet('0x111', 1001, 8453)).rejects.toThrow(
        'Invalid bet amount'
      );
    });

    it('should update round totalBets', async () => {
      const betData = { id: 1, address: '0x111', amount: 50 };
      mockBetRepo.create.mockReturnValue(betData);
      mockBetRepo.save.mockResolvedValue(betData);
      mockRoundRepo.save.mockResolvedValue({});

      await gameEngine.placeBet('0x111', 50, 8453);

      expect(mockRoundRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          totalBets: 150, // 100 + 50
        })
      );
    });

    it('should update leaderboard', async () => {
      const betData = { id: 1, address: '0x111', amount: 50 };
      mockBetRepo.create.mockReturnValue(betData);
      mockBetRepo.save.mockResolvedValue(betData);
      mockRoundRepo.save.mockResolvedValue({});

      await gameEngine.placeBet('0x111', 50, 8453);

      expect(gameEngine.leaderboardService.updateFromBet).toHaveBeenCalledWith({
        address: '0x111',
        amount: 50,
        cashedOut: false,
      });
    });
  });

  describe('cashOutById', () => {
    beforeEach(async () => {
      mockRoundRepo.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.save.mockResolvedValue({ id: 1, roundId: 1 });

      gameEngine = new GameEngine(mockIo);
      await vi.waitUntil(() => (gameEngine as any).isRunning === true, { timeout: 1000 });

      (gameEngine as any).currentRound = {
        id: 1,
        roundId: 1,
        phase: 'FLYING',
        currentMultiplier: 2.5,
        totalPayouts: 0,
      };
    });

    it('should throw error when chainId is not provided', async () => {
      const bet = {
        id: 1,
        address: '0x111',
        amount: 100,
        cashedOut: false,
        round: { id: 1, phase: 'FLYING' },
      };

      mockBetRepo.findOne.mockResolvedValue(bet);

      await expect(gameEngine.cashOutById(1, undefined as any)).rejects.toThrow(
        'chainId is required'
      );
    });

    it('should update bet with cashout data', async () => {
      const bet = {
        id: 1,
        address: '0x111',
        amount: 100,
        cashedOut: false,
        round: { id: 1, phase: 'FLYING', currentMultiplier: 2.5 },
      };

      mockBetRepo.findOne.mockResolvedValue(bet);
      mockBetRepo.save.mockImplementation((b: any) => Promise.resolve(b));
      mockRoundRepo.save.mockResolvedValue({});

      const result = await gameEngine.cashOutById(1, 8453);

      expect(result.cashedOut).toBe(true);
      expect(result.cashoutMultiplier).toBe(2.5);
    });

    it('should calculate payout correctly', async () => {
      const bet = {
        id: 1,
        address: '0x111',
        amount: 100,
        cashedOut: false,
        round: { id: 1, phase: 'FLYING', currentMultiplier: 2.5 },
      };

      mockBetRepo.findOne.mockResolvedValue(bet);
      mockBetRepo.save.mockImplementation((b: any) => Promise.resolve(b));
      mockRoundRepo.save.mockResolvedValue({});

      const result = await gameEngine.cashOutById(1, 8453);

      expect(result.payout).toBe(250); // 100 * 2.5
    });

    it('should throw error when bet not found', async () => {
      mockBetRepo.findOne.mockResolvedValue(null);

      await expect(gameEngine.cashOutById(999, 8453)).rejects.toThrow('Bet not found');
    });

    it('should throw error for already cashed out bets', async () => {
      const bet = {
        id: 1,
        address: '0x111',
        amount: 100,
        cashedOut: true,
        round: { id: 1 },
      };

      mockBetRepo.findOne.mockResolvedValue(bet);

      await expect(gameEngine.cashOutById(1, 8453)).rejects.toThrow('Already cashed out');
    });

    it('should throw error when not in flying phase', async () => {
      (gameEngine as any).currentRound.phase = 'BETTING';

      const bet = {
        id: 1,
        address: '0x111',
        amount: 100,
        cashedOut: false,
        round: { id: 1, phase: 'BETTING' },
      };

      mockBetRepo.findOne.mockResolvedValue(bet);

      await expect(gameEngine.cashOutById(1, 8453)).rejects.toThrow('Cannot cash out: round is not in flying phase');
    });

    it('should update round totalPayouts', async () => {
      const bet = {
        id: 1,
        address: '0x111',
        amount: 100,
        cashedOut: false,
        round: { id: 1, phase: 'FLYING', currentMultiplier: 2.5 },
      };

      mockBetRepo.findOne.mockResolvedValue(bet);
      mockBetRepo.save.mockImplementation((b: any) => Promise.resolve(b));
      mockRoundRepo.save.mockResolvedValue({});

      await gameEngine.cashOutById(1, 8453);

      expect(mockRoundRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          totalPayouts: 250, // 0 + 250
        })
      );
    });

    it('should update leaderboard with cashout data', async () => {
      const bet = {
        id: 1,
        address: '0x111',
        amount: 100,
        cashedOut: false,
        round: { id: 1, phase: 'FLYING', currentMultiplier: 2.5 },
      };

      mockBetRepo.findOne.mockResolvedValue(bet);
      mockBetRepo.save.mockImplementation((b: any) => Promise.resolve(b));
      mockRoundRepo.save.mockResolvedValue({});

      await gameEngine.cashOutById(1, 8453);

      expect(gameEngine.leaderboardService.updateFromBet).toHaveBeenCalledWith({
        address: '0x111',
        amount: 100,
        cashedOut: true,
        payout: 250,
        cashoutMultiplier: 2.5,
      });
    });
  });

  describe('broadcastGameState', () => {
    beforeEach(async () => {
      mockRoundRepo.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.save.mockResolvedValue({ id: 1, roundId: 1 });

      gameEngine = new GameEngine(mockIo);
      await vi.waitUntil(() => (gameEngine as any).isRunning === true, { timeout: 1000 });
    });

    it('should emit game state via Socket.IO', async () => {
      (gameEngine as any).currentRound = {
        id: 1,
        roundId: 1,
        phase: 'BETTING',
      };

      const mockPlayers = [
        { id: 1, address: '0x111', amount: 100 },
        { id: 2, address: '0x222', amount: 200 },
      ];

      mockBetRepo.find.mockResolvedValue(mockPlayers);

      await gameEngine.broadcastGameState();

      // The implementation spreads currentRound, so check players separately
      const emittedData = (mockIo.emit as any).mock.calls[0][1];
      expect(mockIo.emit).toHaveBeenCalledWith('GAME_STATE_UPDATE', expect.anything());
      expect(emittedData.players).toEqual(mockPlayers);
    });

    it('should include active bets from database', async () => {
      (gameEngine as any).currentRound = {
        id: 1,
        roundId: 1,
      };

      const mockPlayers = [{ id: 1, address: '0x111' }];
      mockBetRepo.find.mockResolvedValue(mockPlayers);

      await gameEngine.broadcastGameState();

      expect(mockBetRepo.find).toHaveBeenCalledWith({
        where: { round: { id: 1 } },
      });
    });

    it('should handle missing current round gracefully', async () => {
      (gameEngine as any).currentRound = null;

      await gameEngine.broadcastGameState();

      // Should not crash
      expect(mockIo.emit).not.toHaveBeenCalled();
    });

    it('should fallback on database query error', async () => {
      (gameEngine as any).currentRound = {
        id: 1,
        roundId: 1,
      };

      mockBetRepo.find.mockRejectedValue(new Error('DB error'));

      await gameEngine.broadcastGameState();

      // Should still emit with current round data (fallback emits the round itself)
      expect(mockIo.emit).toHaveBeenCalledWith('GAME_STATE_UPDATE', expect.objectContaining({
        id: 1,
        roundId: 1,
      }));
    });
  });

  describe('crashRound', () => {
    beforeEach(async () => {
      vi.useFakeTimers();
      mockRoundRepo.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.save.mockResolvedValue({ id: 1, roundId: 1 });

      gameEngine = new GameEngine(mockIo);
      await vi.waitUntil(() => (gameEngine as any).isRunning === true, { timeout: 1000 });

      (gameEngine as any).currentRound = {
        id: 1,
        roundId: 1,
        phase: 'FLYING',
        totalBets: 300,
        totalPayouts: 250,
      };
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should set phase to CRASHED', async () => {
      mockBetRepo.find.mockResolvedValue([]);
      mockRoundRepo.save.mockResolvedValue({});
      mockIo.emit = vi.fn();

      await gameEngine.crashRound(2.5);

      expect(mockRoundRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'CRASHED',
          crashMultiplier: 2.5,
        })
      );
    });

    it('should handle losing bets (non-cashed)', async () => {
      const players = [
        { id: 1, address: '0x111', amount: 100, cashedOut: false },
        { id: 2, address: '0x222', amount: 100, cashedOut: true, payout: 250 },
      ];

      mockBetRepo.find.mockResolvedValue(players);
      mockBetRepo.save.mockImplementation((b: any) => Promise.resolve(b));
      mockRoundRepo.save.mockResolvedValue({});
      mockIo.emit = vi.fn();

      await gameEngine.crashRound(2.5);

      // Losing bet should have payout = 0
      expect(mockBetRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          payout: 0,
        })
      );
    });

    it('should record in history', async () => {
      mockBetRepo.find.mockResolvedValue([]);
      mockRoundRepo.save.mockResolvedValue({});
      mockIo.emit = vi.fn();

      await gameEngine.crashRound(2.5);

      expect(gameEngine.historyService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          roundId: 1,
          crashMultiplier: 2.5,
          totalBets: 300,
          totalPayouts: 250,
        })
      );
    });

    it('should emit history update', async () => {
      mockBetRepo.find.mockResolvedValue([]);
      mockRoundRepo.save.mockResolvedValue({});
      const mockHistory = [{ roundId: 1, crashMultiplier: 2.5 }];
      vi.mocked(gameEngine.historyService.latest).mockResolvedValue(mockHistory as any);

      await gameEngine.crashRound(2.5);

      expect(mockIo.emit).toHaveBeenCalledWith('HISTORY_UPDATE', mockHistory);
    });

    it('should schedule next round after 10 seconds', async () => {
      mockBetRepo.find.mockResolvedValue([]);
      mockRoundRepo.save.mockResolvedValue({});
      mockIo.emit = vi.fn();

      const startNewRoundSpy = vi.spyOn(gameEngine, 'startNewRound').mockResolvedValue({} as any);

      await gameEngine.crashRound(2.5);

      expect(startNewRoundSpy).not.toHaveBeenCalled();

      // Fast forward 10 seconds
      await vi.advanceTimersByTimeAsync(10000);

      expect(startNewRoundSpy).toHaveBeenCalled();
    });

    it('should only record history once when called concurrently', async () => {
      mockBetRepo.find.mockResolvedValue([]);
      mockRoundRepo.save.mockResolvedValue({});
      mockIo.emit = vi.fn();

      // Call crashRound twice concurrently
      // The first call will synchronously set phase to CRASHED before any awaits
      const call1 = gameEngine.crashRound(2.5);
      const call2 = gameEngine.crashRound(2.5);

      await Promise.all([call1, call2]);

      // History record should only be called once
      expect(gameEngine.historyService.record).toHaveBeenCalledTimes(1);
    });
  });
});
