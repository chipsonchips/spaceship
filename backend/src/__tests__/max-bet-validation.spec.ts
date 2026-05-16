import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine } from '../services/game-engine.service.js';
import { AppDataSource } from '../config/database.js';
import { User, UserRole } from '../entities/user.entity.js';
import { Round } from '../entities/round.entity.js';

describe('Max Bet Amount Validation', () => {
    let gameEngine: GameEngine;
    let mockIo: any;
    let userRepo: any;
    let roundRepo: any;

    beforeEach(async () => {
        // Mock Socket.IO
        mockIo = {
            emit: vi.fn(),
            to: vi.fn().mockReturnThis(),
        };

        // Initialize game engine
        gameEngine = new GameEngine(mockIo);

        // Get repositories
        userRepo = AppDataSource.getRepository(User);
        roundRepo = AppDataSource.getRepository(Round);

        // Start the game engine
        await gameEngine.start();

        // Wait for initial round to be created
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should reject bet exceeding global max bet amount', async () => {
        // Set global max bet to 10 USDC
        process.env.MAX_BET_AMOUNT = '10';

        // Create a test user
        const user = userRepo.create({
            address: '0xTestAddress1',
            username: 'testuser1',
            role: UserRole.PLAYER,
            maxBetAmount: null, // Use global default
        });
        await userRepo.save(user);

        // Try to place a bet exceeding global max
        await expect(
            gameEngine.placeBet(user.address!, 15, 1, false)
        ).rejects.toThrow('Bet amount exceeds global maximum of 10 USDC');
    });

    it('should reject bet exceeding user-specific max bet amount', async () => {
        // Set global max bet to 10 USDC
        process.env.MAX_BET_AMOUNT = '10';

        // Create a test user with custom max bet
        const user = userRepo.create({
            address: '0xTestAddress2',
            username: 'testuser2',
            role: UserRole.PLAYER,
            maxBetAmount: 2, // User-specific limit
        });
        await userRepo.save(user);

        // Try to place a bet exceeding user's max
        await expect(
            gameEngine.placeBet(user.address!, 5, 1, false)
        ).rejects.toThrow('Bet amount exceeds your maximum of 2 USDC');
    });

    it('should accept bet within user-specific max bet amount', async () => {
        // Set global max bet to 10 USDC
        process.env.MAX_BET_AMOUNT = '10';

        // Create a test user with custom max bet
        const user = userRepo.create({
            address: '0xTestAddress3',
            username: 'testuser3',
            role: UserRole.PLAYER,
            maxBetAmount: 5,
        });
        await userRepo.save(user);

        // Mock chain service to avoid actual blockchain interaction
        const mockChainService = {
            placeBetFor: vi.fn().mockResolvedValue('0xmocktxhash'),
        };
        (gameEngine as any).chainServices.set(1, mockChainService);

        // Place a bet within user's max
        const bet = await gameEngine.placeBet(user.address!, 3, 1, false);
        expect(bet).toBeDefined();
        expect(bet.amount).toBe(3);
    });

    it('should enforce max bet for free bets', async () => {
        // Create a test user with free bets
        const user = userRepo.create({
            address: '0xTestAddress4',
            username: 'testuser4',
            role: UserRole.PLAYER,
            maxBetAmount: 5,
            freeBetsRemaining: 2,
            freeBetMaxAmount: 0.5,
        });
        await userRepo.save(user);

        // Try to place a free bet exceeding user's max bet amount
        await expect(
            gameEngine.placeBet(user.address!, 7, 1, true)
        ).rejects.toThrow('Bet amount exceeds your maximum of 5 USDC');
    });

    it('should use global max when user max is not set', async () => {
        // Set global max bet to 10 USDC
        process.env.MAX_BET_AMOUNT = '10';

        // Create a test user without custom max bet
        const user = userRepo.create({
            address: '0xTestAddress5',
            username: 'testuser5',
            role: UserRole.PLAYER,
            maxBetAmount: null,
        });
        await userRepo.save(user);

        // Mock chain service
        const mockChainService = {
            placeBetFor: vi.fn().mockResolvedValue('0xmocktxhash'),
        };
        (gameEngine as any).chainServices.set(1, mockChainService);

        // Place a bet within global max
        const bet = await gameEngine.placeBet(user.address!, 8, 1, false);
        expect(bet).toBeDefined();
        expect(bet.amount).toBe(8);
    });

    it('should reject bet below global minimum', async () => {
        // Set global min bet to 0.1 USDC
        process.env.MIN_BET_AMOUNT = '0.1';

        // Create a test user
        const user = userRepo.create({
            address: '0xTestAddress6',
            username: 'testuser6',
            role: UserRole.PLAYER,
        });
        await userRepo.save(user);

        // Try to place a bet below minimum
        await expect(
            gameEngine.placeBet(user.address!, 0.05, 1, false)
        ).rejects.toThrow('Bet amount must be at least 0.1 USDC');
    });
});
