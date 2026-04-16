import { AppDataSource } from '../config/database.js';
import { FreeBet } from '../entities/free-bet.entity.js';
import { User } from '../entities/user.entity.js';
import { logger } from '../utils/logger.js';

export class FreeBetService {
    private freeBetRepo = AppDataSource.getRepository(FreeBet);
    private userRepo = AppDataSource.getRepository(User);

    /**
     * Get remaining free bets for a user
     */
    async getFreeBetsRemaining(userId: string): Promise<number> {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        // Check if free bets have expired
        if (user.freeBetsExpiresAt && new Date() > user.freeBetsExpiresAt) {
            return 0;
        }

        return user.freeBetsRemaining;
    }

    /**
     * Get free bet max amount
     */
    async getFreeBetMaxAmount(userId: string): Promise<number> {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new Error('User not found');
        return Number(user.freeBetMaxAmount);
    }

    /**
     * Use a free bet
     */
    async useFreeBet(userId: string, amount: number, roundId: number, txHash?: string): Promise<FreeBet> {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        // Check if free bets have expired
        if (user.freeBetsExpiresAt && new Date() > user.freeBetsExpiresAt) {
            throw new Error('Free bets have expired');
        }

        if (user.freeBetsRemaining <= 0) {
            throw new Error('No free bets remaining');
        }

        if (amount > Number(user.freeBetMaxAmount)) {
            throw new Error(`Free bet amount exceeds maximum of ${user.freeBetMaxAmount} USDC`);
        }

        // Create free bet record
        const freeBet = this.freeBetRepo.create({
            userId,
            roundId,
            amount,
            txHash: txHash || null,
            used: true,
        });

        await this.freeBetRepo.save(freeBet);

        // Decrement free bets remaining
        user.freeBetsRemaining -= 1;
        await this.userRepo.save(user);

        logger.info(`Used free bet for user ${userId}, ${user.freeBetsRemaining} remaining`);

        return freeBet;
    }

    /**
     * Add free bets to a user (admin function)
     */
    async addFreeBets(userId: string, count: number): Promise<User> {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        user.freeBetsRemaining += count;
        // Reset expiration when adding new free bets
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 30);
        user.freeBetsExpiresAt = expirationDate;
        await this.userRepo.save(user);

        logger.info(`Added ${count} free bets to user ${userId}, total: ${user.freeBetsRemaining}`);

        return user;
    }

    /**
     * Set free bets for a user (admin function)
     */
    async setFreeBets(userId: string, count: number): Promise<User> {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        user.freeBetsRemaining = count;
        // Reset expiration when setting free bets
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 30);
        user.freeBetsExpiresAt = expirationDate;
        await this.userRepo.save(user);

        logger.info(`Set free bets for user ${userId} to ${count}`);

        return user;
    }

    /**
     * Set free bet max amount (admin function)
     */
    async setFreeBetMaxAmount(userId: string, maxAmount: number): Promise<User> {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        user.freeBetMaxAmount = maxAmount;
        await this.userRepo.save(user);

        logger.info(`Set free bet max amount for user ${userId} to ${maxAmount}`);

        return user;
    }

    /**
     * Get free bet history for a user
     */
    async getFreeBetHistory(userId: string, limit: number = 50): Promise<FreeBet[]> {
        return this.freeBetRepo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }

    /**
     * Get all users with free bets
     */
    async getUsersWithFreeBets(): Promise<User[]> {
        return this.userRepo
            .createQueryBuilder('user')
            .where('user.freeBetsRemaining > 0')
            .orderBy('user.createdAt', 'DESC')
            .getMany();
    }
}

export const freeBetService = new FreeBetService();
