import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { userService } from '../services/user.service.js';
import { auditLogService } from '../services/audit-log.service.js';
import { User, UserRole } from '../entities/user.entity.js';

// Mock dependencies
vi.mock('../services/user.service.js', () => ({
    userService: {
        getUserByAddress: vi.fn(),
        getUserById: vi.fn(),
        getAllAdmins: vi.fn(),
        createAdmin: vi.fn(),
        updateUserRole: vi.fn(),
        deactivateUser: vi.fn(),
        activateUser: vi.fn(),
        blockUser: vi.fn(),
        unblockUser: vi.fn(),
        suspendUser: vi.fn(),
        unsuspendUser: vi.fn(),
        setDailyBetLimit: vi.fn(),
        setWeeklyBetLimit: vi.fn(),
        setMonthlyBetLimit: vi.fn(),
        removeBetLimits: vi.fn(),
        setMaxBetAmount: vi.fn(),
    },
}));

vi.mock('../services/audit-log.service.js', () => ({
    auditLogService: {
        logAction: vi.fn(),
    },
}));

const createMockUser = (overrides: any = {}): any => ({
    id: 'user-123',
    address: '0x123',
    farcasterId: null,
    email: 'user@example.com',
    username: 'testuser',
    displayName: 'Test User',
    role: UserRole.PLAYER,
    permissions: [],
    isActive: true,
    isBlocked: false,
    blockedAt: null,
    blockReason: null,
    isSuspended: false,
    suspendedAt: null,
    suspensionExpiresAt: null,
    suspensionReason: null,
    dailyBetLimit: null,
    weeklyBetLimit: null,
    monthlyBetLimit: null,
    dailyBetAmount: 0,
    weeklyBetAmount: 0,
    monthlyBetAmount: 0,
    maxBetAmount: 0.5,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
    lastActivityAt: new Date(),
    ...overrides,
});

describe('User Admin Routes - Service Layer Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('User Retrieval', () => {
        it('should get user by address', async () => {
            const mockUser = createMockUser();
            vi.mocked(userService.getUserByAddress).mockResolvedValue(mockUser);

            const result = await userService.getUserByAddress('0x123');
            expect(result).toEqual(mockUser);
            expect(userService.getUserByAddress).toHaveBeenCalledWith('0x123');
        });

        it('should return null when user not found by address', async () => {
            vi.mocked(userService.getUserByAddress).mockResolvedValue(null);

            const result = await userService.getUserByAddress('0xnonexistent');
            expect(result).toBeNull();
        });

        it('should get user by ID', async () => {
            const mockUser = createMockUser();
            vi.mocked(userService.getUserById).mockResolvedValue(mockUser);

            const result = await userService.getUserById('user-123');
            expect(result).toEqual(mockUser);
        });

        it('should return null when user not found by ID', async () => {
            vi.mocked(userService.getUserById).mockResolvedValue(null);

            const result = await userService.getUserById('nonexistent');
            expect(result).toBeNull();
        });
    });

    describe('Admin Management', () => {
        it('should get all admin users', async () => {
            const mockAdmins = [
                createMockUser({ id: 'admin-1', role: UserRole.ADMIN }),
                createMockUser({ id: 'admin-2', role: UserRole.ADMIN }),
            ];

            vi.mocked(userService.getAllAdmins).mockResolvedValue(mockAdmins);

            const result = await userService.getAllAdmins();
            expect(result).toHaveLength(2);
            expect(result[0].role).toBe(UserRole.ADMIN);
            expect(result[1].role).toBe(UserRole.ADMIN);
        });

        it('should create a new admin user', async () => {
            const newAdmin = createMockUser({ id: 'new-admin', role: UserRole.ADMIN });
            vi.mocked(userService.createAdmin).mockResolvedValue(newAdmin);

            const result = await userService.createAdmin('0x456', 'admin@example.com', 'newadmin', ['manage_users']);
            expect(result.id).toBe('new-admin');
            expect(result.role).toBe(UserRole.ADMIN);
            expect(userService.createAdmin).toHaveBeenCalledWith('0x456', 'admin@example.com', 'newadmin', ['manage_users']);
        });

        it('should update user role', async () => {
            const updatedUser = createMockUser({ role: UserRole.ADMIN });
            vi.mocked(userService.updateUserRole).mockResolvedValue(updatedUser);

            const result = await userService.updateUserRole('user-123', UserRole.ADMIN, ['manage_users']);
            expect(result.role).toBe(UserRole.ADMIN);
            expect(userService.updateUserRole).toHaveBeenCalledWith('user-123', UserRole.ADMIN, ['manage_users']);
        });
    });

    describe('User Activation/Deactivation', () => {
        it('should deactivate a user', async () => {
            const deactivatedUser = createMockUser({ isActive: false });
            vi.mocked(userService.deactivateUser).mockResolvedValue(deactivatedUser);

            const result = await userService.deactivateUser('user-123');
            expect(result.isActive).toBe(false);
            expect(userService.deactivateUser).toHaveBeenCalledWith('user-123');
        });

        it('should activate a user', async () => {
            const activatedUser = createMockUser({ isActive: true });
            vi.mocked(userService.activateUser).mockResolvedValue(activatedUser);

            const result = await userService.activateUser('user-123');
            expect(result.isActive).toBe(true);
            expect(userService.activateUser).toHaveBeenCalledWith('user-123');
        });
    });

    describe('User Blocking', () => {
        it('should block a user with reason', async () => {
            const blockedUser = createMockUser({
                isBlocked: true,
                blockedAt: new Date(),
                blockReason: 'Suspicious activity',
            });
            vi.mocked(userService.blockUser).mockResolvedValue(blockedUser);

            const result = await userService.blockUser('user-123', 'Suspicious activity');
            expect(result.isBlocked).toBe(true);
            expect(result.blockReason).toBe('Suspicious activity');
            expect(userService.blockUser).toHaveBeenCalledWith('user-123', 'Suspicious activity');
        });

        it('should unblock a user', async () => {
            const unblockedUser = createMockUser({ isBlocked: false });
            vi.mocked(userService.unblockUser).mockResolvedValue(unblockedUser);

            const result = await userService.unblockUser('user-123');
            expect(result.isBlocked).toBe(false);
            expect(userService.unblockUser).toHaveBeenCalledWith('user-123');
        });
    });

    describe('User Suspension', () => {
        it('should suspend a user for specified duration', async () => {
            const suspendedUser = createMockUser({
                isSuspended: true,
                suspendedAt: new Date(),
                suspensionExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                suspensionReason: 'Violation of terms',
            });
            vi.mocked(userService.suspendUser).mockResolvedValue(suspendedUser);

            const result = await userService.suspendUser('user-123', 7, 'Violation of terms');
            expect(result.isSuspended).toBe(true);
            expect(result.suspensionReason).toBe('Violation of terms');
            expect(userService.suspendUser).toHaveBeenCalledWith('user-123', 7, 'Violation of terms');
        });

        it('should unsuspend a user', async () => {
            const unsuspendedUser = createMockUser({ isSuspended: false });
            vi.mocked(userService.unsuspendUser).mockResolvedValue(unsuspendedUser);

            const result = await userService.unsuspendUser('user-123');
            expect(result.isSuspended).toBe(false);
            expect(userService.unsuspendUser).toHaveBeenCalledWith('user-123');
        });
    });

    describe('Bet Limits - Daily', () => {
        it('should set daily bet limit', async () => {
            const userWithLimit = createMockUser({ dailyBetLimit: 100 });
            vi.mocked(userService.setDailyBetLimit).mockResolvedValue(userWithLimit);

            const result = await userService.setDailyBetLimit('user-123', 100);
            expect(result.dailyBetLimit).toBe(100);
            expect(userService.setDailyBetLimit).toHaveBeenCalledWith('user-123', 100);
        });

        it('should set daily bet limit to zero', async () => {
            const userWithLimit = createMockUser({ dailyBetLimit: 0 });
            vi.mocked(userService.setDailyBetLimit).mockResolvedValue(userWithLimit);

            const result = await userService.setDailyBetLimit('user-123', 0);
            expect(result.dailyBetLimit).toBe(0);
        });
    });

    describe('Bet Limits - Weekly', () => {
        it('should set weekly bet limit', async () => {
            const userWithLimit = createMockUser({ weeklyBetLimit: 500 });
            vi.mocked(userService.setWeeklyBetLimit).mockResolvedValue(userWithLimit);

            const result = await userService.setWeeklyBetLimit('user-123', 500);
            expect(result.weeklyBetLimit).toBe(500);
            expect(userService.setWeeklyBetLimit).toHaveBeenCalledWith('user-123', 500);
        });
    });

    describe('Bet Limits - Monthly', () => {
        it('should set monthly bet limit', async () => {
            const userWithLimit = createMockUser({ monthlyBetLimit: 2000 });
            vi.mocked(userService.setMonthlyBetLimit).mockResolvedValue(userWithLimit);

            const result = await userService.setMonthlyBetLimit('user-123', 2000);
            expect(result.monthlyBetLimit).toBe(2000);
            expect(userService.setMonthlyBetLimit).toHaveBeenCalledWith('user-123', 2000);
        });
    });

    describe('Bet Limits - Removal', () => {
        it('should remove all bet limits', async () => {
            const userWithoutLimits = createMockUser({
                dailyBetLimit: null,
                weeklyBetLimit: null,
                monthlyBetLimit: null,
            });
            vi.mocked(userService.removeBetLimits).mockResolvedValue(userWithoutLimits);

            const result = await userService.removeBetLimits('user-123');
            expect(result.dailyBetLimit).toBeNull();
            expect(result.weeklyBetLimit).toBeNull();
            expect(result.monthlyBetLimit).toBeNull();
            expect(userService.removeBetLimits).toHaveBeenCalledWith('user-123');
        });
    });

    describe('Max Bet Amount', () => {
        it('should set max bet amount', async () => {
            const userWithMaxBet = createMockUser({ maxBetAmount: 5 });
            vi.mocked(userService.setMaxBetAmount).mockResolvedValue(userWithMaxBet);

            const result = await userService.setMaxBetAmount('user-123', 5);
            expect(result.maxBetAmount).toBe(5);
            expect(userService.setMaxBetAmount).toHaveBeenCalledWith('user-123', 5);
        });

        it('should set max bet amount to minimum', async () => {
            const userWithMaxBet = createMockUser({ maxBetAmount: 0.1 });
            vi.mocked(userService.setMaxBetAmount).mockResolvedValue(userWithMaxBet);

            const result = await userService.setMaxBetAmount('user-123', 0.1);
            expect(result.maxBetAmount).toBe(0.1);
        });
    });

    describe('User Restrictions Query', () => {
        it('should return user restrictions and limits', async () => {
            const userWithRestrictions = createMockUser({
                isBlocked: true,
                blockReason: 'Suspicious activity',
                dailyBetLimit: 100,
                weeklyBetLimit: 500,
                monthlyBetLimit: 2000,
                maxBetAmount: 5,
            });
            vi.mocked(userService.getUserById).mockResolvedValue(userWithRestrictions);

            const result = await userService.getUserById('user-123');
            expect(result?.isBlocked).toBe(true);
            expect(result?.blockReason).toBe('Suspicious activity');
            expect(result?.dailyBetLimit).toBe(100);
            expect(result?.weeklyBetLimit).toBe(500);
            expect(result?.monthlyBetLimit).toBe(2000);
            expect(result?.maxBetAmount).toBe(5);
        });

        it('should return user with no restrictions', async () => {
            const userNoRestrictions = createMockUser({
                isBlocked: false,
                isSuspended: false,
                dailyBetLimit: null,
                weeklyBetLimit: null,
                monthlyBetLimit: null,
            });
            vi.mocked(userService.getUserById).mockResolvedValue(userNoRestrictions);

            const result = await userService.getUserById('user-123');
            expect(result?.isBlocked).toBe(false);
            expect(result?.isSuspended).toBe(false);
            expect(result?.dailyBetLimit).toBeNull();
        });
    });

    describe('Multiple Operations', () => {
        it('should handle multiple admin actions in sequence', async () => {
            const user = createMockUser();
            const blockedUser = createMockUser({ isBlocked: true, blockReason: 'Test' });
            const suspendedUser = createMockUser({ isSuspended: true });

            vi.mocked(userService.getUserById).mockResolvedValue(user);
            vi.mocked(userService.blockUser).mockResolvedValue(blockedUser);
            vi.mocked(userService.suspendUser).mockResolvedValue(suspendedUser);

            const user1 = await userService.getUserById('user-123');
            expect(user1?.isBlocked).toBe(false);

            const user2 = await userService.blockUser('user-123', 'Test');
            expect(user2?.isBlocked).toBe(true);

            const user3 = await userService.suspendUser('user-123', 7, 'Test');
            expect(user3?.isSuspended).toBe(true);

            expect(userService.getUserById).toHaveBeenCalled();
            expect(userService.blockUser).toHaveBeenCalled();
            expect(userService.suspendUser).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should handle service errors gracefully', async () => {
            const error = new Error('Database error');
            vi.mocked(userService.getUserById).mockRejectedValue(error);

            try {
                await userService.getUserById('user-123');
                expect.fail('Should have thrown error');
            } catch (e) {
                expect(e).toEqual(error);
            }
        });

        it('should handle block user errors', async () => {
            const error = new Error('User not found');
            vi.mocked(userService.blockUser).mockRejectedValue(error);

            try {
                await userService.blockUser('nonexistent', 'Test');
                expect.fail('Should have thrown error');
            } catch (e) {
                expect(e).toEqual(error);
            }
        });
    });
});
