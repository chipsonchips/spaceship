import { AppDataSource } from '../config/database.js';
import { User, UserRole, UserSource } from '../entities/user.entity.js';
import { LeaderboardService } from './leaderboard.service.js';
import { logger } from '../utils/logger.js';

export class UserService {
    private userRepo = AppDataSource.getRepository(User);
    private leaderboardService = new LeaderboardService();

    /**
     * Get free bets expiration date (30 days from now)
     */
    private getFreeBetsExpirationDate(): Date {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 30);
        return expirationDate;
    }

    /**
     * Get or create a player from wallet address
     */
    async getOrCreatePlayerFromWallet(address: string): Promise<User> {
        try {
            const normalizedAddress = address.toLowerCase();
            logger.info(`getOrCreatePlayerFromWallet: Looking up user with address: ${normalizedAddress}`);
            let user = await this.userRepo.findOne({ where: { address: normalizedAddress } });

            if (!user) {
                logger.info(`getOrCreatePlayerFromWallet: User not found, creating new user for address: ${address}`);
                user = this.userRepo.create({
                    address: normalizedAddress,
                    role: UserRole.PLAYER,
                    source: UserSource.WALLET,
                    isActive: true,
                    permissions: [],
                    freeBetsRemaining: 2,
                    freeBetMaxAmount: 0.1,
                    freeBetsExpiresAt: this.getFreeBetsExpirationDate(),
                });
                await this.userRepo.save(user);
                logger.info(`Created new player from wallet: ${address}, userId: ${user.id}`);
            } else {
                logger.info(`getOrCreatePlayerFromWallet: Found existing user: ${user.id}`);
            }

            return user;
        } catch (error) {
            logger.error('getOrCreatePlayerFromWallet failed', {
                error: (error as Error).message,
                stack: (error as Error).stack,
                address,
            });
            throw error;
        }
    }

    /**
     * Get or create a player from Farcaster profile
     */
    async getOrCreatePlayerFromFarcaster(
        farcasterId: number,
        username: string,
        displayName: string,
        avatarUrl?: string,
        bio?: string
    ): Promise<User> {
        try {
            logger.info(`getOrCreatePlayerFromFarcaster: Looking up user with FID: ${farcasterId}`);
            let user = await this.userRepo.findOne({ where: { farcasterId } });

            if (!user) {
                logger.info(`getOrCreatePlayerFromFarcaster: User not found, creating new user for FID: ${farcasterId}`);
                user = this.userRepo.create({
                    farcasterId,
                    farcasterUsername: username,
                    username,
                    displayName,
                    avatarUrl,
                    bio,
                    role: UserRole.PLAYER,
                    source: UserSource.FARCASTER,
                    isActive: true,
                    freeBetsRemaining: 2,
                    freeBetMaxAmount: 0.1,
                    freeBetsExpiresAt: this.getFreeBetsExpirationDate(),
                });
                await this.userRepo.save(user);
                logger.info(`Created new player from Farcaster: ${username} (FID: ${farcasterId}), userId: ${user.id}`);
            } else {
                logger.info(`getOrCreatePlayerFromFarcaster: Found existing user: ${user.id}`);
                // Update profile if changed
                const updated = await this.updateUserProfile(user.id, {
                    displayName,
                    avatarUrl,
                    bio,
                });
                user = updated;
            }

            return user;
        } catch (error) {
            logger.error('getOrCreatePlayerFromFarcaster failed', {
                error: (error as Error).message,
                stack: (error as Error).stack,
                farcasterId,
                username,
            });
            throw error;
        }
    }

    /**
     * Link Farcaster profile to existing wallet user
     */
    async linkFarcasterToWallet(
        address: string,
        farcasterId: number,
        username: string,
        displayName: string,
        avatarUrl?: string
    ): Promise<User> {
        let user = await this.userRepo.findOne({ where: { address } });

        if (!user) {
            user = await this.getOrCreatePlayerFromWallet(address);
        }

        // Check if Farcaster ID is already linked to another user
        const existingFarcaster = await this.userRepo.findOne({
            where: { farcasterId },
        });

        if (existingFarcaster && existingFarcaster.id !== user.id) {
            throw new Error('Farcaster ID already linked to another account');
        }

        user.farcasterId = farcasterId;
        user.farcasterUsername = username;
        user.displayName = displayName;
        user.avatarUrl = avatarUrl || user.avatarUrl;

        await this.userRepo.save(user);
        logger.info(`Linked Farcaster ${username} to wallet ${address}`);

        return user;
    }

    /**
     * Get user by ID
     */
    async getUserById(userId: string): Promise<User | null> {
        return this.userRepo.findOne({ where: { id: userId } });
    }

    /**
     * Get user by wallet address
     */
    async getUserByAddress(address: string): Promise<User | null> {
        return this.userRepo.findOne({ where: { address: address.toLowerCase() } });
    }

    /**
     * Get user by Farcaster ID
     */
    async getUserByFarcasterId(farcasterId: number): Promise<User | null> {
        return this.userRepo.findOne({ where: { farcasterId } });
    }

    /**
     * Update user profile
     */
    async updateUserProfile(
        userId: string,
        updates: Partial<User>
    ): Promise<User> {
        const user = await this.getUserById(userId);
        if (!user) throw new Error('User not found');

        Object.assign(user, updates);
        await this.userRepo.save(user);

        // Update leaderboard if username changed
        if (updates.username && user.address) {
            await this.leaderboardService.updateUsername(user.address, updates.username);
        }

        return user;
    }

    /**
     * Update user role and permissions
     */
    async updateUserRole(
        userId: string,
        role: UserRole,
        permissions: string[] = []
    ): Promise<User> {
        const user = await this.getUserById(userId);
        if (!user) throw new Error('User not found');

        user.role = role;
        user.permissions = permissions;
        await this.userRepo.save(user);

        logger.info(`Updated user ${userId} role to ${role}`);

        return user;
    }

    /**
     * Check if user has permission
     */
    async hasPermission(userId: string, permission: string): Promise<boolean> {
        const user = await this.getUserById(userId);
        if (!user) return false;

        if (user.role === UserRole.ADMIN) return true; // Admins have all permissions
        return user.permissions.includes(permission);
    }

    /**
     * Create admin user
     */
    async createAdmin(
        address: string | null,
        email: string | null,
        username: string,
        permissions: string[]
    ): Promise<User> {
        const normalizedAddress = address ? address.toLowerCase() : null;
        const user = this.userRepo.create({
            address: normalizedAddress,
            email,
            username,
            displayName: username,
            role: UserRole.ADMIN,
            permissions,
            isActive: true,
            isVerified: true,
            source: address ? UserSource.WALLET : UserSource.WALLET,
        });

        await this.userRepo.save(user);
        logger.info(`Created admin user: ${username}`);

        return user;
    }

    /**
     * Deactivate user
     */
    async deactivateUser(userId: string): Promise<User> {
        const user = await this.getUserById(userId);
        if (!user) throw new Error('User not found');

        user.isActive = false;
        await this.userRepo.save(user);

        logger.info(`Deactivated user: ${userId}`);

        return user;
    }

    /**
     * Activate user
     */
    async activateUser(userId: string): Promise<User> {
        const user = await this.getUserById(userId);
        if (!user) throw new Error('User not found');

        user.isActive = true;
        await this.userRepo.save(user);

        logger.info(`Activated user: ${userId}`);

        return user;
    }

    /**
     * Update last activity timestamp
     */
    async updateLastActivity(userId: string): Promise<void> {
        await this.userRepo.update(
            { id: userId },
            { lastActivityAt: Date.now() }
        );
    }

    /**
     * Update last login timestamp
     */
    async updateLastLogin(userId: string): Promise<void> {
        await this.userRepo.update(
            { id: userId },
            { lastLoginAt: Date.now() }
        );
    }

    /**
     * Get all admins
     */
    async getAllAdmins(): Promise<User[]> {
        return this.userRepo.find({
            where: { role: UserRole.ADMIN },
            order: { createdAt: 'DESC' },
            relations: [],
        });
    }

    /**
     * Get user stats for leaderboard
     */
    async getUserStats(userId: string) {
        const user = await this.getUserById(userId);
        if (!user) return null;

        return {
            id: user.id,
            address: user.address,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            role: user.role,
            createdAt: user.createdAt,
        };
    }

    /**
     * Block a user
     */
    async blockUser(userId: string, reason: string): Promise<User> {
        const user = await this.getUserById(userId);
        if (!user) throw new Error('User not found');

        user.isBlocked = true;
        user.blockedAt = new Date();
        user.blockReason = reason;
        user.isActive = false;
        await this.userRepo.save(user);

        logger.info(`Blocked user: ${userId}, reason: ${reason}`);

        return user;
    }

    /**
     * Unblock a user
     */
    async unblockUser(userId: string): Promise<User> {
        const user = await this.getUserById(userId);
        if (!user) throw new Error('User not found');

        user.isBlocked = false;
        user.blockedAt = null;
        user.blockReason = null;
        user.isActive = true;
        await this.userRepo.save(user);

        logger.info(`Unblocked user: ${userId}`);

        return user;
    }

    /**
     * Suspend a user temporarily
     */
    async suspendUser(userId: string, durationDays: number, reason: string): Promise<User> {
        const user = await this.getUserById(userId);
        if (!user) throw new Error('User not found');

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);

        user.isSuspended = true;
        user.suspendedAt = new Date();
        user.suspensionExpiresAt = expiresAt;
        user.suspensionReason = reason;
        user.isActive = false;
        await this.userRepo.save(user);

        logger.info(`Suspended user: ${userId} for ${durationDays} days, reason: ${reason}`);

        return user;
    }

    /**
     * Unsuspend a user
     */
    async unsuspendUser(userId: string): Promise<User> {
        const user = await this.getUserById(userId);
        if (!user) throw new Error('User not found');

        user.isSuspended = false;
        user.suspendedAt = null;
        user.suspensionExpiresAt = null;
        user.suspensionReason = null;
        user.isActive = true;
        await this.userRepo.save(user);

        logger.info(`Unsuspended user: ${userId}`);

        return user;
    }

    /**
     * Check if user is currently suspended
     */
    async isUserSuspended(userId: string): Promise<boolean> {
        const user = await this.getUserById(userId);
        if (!user) return false;

        if (!user.isSuspended) return false;

        // Check if suspension has expired
        if (user.suspensionExpiresAt && new Date() > user.suspensionExpiresAt) {
            // Auto-unsuspend
            await this.unsuspendUser(userId);
            return false;
        }

        return true;
    }

    /**
     * Set daily bet limit for user
     */
    async setDailyBetLimit(userId: string, limit: number): Promise<User> {
        const user = await this.getUserById(userId);
        if (!user) throw new Error('User not found');

        user.dailyBetLimit = limit;
        user.dailyBetAmount = 0;
        user.dailyBetResetAt = new Date();
        await this.userRepo.save(user);

        logger.info(`Set daily bet limit for user ${userId}: ${limit}`);

        return user;
    }

    /**
     * Set weekly bet limit for user
     */
    async setWeeklyBetLimit(userId: string, limit: number): Promise<User> {
        const user = await this.getUserById(userId);
        if (!user) throw new Error('User not found');

        user.weeklyBetLimit = limit;
        user.weeklyBetAmount = 0;
        user.weeklyBetResetAt = new Date();
        await this.userRepo.save(user);

        logger.info(`Set weekly bet limit for user ${userId}: ${limit}`);

        return user;
    }

    /**
     * Set monthly bet limit for user
     */
    async setMonthlyBetLimit(userId: string, limit: number): Promise<User> {
        const user = await this.getUserById(userId);
        if (!user) throw new Error('User not found');

        user.monthlyBetLimit = limit;
        user.monthlyBetAmount = 0;
        user.monthlyBetResetAt = new Date();
        await this.userRepo.save(user);

        logger.info(`Set monthly bet limit for user ${userId}: ${limit}`);

        return user;
    }

    /**
     * Remove all bet limits for user
     */
    async removeBetLimits(userId: string): Promise<User> {
        const user = await this.getUserById(userId);
        if (!user) throw new Error('User not found');

        user.dailyBetLimit = null;
        user.weeklyBetLimit = null;
        user.monthlyBetLimit = null;
        user.dailyBetAmount = 0;
        user.weeklyBetAmount = 0;
        user.monthlyBetAmount = 0;
        await this.userRepo.save(user);

        logger.info(`Removed all bet limits for user ${userId}`);

        return user;
    }

    /**
     * Check if user can place a bet
     */
    async canUserBet(userId: string, betAmount: number): Promise<{ allowed: boolean; reason?: string }> {
        const user = await this.getUserById(userId);
        if (!user) return { allowed: false, reason: 'User not found' };

        if (user.isBlocked) return { allowed: false, reason: 'User is blocked' };

        const isSuspended = await this.isUserSuspended(userId);
        if (isSuspended) return { allowed: false, reason: 'User is suspended' };

        if (!user.isActive) return { allowed: false, reason: 'User account is inactive' };

        // Check daily limit
        if (user.dailyBetLimit) {
            const now = new Date();
            if (user.dailyBetResetAt && now.getTime() - user.dailyBetResetAt.getTime() > 24 * 60 * 60 * 1000) {
                user.dailyBetAmount = 0;
                user.dailyBetResetAt = now;
                await this.userRepo.save(user);
            }

            if (user.dailyBetAmount + betAmount > user.dailyBetLimit) {
                return {
                    allowed: false,
                    reason: `Daily bet limit exceeded. Limit: ${user.dailyBetLimit}, Current: ${user.dailyBetAmount}`,
                };
            }
        }

        // Check weekly limit
        if (user.weeklyBetLimit) {
            const now = new Date();
            if (user.weeklyBetResetAt && now.getTime() - user.weeklyBetResetAt.getTime() > 7 * 24 * 60 * 60 * 1000) {
                user.weeklyBetAmount = 0;
                user.weeklyBetResetAt = now;
                await this.userRepo.save(user);
            }

            if (user.weeklyBetAmount + betAmount > user.weeklyBetLimit) {
                return {
                    allowed: false,
                    reason: `Weekly bet limit exceeded. Limit: ${user.weeklyBetLimit}, Current: ${user.weeklyBetAmount}`,
                };
            }
        }

        // Check monthly limit
        if (user.monthlyBetLimit) {
            const now = new Date();
            if (user.monthlyBetResetAt && now.getTime() - user.monthlyBetResetAt.getTime() > 30 * 24 * 60 * 60 * 1000) {
                user.monthlyBetAmount = 0;
                user.monthlyBetResetAt = now;
                await this.userRepo.save(user);
            }

            if (user.monthlyBetAmount + betAmount > user.monthlyBetLimit) {
                return {
                    allowed: false,
                    reason: `Monthly bet limit exceeded. Limit: ${user.monthlyBetLimit}, Current: ${user.monthlyBetAmount}`,
                };
            }
        }

        return { allowed: true };
    }

    /**
     * Record a bet for limit tracking
     */
    async recordBet(userId: string, betAmount: number): Promise<void> {
        const user = await this.getUserById(userId);
        if (!user) throw new Error('User not found');

        user.dailyBetAmount = Number(user.dailyBetAmount) + betAmount;
        user.weeklyBetAmount = Number(user.weeklyBetAmount) + betAmount;
        user.monthlyBetAmount = Number(user.monthlyBetAmount) + betAmount;

        await this.userRepo.save(user);
    }
}

export const userService = new UserService();
