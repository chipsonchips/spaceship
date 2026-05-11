import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HistoryService } from '../services/history.service.ts';
import { AppDataSource } from '../config/database.ts';
import { GameHistory } from '../entities/game-history.entity.ts';

// Mock the database
vi.mock('../config/database.ts', () => ({
  AppDataSource: {
    isInitialized: true,
    getRepository: vi.fn(),
  },
}));

describe('HistoryService', () => {
  let historyService: HistoryService;
  let mockRepo: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock query builder
    mockQueryBuilder = {
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      getMany: vi.fn(),
    };

    // Setup mock repository
    mockRepo = {
      create: vi.fn(),
      save: vi.fn(),
      findOne: vi.fn(),
      createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
    };

    // Mock AppDataSource.getRepository to return our mock repo
    vi.mocked(AppDataSource.getRepository).mockReturnValue(mockRepo);

    historyService = new HistoryService();
  });

  describe('record', () => {
    it('should create and save history entity', async () => {
      const historyData: Partial<GameHistory> = {
        roundId: 1,
        crashMultiplier: 2.5,
        totalBets: 1000,
        totalPayouts: 2500,
        winnersCount: 5,
        timestamp: Date.now(),
      };

      const mockEntity = { id: 1, ...historyData };
      mockRepo.create.mockReturnValue(mockEntity);
      mockRepo.save.mockResolvedValue(mockEntity);

      const result = await historyService.record(historyData);

      expect(mockRepo.create).toHaveBeenCalledWith(historyData);
      expect(mockRepo.save).toHaveBeenCalledWith(mockEntity);
      expect(result).toEqual(mockEntity);
    });

    it('should return the saved history record', async () => {
      const historyData: Partial<GameHistory> = {
        roundId: 2,
        crashMultiplier: 1.5,
      };

      const savedRecord = { id: 2, ...historyData };
      mockRepo.create.mockReturnValue(savedRecord);
      mockRepo.save.mockResolvedValue(savedRecord);

      const result = await historyService.record(historyData);

      expect(result).toBeDefined();
      expect(result.id).toBe(2);
      expect(result.roundId).toBe(2);
    });

    it('should handle partial history data', async () => {
      const minimalData: Partial<GameHistory> = {
        roundId: 3,
      };

      mockRepo.create.mockReturnValue(minimalData);
      mockRepo.save.mockResolvedValue(minimalData);

      const result = await historyService.record(minimalData);

      expect(mockRepo.create).toHaveBeenCalledWith(minimalData);
      expect(result).toEqual(minimalData);
    });
  });

  describe('latest', () => {
    it('should return results ordered by timestamp DESC', async () => {
      const mockHistory = [
        { id: 3, roundId: 3, timestamp: 3000 },
        { id: 2, roundId: 2, timestamp: 2000 },
        { id: 1, roundId: 1, timestamp: 1000 },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockHistory);

      const result = await historyService.latest();

      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('h');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('h.timestamp', 'DESC');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(20);
      expect(result).toEqual(mockHistory);
    });

    it('should respect default limit of 20', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await historyService.latest();

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(20);
    });

    it('should handle custom limits', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await historyService.latest(50);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(50);
    });

    it('should handle custom limit of 1', async () => {
      const mockHistory = [{ id: 1, roundId: 1, timestamp: 1000 }];
      mockQueryBuilder.getMany.mockResolvedValue(mockHistory);

      const result = await historyService.latest(1);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(1);
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no history exists', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await historyService.latest();

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should use query builder pattern correctly', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await historyService.latest(10);

      // Verify the query builder chain
      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('h');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('h.timestamp', 'DESC');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });
  });
});
