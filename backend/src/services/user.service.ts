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
        let user = await this.userRepo.findOne({ where: { address } });

        if (!user) {
            user = this.userRepo.create({
                address,
                role: UserRole.PLAYER,
                source: UserSource.WALLET,
                isActive: true,
                permissions: [],
                freeBetsRemaining: 2,
                freeBetMaxAmount: 0.1,
                freeBetsExpiresAt: this.getFreeBetsExpirationDate(),
            });
            await this.userRepo.save(user);
            logger.info(`Created new player from wallet: ${address}`);
        }

        return user;
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
        let user = await this.userRepo.findOne({ where: { farcasterId } });

        if (!user) {
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
            logger.info(`Created new player from Farcaster: ${username} (FID: ${farcasterId})`);
        } else {
            // Update profile if changed
            const updated = await this.updateUserProfile(user.id, {
                displayName,
                avatarUrl,
                bio,
            });
            user = updated;
        }

        return user;
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
        return this.userRepo.findOne({ where: { address } });
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
        const user = this.userRepo.create({
            address,
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
}

export const userService = new UserService();
