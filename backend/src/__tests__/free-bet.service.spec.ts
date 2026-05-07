import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FreeBetService } from '../services/free-bet.service';
import { AppDataSource } from '../config/database';
import { FreeBet } from '../entities/free-bet.entity';
import { User } from '../entities/user.entity';

vi.mock('../config/database', () => ({
    AppDataSource: {
        getRepository: vi.fn(),
    },
}));

describe('FreeBetService', () => {
    let freeBetService: FreeBetService;
    let mockFreeBetRepo: any;
    let mockUserRepo: any;

    beforeEach(() => {
        mockFreeBetRepo = {
            findOne: vi.fn(),
            find: vi.fn(),
            save: vi.fn(),
            create: vi.fn(),
        };

        mockUserRepo = {
            findOne: vi.fn(),
            save: vi.fn(),
        };

        vi.mocked(AppDataSource.getRepository).mockImplementation((entity: any) => {
            if (entity === FreeBet) return mockFreeBetRepo;
            if (entity === User) return mockUserRepo;
            return {} as any;
        });

        freeBetService = new FreeBetService();
    });

    describe('getUserFreeBets', () => {
        it('returns free bet history for a user', async () => {
            const userId = '1';
            const mockFreeBets = [
                {
                    id: 1,
                    userId,
                    amount: 10,
                    used: true,
                    roundId: 1,
                },
                {
                    id: 2,
                    userId,
                    amount: 5,
                    used: true,
                    roundId: 2,
                },
            ];

            mockFreeBetRepo.find.mockResolvedValue(mockFreeBets);

            const result = await freeBetService.getFreeBetHistory(userId);

            expect(result).toEqual(mockFreeBets);
            expect(mockFreeBetRepo.find).toHaveBeenCalled();
        });

        it('returns empty array when no free bet history', async () => {
            mockFreeBetRepo.find.mockResolvedValue([]);

            const result = await freeBetService.getFreeBetHistory('1');

            expect(result).toEqual([]);
        });
    });

    describe('getAvailableFreeBet', () => {
        it('returns free bets remaining count', async () => {
            const userId = '1';
            const mockUser = {
                id: userId,
                freeBetsRemaining: 3,
                freeBetsExpiresAt: new Date(Date.now() + 86400000),
            };

            mockUserRepo.findOne.mockResolvedValue(mockUser);

            const result = await freeBetService.getFreeBetsRemaining(userId);

            expect(result).toBe(3);
        });

        it('returns 0 when no free bets available', async () => {
            const mockUser = {
                id: '1',
                freeBetsRemaining: 0,
                freeBetsExpiresAt: new Date(Date.now() + 86400000),
            };

            mockUserRepo.findOne.mockResolvedValue(mockUser);

            const result = await freeBetService.getFreeBetsRemaining('1');

            expect(result).toBe(0);
        });
    });

    describe('useFreeBet', () => {
        it('uses a free bet and decrements count', async () => {
            const userId = '1';
            const amount = 10;
            const roundId = 1;
            const mockUser = {
                id: userId,
                freeBetsRemaining: 5,
                freeBetMaxAmount: 50,
                freeBetsExpiresAt: new Date(Date.now() + 86400000),
            };

            const mockFreeBet = {
                id: 1,
                userId,
                amount,
                roundId,
                used: true,
            };

            mockUserRepo.findOne.mockResolvedValue(mockUser);
            mockFreeBetRepo.create.mockReturnValue(mockFreeBet);
            mockFreeBetRepo.save.mockResolvedValue(mockFreeBet);
            mockUserRepo.save.mockResolvedValue({ ...mockUser, freeBetsRemaining: 4 });

            const result = await freeBetService.useFreeBet(userId, amount, roundId);

            expect(result.used).toBe(true);
            expect(mockFreeBetRepo.save).toHaveBeenCalled();
            expect(mockUserRepo.save).toHaveBeenCalled();
        });

        it('throws error when user not found', async () => {
            mockUserRepo.findOne.mockResolvedValue(null);

            await expect(freeBetService.useFreeBet('999', 10, 1)).rejects.toThrow(
                'User not found'
            );
        });

        it('throws error when free bets expired', async () => {
            const mockUser = {
                id: '1',
                freeBetsRemaining: 5,
                freeBetMaxAmount: 50,
                freeBetsExpiresAt: new Date(Date.now() - 86400000), // Expired
            };

            mockUserRepo.findOne.mockResolvedValue(mockUser);

            await expect(freeBetService.useFreeBet('1', 10, 1)).rejects.toThrow(
                'Free bets have expired'
            );
        });

        it('throws error when no free bets remaining', async () => {
            const mockUser = {
                id: '1',
                freeBetsRemaining: 0,
                freeBetMaxAmount: 50,
                freeBetsExpiresAt: new Date(Date.now() + 86400000),
            };

            mockUserRepo.findOne.mockResolvedValue(mockUser);

            await expect(freeBetService.useFreeBet('1', 10, 1)).rejects.toThrow(
                'No free bets remaining'
            );
        });
    });

    describe('createFreeBet', () => {
        it('adds free bets to a user', async () => {
            const userId = '1';
            const count = 5;

            const mockUser = {
                id: userId,
                freeBetsRemaining: 0,
                freeBetMaxAmount: 50,
            };

            mockUserRepo.findOne.mockResolvedValue(mockUser);
            mockUserRepo.save.mockResolvedValue({
                ...mockUser,
                freeBetsRemaining: count,
            });

            const result = await freeBetService.addFreeBets(userId, count);

            expect(result.freeBetsRemaining).toBe(count);
            expect(mockUserRepo.save).toHaveBeenCalled();
        });

        it('sets free bets for a user', async () => {
            const userId = '1';
            const count = 10;

            const mockUser = {
                id: userId,
                freeBetsRemaining: 5,
                freeBetMaxAmount: 50,
            };

            mockUserRepo.findOne.mockResolvedValue(mockUser);
            mockUserRepo.save.mockResolvedValue({
                ...mockUser,
                freeBetsRemaining: count,
            });

            const result = await freeBetService.setFreeBets(userId, count);

            expect(result.freeBetsRemaining).toBe(count);
            expect(mockUserRepo.save).toHaveBeenCalled();
        });
    });

    describe('getFreeBetsRemaining', () => {
        it('returns free bets remaining for a user', async () => {
            const userId = '1';
            const mockUser = {
                id: userId,
                freeBetsRemaining: 5,
                freeBetMaxAmount: 10,
                freeBetsExpiresAt: new Date(Date.now() + 86400000),
            };

            mockUserRepo.findOne.mockResolvedValue(mockUser);

            const result = await freeBetService.getFreeBetsRemaining(userId);

            expect(result).toBe(5);
        });

        it('returns 0 when free bets expired', async () => {
            const userId = '1';
            const mockUser = {
                id: userId,
                freeBetsRemaining: 5,
                freeBetMaxAmount: 10,
                freeBetsExpiresAt: new Date(Date.now() - 86400000), // Expired
            };

            mockUserRepo.findOne.mockResolvedValue(mockUser);

            const result = await freeBetService.getFreeBetsRemaining(userId);

            expect(result).toBe(0);
        });
    });

    describe('getFreeBetMaxAmount', () => {
        it('returns max amount for a user', async () => {
            const userId = '1';
            const mockUser = {
                id: userId,
                freeBetMaxAmount: 50,
            };

            mockUserRepo.findOne.mockResolvedValue(mockUser);

            const result = await freeBetService.getFreeBetMaxAmount(userId);

            expect(result).toBe(50);
        });
    });
});
