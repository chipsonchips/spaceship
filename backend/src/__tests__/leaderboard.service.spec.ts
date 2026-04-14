import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeaderboardService } from '../services/leaderboard.service.ts';
import { AppDataSource } from '../config/database.ts';
import { LeaderboardEntry } from '../entities/leaderboard.entity.ts';

// Mock the database
vi.mock('../config/database.ts', () => ({
  AppDataSource: {
    isInitialized: true,
    getRepository: vi.fn(),
  },
}));

describe('LeaderboardService', () => {
  let leaderboardService: LeaderboardService;
  let mockRepo: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock query builder
    mockQueryBuilder = {
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      getMany: vi.fn(),
    };

    // Setup mock repository
    mockRepo = {
      findOneBy: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
      createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
    };

    vi.mocked(AppDataSource.getRepository).mockReturnValue(mockRepo);

    leaderboardService = new LeaderboardService();
  });

  describe('updateFromBet', () => {
    it('should create new entry for new player', async () => {
      const bet = {
        address: '0x1234567890123456789012345678901234567890',
        amount: 100,
        cashedOut: false,
        payout: null,
        cashoutMultiplier: null,
      };

      mockRepo.findOneBy.mockResolvedValue(null);
      const newEntry = {
        address: bet.address,
        totalWagered: 0,
        gamesPlayed: 0,
        totalWon: 0,
        biggestWin: 0,
        biggestMultiplier: 0,
      };
      mockRepo.create.mockReturnValue(newEntry);
      mockRepo.save.mockResolvedValue({
        ...newEntry,
        totalWagered: 100,
        gamesPlayed: 1,
      });

      const result = await leaderboardService.updateFromBet(bet);

      expect(mockRepo.findOneBy).toHaveBeenCalledWith({ address: bet.address });
      expect(mockRepo.create).toHaveBeenCalledWith({ address: bet.address });
      expect(result.totalWagered).toBe(100);
      expect(result.gamesPlayed).toBe(1);
    });

    it('should update existing entry for known player', async () => {
      const existingEntry = {
        address: '0x1234567890123456789012345678901234567890',
        totalWagered: 500,
        gamesPlayed: 5,
        totalWon: 100,
        biggestWin: 50,
        biggestMultiplier: 2.0,
        lastPlayed: 1000000,
      };

      const bet = {
        address: existingEntry.address,
        amount: 100,
        cashedOut: false,
        payout: null,
        cashoutMultiplier: null,
      };

      mockRepo.findOneBy.mockResolvedValue(existingEntry);
      mockRepo.save.mockResolvedValue({
        ...existingEntry,
        totalWagered: 600,
        gamesPlayed: 6,
      });

      const result = await leaderboardService.updateFromBet(bet);

      expect(mockRepo.findOneBy).toHaveBeenCalledWith({ address: bet.address });
      expect(result.totalWagered).toBe(600);
      expect(result.gamesPlayed).toBe(6);
    });

    it('should increment totalWagered correctly', async () => {
      const entry = {
        address: '0x1234567890123456789012345678901234567890',
        totalWagered: 1000,
        gamesPlayed: 10,
        totalWon: 0,
      };

      const bet = {
        address: entry.address,
        amount: 250,
        cashedOut: false,
      };

      mockRepo.findOneBy.mockResolvedValue(entry);
      mockRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const result = await leaderboardService.updateFromBet(bet);

      expect(result.totalWagered).toBe(1250);
    });

    it('should increment gamesPlayed counter', async () => {
      const entry = {
        address: '0x1234567890123456789012345678901234567890',
        totalWagered: 0,
        gamesPlayed: 5,
        totalWon: 0,
      };

      const bet = {
        address: entry.address,
        amount: 100,
        cashedOut: false,
      };

      mockRepo.findOneBy.mockResolvedValue(entry);
      mockRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const result = await leaderboardService.updateFromBet(bet);

      expect(result.gamesPlayed).toBe(6);
    });

    it('should update lastPlayed timestamp', async () => {
      const oldTimestamp = 1000000;
      const entry = {
        address: '0x1234567890123456789012345678901234567890',
        totalWagered: 0,
        gamesPlayed: 0,
        totalWon: 0,
        lastPlayed: oldTimestamp,
      };

      const bet = {
        address: entry.address,
        amount: 100,
        cashedOut: false,
      };

      mockRepo.findOneBy.mockResolvedValue(entry);
      mockRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const result = await leaderboardService.updateFromBet(bet);

      expect(result.lastPlayed).toBeGreaterThan(oldTimestamp);
    });

    it('should calculate and add profit for cashed out bets', async () => {
      const entry = {
        address: '0x1234567890123456789012345678901234567890',
        totalWagered: 0,
        gamesPlayed: 0,
        totalWon: 100,
        biggestWin: 0,
      };

      const bet = {
        address: entry.address,
        amount: 100,
        cashedOut: true,
        payout: 250,
        cashoutMultiplier: 2.5,
      };

      mockRepo.findOneBy.mockResolvedValue(entry);
      mockRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const result = await leaderboardService.updateFromBet(bet);

      // Profit = 250 - 100 = 150
      expect(result.totalWon).toBe(250); // 100 + 150
    });

    it('should update biggestWin when applicable', async () => {
      const entry = {
        address: '0x1234567890123456789012345678901234567890',
        totalWagered: 0,
        gamesPlayed: 0,
        totalWon: 0,
        biggestWin: 50,
      };

      const bet = {
        address: entry.address,
        amount: 100,
        cashedOut: true,
        payout: 300,
        cashoutMultiplier: 3.0,
      };

      mockRepo.findOneBy.mockResolvedValue(entry);
      mockRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const result = await leaderboardService.updateFromBet(bet);

      // New profit = 300 - 100 = 200, which is > 50
      expect(result.biggestWin).toBe(200);
    });

    it('should not update biggestWin for smaller wins', async () => {
      const entry = {
        address: '0x1234567890123456789012345678901234567890',
        totalWagered: 0,
        gamesPlayed: 0,
        totalWon: 0,
        biggestWin: 500,
      };

      const bet = {
        address: entry.address,
        amount: 100,
        cashedOut: true,
        payout: 150,
        cashoutMultiplier: 1.5,
      };

      mockRepo.findOneBy.mockResolvedValue(entry);
      mockRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const result = await leaderboardService.updateFromBet(bet);

      // New profit = 150 - 100 = 50, which is < 500
      expect(result.biggestWin).toBe(500);
    });

    it('should update biggestMultiplier when applicable', async () => {
      const entry = {
        address: '0x1234567890123456789012345678901234567890',
        totalWagered: 0,
        gamesPlayed: 0,
        totalWon: 0,
        biggestMultiplier: 2.0,
      };

      const bet = {
        address: entry.address,
        amount: 100,
        cashedOut: true,
        payout: 500,
        cashoutMultiplier: 5.0,
      };

      mockRepo.findOneBy.mockResolvedValue(entry);
      mockRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const result = await leaderboardService.updateFromBet(bet);

      expect(result.biggestMultiplier).toBe(5.0);
    });

    it('should not update biggestMultiplier for smaller multipliers', async () => {
      const entry = {
        address: '0x1234567890123456789012345678901234567890',
        totalWagered: 0,
        gamesPlayed: 0,
        totalWon: 0,
        biggestMultiplier: 10.0,
      };

      const bet = {
        address: entry.address,
        amount: 100,
        cashedOut: true,
        payout: 200,
        cashoutMultiplier: 2.0,
      };

      mockRepo.findOneBy.mockResolvedValue(entry);
      mockRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const result = await leaderboardService.updateFromBet(bet);

      expect(result.biggestMultiplier).toBe(10.0);
    });

    it('should handle bets without cashout properly', async () => {
      const entry = {
        address: '0x1234567890123456789012345678901234567890',
        totalWagered: 0,
        gamesPlayed: 0,
        totalWon: 100,
        biggestWin: 50,
        biggestMultiplier: 2.0,
      };

      const bet = {
        address: entry.address,
        amount: 100,
        cashedOut: false,
        payout: null,
        cashoutMultiplier: null,
      };

      mockRepo.findOneBy.mockResolvedValue(entry);
      mockRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const result = await leaderboardService.updateFromBet(bet);

      // TotalWon should not change when not cashed out
      expect(result.totalWon).toBe(100);
      expect(result.biggestWin).toBe(50);
      expect(result.biggestMultiplier).toBe(2.0);
    });
  });

  describe('getTop', () => {
    it('should return players ordered by totalWon DESC', async () => {
      const mockLeaderboard = [
        { address: '0x111', totalWon: 1000 },
        { address: '0x222', totalWon: 500 },
        { address: '0x333', totalWon: 100 },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockLeaderboard);

      const result = await leaderboardService.getTop();

      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('lb');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('lb.totalWon', 'DESC');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(100);
      expect(result).toEqual(mockLeaderboard);
    });

    it('should respect default limit of 100', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await leaderboardService.getTop();

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(100);
    });

    it('should handle custom limits', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await leaderboardService.getTop(50);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(50);
    });

    it('should handle custom limit of 10', async () => {
      const mockData = Array.from({ length: 10 }, (_, i) => ({
        address: `0x${i}`,
        totalWon: 100 - i,
      }));
      mockQueryBuilder.getMany.mockResolvedValue(mockData);

      const result = await leaderboardService.getTop(10);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(10);
    });

    it('should return empty array when no entries exist', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await leaderboardService.getTop();

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
