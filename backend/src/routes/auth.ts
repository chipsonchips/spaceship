import { Router, Request, Response } from 'express';
import { userService } from '../services/user.service.js';
import {
    generateTokens,
    verifyRefreshToken,
    generateAccessToken,
} from '../utils/auth.js';
import { authenticateToken, optionalAuth } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * POST /api/auth/wallet/login
 * Authenticate with wallet address (Web3 auth)
 * Frontend should sign a message and provide the signature
 */
router.post('/wallet/login', optionalAuth, async (req: Request, res: Response) => {
    try {
        const { address } = req.body;

        if (!address || typeof address !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Wallet address required',
            });
        }

        // Get or create user from wallet
        const user = await userService.getOrCreatePlayerFromWallet(address);

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                error: 'Account is deactivated',
            });
        }

        // Update last login
        await userService.updateLastLogin(user.id);

        // Generate tokens
        const tokens = generateTokens(user);

        res.json({
            success: true,
            user: {
                id: user.id,
                address: user.address,
                username: user.username,
                displayName: user.displayName,
                role: user.role,
            },
            ...tokens,
        });
    } catch (error) {
        logger.error('Wallet login failed', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Login failed',
        });
    }
});

/**
 * POST /api/auth/farcaster/login
 * Authenticate with Farcaster profile
 */
router.post('/farcaster/login', optionalAuth, async (req: Request, res: Response) => {
    try {
        const { farcasterId, username, displayName, avatarUrl, bio, address } = req.body;

        if (!farcasterId || !username) {
            return res.status(400).json({
                success: false,
                error: 'Farcaster ID and username required',
            });
        }

        let user = await userService.getUserByFarcasterId(farcasterId);

        if (!user) {
            // Create new user from Farcaster
            user = await userService.getOrCreatePlayerFromFarcaster(
                farcasterId,
                username,
                displayName,
                avatarUrl,
                bio
            );
        } else {
            // Update profile if needed
            user = await userService.updateUserProfile(user.id, {
                displayName,
                avatarUrl,
                bio,
            });
        }

        // Link wallet if provided
        if (address && !user.address) {
            user = await userService.linkFarcasterToWallet(
                address,
                farcasterId,
                username,
                displayName,
                avatarUrl
            );
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                error: 'Account is deactivated',
            });
        }

        // Update last login
        await userService.updateLastLogin(user.id);

        // Generate tokens
        const tokens = generateTokens(user);

        res.json({
            success: true,
            user: {
                id: user.id,
                address: user.address,
                farcasterId: user.farcasterId,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                role: user.role,
            },
            ...tokens,
        });
    } catch (error) {
        logger.error('Farcaster login failed', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Login failed',
        });
    }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token required',
            });
        }

        const payload = verifyRefreshToken(refreshToken);
        if (!payload || payload.type !== 'refresh') {
            return res.status(401).json({
                success: false,
                error: 'Invalid refresh token',
            });
        }

        const user = await userService.getUserById(payload.userId);
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'User not found or inactive',
            });
        }

        const newAccessToken = generateAccessToken(user);

        res.json({
            success: true,
            accessToken: newAccessToken,
        });
    } catch (error) {
        logger.error('Token refresh failed', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Token refresh failed',
        });
    }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
    try {
        const user = await userService.getUserById(req.userId!);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                address: user.address,
                farcasterId: user.farcasterId,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                email: user.email,
                role: user.role,
                permissions: user.permissions,
                isActive: user.isActive,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        logger.error('Failed to fetch user profile', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile',
        });
    }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authenticateToken, async (req: Request, res: Response) => {
    try {
        const { displayName, bio, preferences, username } = req.body;

        const user = await userService.updateUserProfile(req.userId!, {
            displayName,
            bio,
            preferences,
            username,
        });

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                bio: user.bio,
                preferences: user.preferences,
            },
        });
    } catch (error) {
        logger.error('Failed to update profile', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to update profile',
        });
    }
});

/**
 * POST /api/auth/logout
 * Logout (client-side token deletion)
 */
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
    try {
        // Update last activity
        await userService.updateLastActivity(req.userId!);

        res.json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (error) {
        logger.error('Logout failed', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Logout failed',
        });
    }
});

export default router;
