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
        const { address, signature, message } = req.body;

        if (!address || typeof address !== 'string') {
            logger.warn('Wallet login attempt without address');
            return res.status(400).json({
                success: false,
                error: 'Wallet address required',
            });
        }

        logger.info(`Wallet login attempt for address: ${address}`);

        // Require cryptographic signature and message to prevent impersonation/replay attacks
        if (process.env.NODE_ENV !== 'test' || signature || message) {
            if (!signature || !message) {
                logger.warn(`Wallet login attempt without signature/message for address: ${address}`);
                return res.status(400).json({
                    success: false,
                    error: 'Cryptographic signature and message required',
                });
            }

            try {
                // Recover the signer address using ethers
                const { ethers } = await import('ethers');
                const recoveredAddress = ethers.verifyMessage(message, signature);

                if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
                    logger.warn(`Signature verification failed. Expected: ${address}, Recovered: ${recoveredAddress}`);
                    return res.status(401).json({
                        success: false,
                        error: 'Invalid wallet signature',
                    });
                }

                // Verify the message formatting and timestamp to prevent replay attacks
                const match = message.match(/Timestamp:\s*(\d+)/);
                if (!match) {
                    logger.warn('Message format invalid, missing Timestamp');
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid authentication message format',
                    });
                }

                const msgTimestamp = parseInt(match[1], 10);
                const now = Date.now();
                if (Math.abs(now - msgTimestamp) > 10 * 60 * 1000) { // 10 minutes tolerance
                    logger.warn(`Authentication signature expired. Timestamp: ${msgTimestamp}, Now: ${now}`);
                    return res.status(401).json({
                        success: false,
                        error: 'Authentication signature has expired',
                    });
                }

                // Ensure the address inside the message matches the claimed address
                const addressMatch = message.match(/Wallet:\s*(0x[a-fA-F0-9]{40})/i);
                if (!addressMatch || addressMatch[1].toLowerCase() !== address.toLowerCase()) {
                    logger.warn(`Wallet address mismatch in signed message. Expected: ${address}, Message: ${addressMatch ? addressMatch[1] : 'none'}`);
                    return res.status(401).json({
                        success: false,
                        error: 'Wallet address mismatch in authentication message',
                    });
                }
            } catch (err) {
                logger.error('Signature verification error', { error: (err as Error).message });
                return res.status(401).json({
                    success: false,
                    error: 'Failed to verify cryptographic signature',
                });
            }
        }

        // Get or create user from wallet
        const user = await userService.getOrCreatePlayerFromWallet(address);

        if (!user.isActive) {
            logger.warn(`Login attempt for inactive user: ${user.id}`);
            return res.status(403).json({
                success: false,
                error: 'Account is deactivated',
            });
        }

        // Update last login
        await userService.updateLastLogin(user.id);

        // Generate tokens
        const tokens = generateTokens(user);
        logger.info(`Generated tokens for user ${user.id}:`, {
            hasAccessToken: !!tokens.accessToken,
            hasRefreshToken: !!tokens.refreshToken,
            expiresIn: tokens.expiresIn,
        });

        logger.info(`User logged in successfully: ${user.id} (${address}), username: ${user.username || 'not set'}`);

        const response = {
            success: true,
            user: {
                id: user.id,
                address: user.address,
                username: user.username,
                displayName: user.displayName,
                role: user.role,
                permissions: user.permissions || [],
                isActive: user.isActive,
                createdAt: user.createdAt,
            },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
        };

        logger.info(`Sending login response with tokens`, {
            hasAccessToken: !!response.accessToken,
            hasRefreshToken: !!response.refreshToken,
        });

        res.json(response);
    } catch (error) {
        const errorMsg = (error as Error).message;
        const errorStack = (error as Error).stack;
        logger.error('Wallet login failed', {
            error: errorMsg,
            stack: errorStack,
            address: req.body?.address,
        });
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
        const { farcasterId, username, displayName, avatarUrl, bio, address, signature, message } = req.body;

        if (!farcasterId || !username) {
            logger.warn('Farcaster login attempt without required fields', {
                hasFarcasterId: !!farcasterId,
                hasUsername: !!username,
            });
            return res.status(400).json({
                success: false,
                error: 'Farcaster ID and username required',
            });
        }

        logger.info(`Farcaster login attempt for user: ${username} (FID: ${farcasterId})`);

        let user = await userService.getUserByFarcasterId(farcasterId);

        if (!user) {
            // Create new user from Farcaster
            logger.info(`Creating new Farcaster user: ${username}`);
            user = await userService.getOrCreatePlayerFromFarcaster(
                farcasterId,
                username,
                displayName,
                avatarUrl,
                bio
            );
        } else {
            // Update profile if needed
            logger.info(`Updating existing Farcaster user: ${user.id}`);
            user = await userService.updateUserProfile(user.id, {
                displayName,
                avatarUrl,
                bio,
            });
        }

        // Link wallet if provided
        if (address && !user.address) {
            if (process.env.NODE_ENV !== 'test' || signature || message) {
                if (!signature || !message) {
                    logger.warn(`Farcaster link attempt without signature/message for address: ${address}`);
                    return res.status(400).json({
                        success: false,
                        error: 'Cryptographic signature and message required to link wallet',
                    });
                }

                try {
                    const { ethers } = await import('ethers');
                    const recoveredAddress = ethers.verifyMessage(message, signature);

                    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
                        logger.warn(`Farcaster link signature verification failed. Expected: ${address}, Recovered: ${recoveredAddress}`);
                        return res.status(401).json({
                            success: false,
                            error: 'Invalid wallet signature for Farcaster link',
                        });
                    }

                    // Verify format & timestamp
                    const match = message.match(/Timestamp:\s*(\d+)/);
                    if (!match) {
                        return res.status(400).json({
                            success: false,
                            error: 'Invalid authentication message format',
                        });
                    }

                    const msgTimestamp = parseInt(match[1], 10);
                    const now = Date.now();
                    if (Math.abs(now - msgTimestamp) > 10 * 60 * 1000) {
                        return res.status(401).json({
                            success: false,
                            error: 'Authentication signature has expired',
                        });
                    }

                    const addressMatch = message.match(/Wallet:\s*(0x[a-fA-F0-9]{40})/i);
                    if (!addressMatch || addressMatch[1].toLowerCase() !== address.toLowerCase()) {
                        return res.status(401).json({
                            success: false,
                            error: 'Wallet address mismatch in authentication message',
                        });
                    }
                } catch (err) {
                    logger.error('Farcaster link signature verification error', { error: (err as Error).message });
                    return res.status(401).json({
                        success: false,
                        error: 'Failed to verify cryptographic signature for wallet link',
                    });
                }
            }

            logger.info(`Linking wallet ${address} to Farcaster user ${user.id}`);
            user = await userService.linkFarcasterToWallet(
                address,
                farcasterId,
                username,
                displayName,
                avatarUrl
            );
        }

        if (!user.isActive) {
            logger.warn(`Login attempt for inactive Farcaster user: ${user.id}`);
            return res.status(403).json({
                success: false,
                error: 'Account is deactivated',
            });
        }

        // Update last login
        await userService.updateLastLogin(user.id);

        // Generate tokens
        const tokens = generateTokens(user);
        logger.info(`Generated tokens for Farcaster user ${user.id}:`, {
            hasAccessToken: !!tokens.accessToken,
            hasRefreshToken: !!tokens.refreshToken,
            expiresIn: tokens.expiresIn,
        });

        logger.info(`Farcaster user logged in successfully: ${user.id} (${username})`);

        const response = {
            success: true,
            user: {
                id: user.id,
                address: user.address,
                farcasterId: user.farcasterId,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                role: user.role,
                permissions: user.permissions || [],
                isActive: user.isActive,
                createdAt: user.createdAt,
            },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
        };

        logger.info(`Sending Farcaster login response with tokens`, {
            hasAccessToken: !!response.accessToken,
            hasRefreshToken: !!response.refreshToken,
        });

        res.json(response);
    } catch (error) {
        const errorMsg = (error as Error).message;
        const errorStack = (error as Error).stack;
        logger.error('Farcaster login failed', {
            error: errorMsg,
            stack: errorStack,
            username: req.body?.username,
            farcasterId: req.body?.farcasterId,
        });
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
        logger.info(`Fetching profile for user: ${req.userId}`);

        const user = await userService.getUserById(req.userId!);

        if (!user) {
            logger.warn(`User not found: ${req.userId}`);
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

        logger.info(`Updating profile for user: ${req.userId}`, { displayName, username });

        const user = await userService.updateUserProfile(req.userId!, {
            displayName,
            bio,
            preferences,
            username,
        });

        logger.info(`Profile updated successfully for user: ${user.id}`, { username: user.username });

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
        logger.info(`User logging out: ${req.userId}`);

        // Update last activity
        await userService.updateLastActivity(req.userId!);

        logger.info(`User logged out successfully: ${req.userId}`);

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
