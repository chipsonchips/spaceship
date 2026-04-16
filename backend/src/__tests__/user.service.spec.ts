import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../services/user.service.ts';
import { AppDataSource } from '../config/database.ts';
import { User, UserRole, UserSource } from '../entities/user.entity.ts';

// Mock dependencies
vi.mock('../config/database.ts', () => ({
    AppDataSource: {
        getRepository: vi.fn(),
    },
}));

vi.mock('@/utils/logger.ts', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// Helper to create a minimal User object for testing
const createMockUser = (overrides: Partial<User> = {}): User => ({
    id: 'user-123',
    address: null,
    farcasterId: null,
    email: null,
    username: null,
    displayName: null,
    bio: null,
    avatarUrl: null,
    farcasterUsername: null,
    role: UserRole.PLAYER,
    permissions: [],
    source: UserSource.WALLET,
    isActive: true,
    isVerified: false,
    verificationToken: null,
    adminNotes: null,
    lastLoginAt: null,
    lastActivityAt: null,
    preferences: {},
    freeBetsRemaining: 2,
    freeBetMaxAmount: 0.1,
    freeBetsExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    adminLogs: [],
    ...overrides,
} as User);

describe('UserService', () => {
    let userService: UserService;
    let mockUserRepo: any;

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Create mock repository
        mockUserRepo = {
            findOne: vi.fn(),
            create: vi.fn(),
            save: vi.fn(),
            find: vi.fn(),
            update: vi.fn(),
        };

        // Mock AppDataSource.getRepository
        vi.mocked(AppDataSource.getRepository).mockReturnValue(mockUserRepo);

        // Create service instance
        userService = new UserService();
    });

    describe('getOrCreatePlayerFromWallet', () => {
        it('should return existing user if wallet address exists', async () => {
            const existingUser = createMockUser({
                address: '0x1234567890123456789012345678901234567890',
                username: 'testuser',
            });

            mockUserRepo.findOne.mockResolvedValue(existingUser);

            const result = await userService.getOrCreatePlayerFromWallet(existingUser.address!);

            expect(result).toEqual(existingUser);
            expect(mockUserRepo.findOne).toHaveBeenCalledWith({
                where: { address: existingUser.address },
            });
            expect(mockUserRepo.create).not.toHaveBeenCalled();
        });

        it('should create new user if wallet address does not exist', async () => {
            const address = '0x1234567890123456789012345678901234567890';
            const newUser = createMockUser({
                id: 'user-new',
                address,
                username: null,
                source: UserSource.WALLET,
            });

            mockUserRepo.findOne.mockResolvedValue(null);
            mockUserRepo.create.mockReturnValue(newUser);
            mockUserRepo.save.mockResolvedValue(newUser);

            const result = await userService.getOrCreatePlayerFromWallet(address);

            expect(result).toEqual(newUser);
            const createCall = mockUserRepo.create.mock.calls[0][0];
            expect(createCall.address).toBe(address);
            expect(createCall.role).toBe(UserRole.PLAYER);
            expect(createCall.source).toBe(UserSource.WALLET);
            expect(createCall.isActive).toBe(true);
            expect(createCall.permissions).toEqual([]);
            expect(createCall.freeBetsRemaining).toBe(2);
            expect(createCall.freeBetMaxAmount).toBe(0.1);
            expect(createCall.freeBetsExpiresAt).toBeDefined();
            expect(mockUserRepo.save).toHaveBeenCalledWith(newUser);
        });

        it('should initialize permissions as empty array for new users', async () => {
            const address = '0x1234567890123456789012345678901234567890';
            const newUser = createMockUser({
                id: 'user-new',
                address,
                username: null,
                source: UserSource.WALLET,
            });

            mockUserRepo.findOne.mockResolvedValue(null);
            mockUserRepo.create.mockReturnValue(newUser);
            mockUserRepo.save.mockResolvedValue(newUser);

            await userService.getOrCreatePlayerFromWallet(address);

            const createCall = mockUserRepo.create.mock.calls[0][0];
            expect(createCall.permissions).toEqual([]);
            expect(Array.isArray(createCall.permissions)).toBe(true);
        });
    });

    describe('getOrCreatePlayerFromFarcaster', () => {
        it('should return existing user if Farcaster ID exists', async () => {
            const existingUser = createMockUser({
                farcasterId: 12345,
                username: 'farcaster_user',
                displayName: 'Farcaster User',
            });

            mockUserRepo.findOne.mockResolvedValue(existingUser);

            const result = await userService.getOrCreatePlayerFromFarcaster(
                12345,
                'farcaster_user',
                'Farcaster User'
            );

            expect(result).toEqual(existingUser);
            expect(mockUserRepo.findOne).toHaveBeenCalledWith({
                where: { farcasterId: 12345 },
            });
        });

        it('should create new user from Farcaster profile', async () => {
            const newUser = createMockUser({
                id: 'user-new',
                farcasterId: 12345,
                username: 'farcaster_user',
                displayName: 'Farcaster User',
                avatarUrl: 'https://example.com/avatar.jpg',
                bio: 'Test bio',
                source: UserSource.FARCASTER,
            });

            mockUserRepo.findOne.mockResolvedValue(null);
            mockUserRepo.create.mockReturnValue(newUser);
            mockUserRepo.save.mockResolvedValue(newUser);

            const result = await userService.getOrCreatePlayerFromFarcaster(
                12345,
                'farcaster_user',
                'Farcaster User',
                'https://example.com/avatar.jpg',
                'Test bio'
            );

            expect(result).toEqual(newUser);
            const createCall = mockUserRepo.create.mock.calls[0][0];
            expect(createCall.farcasterId).toBe(12345);
            expect(createCall.farcasterUsername).toBe('farcaster_user');
            expect(createCall.username).toBe('farcaster_user');
            expect(createCall.displayName).toBe('Farcaster User');
            expect(createCall.avatarUrl).toBe('https://example.com/avatar.jpg');
            expect(createCall.bio).toBe('Test bio');
            expect(createCall.role).toBe(UserRole.PLAYER);
            expect(createCall.source).toBe(UserSource.FARCASTER);
            expect(createCall.isActive).toBe(true);
            expect(createCall.freeBetsRemaining).toBe(2);
            expect(createCall.freeBetMaxAmount).toBe(0.1);
            expect(createCall.freeBetsExpiresAt).toBeDefined();
        });
    });

    describe('updateUserProfile', () => {
        it('should update user profile with provided fields', async () => {
            const userId = 'user-123';
            const existingUser = createMockUser({
                id: userId,
                username: 'oldusername',
                displayName: 'Old Name',
            });

            const updatedUser: User = {
                ...existingUser,
                username: 'newusername',
                displayName: 'New Name',
            };

            mockUserRepo.findOne.mockResolvedValue(existingUser);
            mockUserRepo.save.mockResolvedValue(updatedUser);

            const result = await userService.updateUserProfile(userId, {
                username: 'newusername',
                displayName: 'New Name',
            });

            expect(result).toEqual(updatedUser);
            expect(mockUserRepo.save).toHaveBeenCalled();
        });

        it('should throw error if user not found', async () => {
            mockUserRepo.findOne.mockResolvedValue(null);

            await expect(
                userService.updateUserProfile('nonexistent', { username: 'test' })
            ).rejects.toThrow('User not found');
        });
    });

    describe('updateUserRole', () => {
        it('should update user role and permissions', async () => {
            const userId = 'user-123';
            const existingUser = createMockUser({
                id: userId,
                role: UserRole.PLAYER,
            });

            const updatedUser: User = {
                ...existingUser,
                role: UserRole.ADMIN,
                permissions: ['read:admin', 'write:house'],
            };

            mockUserRepo.findOne.mockResolvedValue(existingUser);
            mockUserRepo.save.mockResolvedValue(updatedUser);

            const result = await userService.updateUserRole(userId, UserRole.ADMIN, [
                'read:admin',
                'write:house',
            ]);

            expect(result.role).toBe(UserRole.ADMIN);
            expect(result.permissions).toEqual(['read:admin', 'write:house']);
        });
    });

    describe('hasPermission', () => {
        it('should return true if user has permission', async () => {
            const user = createMockUser({
                id: 'user-123',
                role: UserRole.PLAYER,
                permissions: ['read:admin', 'write:house'],
            });

            mockUserRepo.findOne.mockResolvedValue(user);

            const result = await userService.hasPermission('user-123', 'read:admin');

            expect(result).toBe(true);
        });

        it('should return false if user does not have permission', async () => {
            const user = createMockUser({
                id: 'user-123',
                role: UserRole.PLAYER,
                permissions: ['read:admin'],
            });

            mockUserRepo.findOne.mockResolvedValue(user);

            const result = await userService.hasPermission('user-123', 'write:house');

            expect(result).toBe(false);
        });

        it('should return true for admin users regardless of permissions', async () => {
            const user = createMockUser({
                id: 'user-123',
                role: UserRole.ADMIN,
                permissions: [],
            });

            mockUserRepo.findOne.mockResolvedValue(user);

            const result = await userService.hasPermission('user-123', 'any:permission');

            expect(result).toBe(true);
        });

        it('should return false if user not found', async () => {
            mockUserRepo.findOne.mockResolvedValue(null);

            const result = await userService.hasPermission('nonexistent', 'read:admin');

            expect(result).toBe(false);
        });
    });

    describe('deactivateUser', () => {
        it('should set isActive to false', async () => {
            const userId = 'user-123';
            const user = createMockUser({
                id: userId,
                isActive: true,
            });

            const deactivatedUser: User = {
                ...user,
                isActive: false,
            };

            mockUserRepo.findOne.mockResolvedValue(user);
            mockUserRepo.save.mockResolvedValue(deactivatedUser);

            const result = await userService.deactivateUser(userId);

            expect(result.isActive).toBe(false);
        });
    });

    describe('activateUser', () => {
        it('should set isActive to true', async () => {
            const userId = 'user-123';
            const user = createMockUser({
                id: userId,
                isActive: false,
            });

            const activatedUser: User = {
                ...user,
                isActive: true,
            };

            mockUserRepo.findOne.mockResolvedValue(user);
            mockUserRepo.save.mockResolvedValue(activatedUser);

            const result = await userService.activateUser(userId);

            expect(result.isActive).toBe(true);
        });
    });

    describe('updateLastLogin', () => {
        it('should update lastLoginAt timestamp', async () => {
            const userId = 'user-123';
            const beforeTime = Date.now();

            mockUserRepo.update.mockResolvedValue({ affected: 1 });

            await userService.updateLastLogin(userId);

            const afterTime = Date.now();
            const updateCall = mockUserRepo.update.mock.calls[0];

            expect(updateCall[0]).toEqual({ id: userId });
            expect(updateCall[1].lastLoginAt).toBeGreaterThanOrEqual(beforeTime);
            expect(updateCall[1].lastLoginAt).toBeLessThanOrEqual(afterTime);
        });
    });

    describe('updateLastActivity', () => {
        it('should update lastActivityAt timestamp', async () => {
            const userId = 'user-123';
            const beforeTime = Date.now();

            mockUserRepo.update.mockResolvedValue({ affected: 1 });

            await userService.updateLastActivity(userId);

            const afterTime = Date.now();
            const updateCall = mockUserRepo.update.mock.calls[0];

            expect(updateCall[0]).toEqual({ id: userId });
            expect(updateCall[1].lastActivityAt).toBeGreaterThanOrEqual(beforeTime);
            expect(updateCall[1].lastActivityAt).toBeLessThanOrEqual(afterTime);
        });
    });

    describe('getAllAdmins', () => {
        it('should return all admin users', async () => {
            const admins: User[] = [
                createMockUser({
                    id: 'admin-1',
                    username: 'admin1',
                    role: UserRole.ADMIN,
                    permissions: ['read:admin', 'write:house'],
                    createdAt: new Date('2024-01-01'),
                }),
                createMockUser({
                    id: 'admin-2',
                    username: 'admin2',
                    role: UserRole.ADMIN,
                    permissions: ['read:admin'],
                    createdAt: new Date('2024-01-02'),
                }),
            ];

            mockUserRepo.find.mockResolvedValue(admins);

            const result = await userService.getAllAdmins();

            expect(result).toEqual(admins);
            expect(mockUserRepo.find).toHaveBeenCalledWith({
                where: { role: UserRole.ADMIN },
                order: { createdAt: 'DESC' },
            });
        });
    });

    describe('getUserStats', () => {
        it('should return user stats for leaderboard', async () => {
            const user = createMockUser({
                id: 'user-123',
                address: '0x1234567890123456789012345678901234567890',
                username: 'testuser',
                displayName: 'Test User',
                avatarUrl: 'https://example.com/avatar.jpg',
            });

            mockUserRepo.findOne.mockResolvedValue(user);

            const result = await userService.getUserStats('user-123');

            expect(result).toEqual({
                id: user.id,
                address: user.address,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                role: user.role,
                createdAt: user.createdAt,
            });
        });

        it('should return null if user not found', async () => {
            mockUserRepo.findOne.mockResolvedValue(null);

            const result = await userService.getUserStats('nonexistent');

            expect(result).toBeNull();
        });
    });
});
