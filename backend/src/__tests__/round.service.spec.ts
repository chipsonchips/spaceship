import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoundService } from '../services/round.service.ts';
import { AppDataSource } from '../config/database.ts';
import { Round } from '../entities/round.entity.ts';
import { PlayerBet } from '../entities/player-bet.entity.ts';

// Mock the database
vi.mock('../config/database.ts', () => ({
  AppDataSource: {
    isInitialized: true,
    getRepository: vi.fn(),
  },
}));

describe('RoundService', () => {
  let roundService: RoundService;
  let mockRoundRepo: any;
  let mockBetRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock round repository
    mockRoundRepo = {
      create: vi.fn(),
      save: vi.fn(),
      findOne: vi.fn(),
    };

    // Setup mock bet repository
    mockBetRepo = {
      create: vi.fn(),
      save: vi.fn(),
      findOne: vi.fn(),
    };

    // Mock AppDataSource.getRepository to return appropriate repo
    vi.mocked(AppDataSource.getRepository).mockImplementation((entity: any) => {
      if (entity === Round || entity.name === 'Round') {
        return mockRoundRepo;
      }
      return mockBetRepo;
    });

    roundService = new RoundService();
  });

  describe('createRound', () => {
    it('should create and save round entity', async () => {
      const roundData: Partial<Round> = {
        roundId: 1,
        serverSeed: 'test-seed',
        serverSeedHash: '0xhash',
        phase: 'BETTING',
        startTime: Date.now(),
      };

      const mockEntity = { id: 1, ...roundData, players: [] };
      mockRoundRepo.create.mockReturnValue(mockEntity);
      mockRoundRepo.save.mockResolvedValue(mockEntity);

      const result = await roundService.createRound(roundData);

      expect(mockRoundRepo.create).toHaveBeenCalledWith(roundData);
      expect(mockRoundRepo.save).toHaveBeenCalledWith(mockEntity);
      expect(result).toEqual(mockEntity);
    });

    it('should return the created round', async () => {
      const roundData: Partial<Round> = {
        roundId: 2,
        phase: 'BETTING',
      };

      const savedRound = { id: 2, ...roundData, players: [] };
      mockRoundRepo.create.mockReturnValue(savedRound);
      mockRoundRepo.save.mockResolvedValue(savedRound);

      const result = await roundService.createRound(roundData);

      expect(result).toBeDefined();
      expect(result.id).toBe(2);
      expect(result.roundId).toBe(2);
    });

    it('should handle partial round data', async () => {
      const minimalData: Partial<Round> = {
        roundId: 3,
      };

      mockRoundRepo.create.mockReturnValue(minimalData);
      mockRoundRepo.save.mockResolvedValue(minimalData);

      const result = await roundService.createRound(minimalData);

      expect(mockRoundRepo.create).toHaveBeenCalledWith(minimalData);
      expect(result).toEqual(minimalData);
    });
  });

  describe('getCurrentRound', () => {
    it('should return most recent round with players relation', async () => {
      const mockRound = {
        id: 1,
        roundId: 5,
        phase: 'FLYING',
        players: [
          { id: 1, address: '0x111', amount: 100 },
          { id: 2, address: '0x222', amount: 200 },
        ],
      };

      mockRoundRepo.findOne.mockResolvedValue(mockRound);

      const result = await roundService.getCurrentRound();

      expect(mockRoundRepo.findOne).toHaveBeenCalledWith({
        where: {},
        relations: ['players'],
        order: { roundId: 'DESC' },
      });
      expect(result).toEqual(mockRound);
      expect(result?.players).toHaveLength(2);
    });

    it('should return null when no rounds exist', async () => {
      mockRoundRepo.findOne.mockResolvedValue(null);

      const result = await roundService.getCurrentRound();

      expect(result).toBeNull();
    });

    it('should order by roundId DESC to get latest', async () => {
      mockRoundRepo.findOne.mockResolvedValue(null);

      await roundService.getCurrentRound();

      expect(mockRoundRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { roundId: 'DESC' },
        })
      );
    });

    it('should include players relation', async () => {
      mockRoundRepo.findOne.mockResolvedValue(null);

      await roundService.getCurrentRound();

      expect(mockRoundRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['players'],
        })
      );
    });
  });

  describe('addBet', () => {
    it('should create new bet for new player', async () => {
      const roundId = 1;
      const betData: Partial<PlayerBet> = {
        address: '0x1234567890123456789012345678901234567890',
        amount: 100,
        timestamp: Date.now(),
      };

      const mockRound = {
        id: 1,
        roundId,
        players: [],
      };

      const createdBet = { id: 1, ...betData, round: mockRound };

      mockRoundRepo.findOne.mockResolvedValue(mockRound);
      mockBetRepo.create.mockReturnValue(createdBet);
      mockBetRepo.save.mockResolvedValue(createdBet);

      const result = await roundService.addBet(roundId, betData);

      expect(mockRoundRepo.findOne).toHaveBeenCalledWith({
        where: { roundId },
        relations: ['players'],
      });
      expect(mockBetRepo.create).toHaveBeenCalledWith({ ...betData, round: mockRound });
      expect(mockBetRepo.save).toHaveBeenCalledWith(createdBet);
      expect(result).toEqual(createdBet);
    });

    it('should update existing bet for same player address (case-insensitive)', async () => {
      const roundId = 1;
      const existingBet = {
        id: 1,
        address: '0x1111111111111111111111111111111111111111',
        amount: 50,
        txHash: null,
        timestamp: 1000,
      };

      const mockRound = {
        id: 1,
        roundId,
        players: [existingBet],
      };

      const betData: Partial<PlayerBet> = {
        address: '0x1111111111111111111111111111111111111111', // Same address, uppercase
        amount: 100,
        txHash: '0xabc',
        timestamp: 2000,
      };

      mockRoundRepo.findOne.mockResolvedValue(mockRound);
      mockBetRepo.save.mockImplementation((bet: any) => Promise.resolve(bet));

      const result = await roundService.addBet(roundId, betData);

      expect(mockBetRepo.save).toHaveBeenCalled();
      expect(result.amount).toBe(100);
      expect(result.txHash).toBe('0xabc');
      expect(result.timestamp).toBe(2000);
      expect(mockBetRepo.create).not.toHaveBeenCalled(); // Should not create new
    });

    it('should handle case-insensitive address matching', async () => {
      const roundId = 1;
      const existingBet = {
        id: 1,
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
        amount: 50,
      };

      const mockRound = {
        id: 1,
        roundId,
        players: [existingBet],
      };

      const betData: Partial<PlayerBet> = {
        address: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12', // Uppercase version
        amount: 100,
      };

      mockRoundRepo.findOne.mockResolvedValue(mockRound);
      mockBetRepo.save.mockImplementation((bet: any) => Promise.resolve(bet));

      const result = await roundService.addBet(roundId, betData);

      expect(result.amount).toBe(100);
      expect(mockBetRepo.create).not.toHaveBeenCalled();
    });

    it('should throw error when round not found', async () => {
      const roundId = 999;
      const betData: Partial<PlayerBet> = {
        address: '0x1234567890123456789012345678901234567890',
        amount: 100,
      };

      mockRoundRepo.findOne.mockResolvedValue(null);

      await expect(roundService.addBet(roundId, betData)).rejects.toThrow('Round not found');
    });

    it('should properly link bet to round', async () => {
      const roundId = 1;
      const mockRound = {
        id: 1,
        roundId,
        players: [],
      };

      const betData: Partial<PlayerBet> = {
        address: '0x1234567890123456789012345678901234567890',
        amount: 100,
      };

      mockRoundRepo.findOne.mockResolvedValue(mockRound);
      mockBetRepo.create.mockImplementation((data: any) => data);
      mockBetRepo.save.mockImplementation((bet: any) => Promise.resolve(bet));

      await roundService.addBet(roundId, betData);

      expect(mockBetRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          round: mockRound,
        })
      );
    });

    it('should preserve other bet fields when updating', async () => {
      const existingBet = {
        id: 1,
        address: '0x1111111111111111111111111111111111111111',
        amount: 50,
        txHash: '0xold',
        timestamp: 1000,
        cashedOut: false,
      };

      const mockRound = {
        id: 1,
        roundId: 1,
        players: [existingBet],
      };

      const betData: Partial<PlayerBet> = {
        address: '0x1111111111111111111111111111111111111111',
        amount: 100,
      };

      mockRoundRepo.findOne.mockResolvedValue(mockRound);
      mockBetRepo.save.mockImplementation((bet: any) => Promise.resolve(bet));

      await roundService.addBet(1, betData);

      expect(mockBetRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          cashedOut: false,
        })
      );
    });
  });

  describe('cashOut', () => {
    it('should update bet with cashout data', async () => {
      const betId = 1;
      const multiplier = 2.5;

      const mockBet = {
        id: betId,
        address: '0x1234567890123456789012345678901234567890',
        amount: 100,
        cashedOut: false,
        cashoutMultiplier: null,
        payout: null,
        round: { id: 1, roundId: 1 },
      };

      mockBetRepo.findOne.mockResolvedValue(mockBet);
      mockBetRepo.save.mockImplementation((bet: any) => Promise.resolve(bet));

      const result = await roundService.cashOut(betId, multiplier);

      expect(mockBetRepo.findOne).toHaveBeenCalledWith({
        where: { id: betId },
        relations: ['round'],
      });
      expect(result.cashedOut).toBe(true);
      expect(result.cashoutMultiplier).toBe(2.5);
    });

    it('should calculate payout correctly (amount × multiplier)', async () => {
      const mockBet = {
        id: 1,
        amount: 100,
        cashedOut: false,
        round: { id: 1 },
      };

      mockBetRepo.findOne.mockResolvedValue(mockBet);
      mockBetRepo.save.mockImplementation((bet: any) => Promise.resolve(bet));

      const result = await roundService.cashOut(1, 3.0);

      expect(result.payout).toBe(300); // 100 * 3.0
    });

    it('should mark bet as cashed out', async () => {
      const mockBet = {
        id: 1,
        amount: 50,
        cashedOut: false,
        round: { id: 1 },
      };

      mockBetRepo.findOne.mockResolvedValue(mockBet);
      mockBetRepo.save.mockImplementation((bet: any) => Promise.resolve(bet));

      const result = await roundService.cashOut(1, 2.0);

      expect(result.cashedOut).toBe(true);
      expect(mockBetRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          cashedOut: true,
        })
      );
    });

    it('should throw error when bet not found', async () => {
      mockBetRepo.findOne.mockResolvedValue(null);

      await expect(roundService.cashOut(999, 2.0)).rejects.toThrow('Bet not found');
    });

    it('should handle decimal multipliers correctly', async () => {
      const mockBet = {
        id: 1,
        amount: 100,
        cashedOut: false,
        round: { id: 1 },
      };

      mockBetRepo.findOne.mockResolvedValue(mockBet);
      mockBetRepo.save.mockImplementation((bet: any) => Promise.resolve(bet));

      const result = await roundService.cashOut(1, 1.5);

      expect(result.payout).toBe(150);
      expect(result.cashoutMultiplier).toBe(1.5);
    });

    it('should include round relation in query', async () => {
      mockBetRepo.findOne.mockResolvedValue(null);

      await expect(roundService.cashOut(1, 2.0)).rejects.toThrow();

      expect(mockBetRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['round'],
        })
      );
    });

    it('should save updated bet to database', async () => {
      const mockBet = {
        id: 1,
        amount: 100,
        cashedOut: false,
        round: { id: 1 },
      };

      mockBetRepo.findOne.mockResolvedValue(mockBet);
      mockBetRepo.save.mockImplementation((bet: any) => Promise.resolve(bet));

      await roundService.cashOut(1, 2.0);

      expect(mockBetRepo.save).toHaveBeenCalled();
    });
  });
});
