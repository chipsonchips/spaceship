import { AppDataSource } from '../config/database.js';
import { GameSettings } from '../entities/game-settings.entity.js';
import { logger } from '../utils/logger.js';

export class GameSettingsService {
    private settingsRepo = AppDataSource.getRepository(GameSettings);

    /**
     * Get current game settings (singleton pattern - only one row exists)
     */
    async getSettings(): Promise<GameSettings> {
        try {
            let settings = await this.settingsRepo.findOne({
                where: {},
                order: { createdAt: 'ASC' }
            });

            // If no settings exist, create default ones
            if (!settings) {
                logger.info('No game settings found, creating defaults');
                settings = this.settingsRepo.create({
                    minBetAmount: parseFloat(process.env.MIN_BET_AMOUNT || '0.1'),
                    maxBetAmount: parseFloat(process.env.MAX_BET_AMOUNT || '10'),
                    bettingDurationMs: parseInt(process.env.BETTING_DURATION_MS || '30000'),
                    flyingDurationMs: parseInt(process.env.FLYING_DURATION_MS || '20000'),
                    roundRestartDelayMs: parseInt(process.env.ROUND_RESTART_DELAY_MS || '5000'),
                    houseEdge: 0.03,
                    minCrashMultiplier: 1.01,
                    maxCrashMultiplier: 100.00,
                });
                settings = await this.settingsRepo.save(settings);
            } else {
                // Self-heal/ensure default settings values are populated for new columns
                let needsSave = false;
                if (settings.roundRestartDelayMs === null || settings.roundRestartDelayMs === undefined) {
                    settings.roundRestartDelayMs = 5000;
                    needsSave = true;
                }
                if (settings.houseEdge === null || settings.houseEdge === undefined) {
                    settings.houseEdge = 0.03;
                    needsSave = true;
                }
                if (settings.minCrashMultiplier === null || settings.minCrashMultiplier === undefined) {
                    settings.minCrashMultiplier = 1.01;
                    needsSave = true;
                }
                if (settings.maxCrashMultiplier === null || settings.maxCrashMultiplier === undefined) {
                    settings.maxCrashMultiplier = 100.00;
                    needsSave = true;
                }
                if (needsSave) {
                    settings = await this.settingsRepo.save(settings);
                }
            }

            return settings;
        } catch (error) {
            logger.error('Failed to get game settings, using fallback defaults', { error: (error as Error).message });
            // Return fallback defaults if database query fails
            const fallbackSettings: Partial<GameSettings> = {
                minBetAmount: parseFloat(process.env.MIN_BET_AMOUNT || '0.1'),
                maxBetAmount: parseFloat(process.env.MAX_BET_AMOUNT || '10'),
                bettingDurationMs: parseInt(process.env.BETTING_DURATION_MS || '30000'),
                flyingDurationMs: parseInt(process.env.FLYING_DURATION_MS || '20000'),
                roundRestartDelayMs: parseInt(process.env.ROUND_RESTART_DELAY_MS || '5000'),
                houseEdge: 0.03,
                minCrashMultiplier: 1.01,
                maxCrashMultiplier: 100.00,
            };
            return fallbackSettings as GameSettings;
        }
    }

    /**
     * Update game settings
     */
    async updateSettings(updates: Partial<GameSettings>): Promise<GameSettings> {
        try {
            const settings = await this.getSettings();

            // Validate and Update fields
            if (updates.minBetAmount !== undefined) {
                const val = Number(updates.minBetAmount);
                if (isNaN(val) || val < 0.01 || val > 100.00) {
                    throw new Error('Minimum bet must be between 0.01 and 100.00 USDC');
                }
                settings.minBetAmount = val;
            }

            if (updates.maxBetAmount !== undefined) {
                const val = Number(updates.maxBetAmount);
                const minBet = updates.minBetAmount !== undefined ? Number(updates.minBetAmount) : Number(settings.minBetAmount);
                if (isNaN(val) || val < minBet) {
                    throw new Error('Maximum bet must be greater than or equal to the minimum bet');
                }
                if (val > 100000.00) {
                    throw new Error('Maximum bet cannot exceed 100,000.00 USDC');
                }
                settings.maxBetAmount = val;
            }

            if (updates.bettingDurationMs !== undefined) {
                const val = Number(updates.bettingDurationMs);
                if (isNaN(val) || val < 3000 || val > 120000) {
                    throw new Error('Betting duration must be between 3,000ms (3s) and 120,000ms (2 minutes)');
                }
                settings.bettingDurationMs = val;
            }

            if (updates.flyingDurationMs !== undefined) {
                const val = Number(updates.flyingDurationMs);
                if (isNaN(val) || val < 5000 || val > 300000) {
                    throw new Error('Max flying duration must be between 5,000ms (5s) and 300,000ms (5 minutes)');
                }
                settings.flyingDurationMs = val;
            }

            if (updates.roundRestartDelayMs !== undefined) {
                const val = Number(updates.roundRestartDelayMs);
                if (isNaN(val) || val < 2000 || val > 20000) {
                    throw new Error('Round restart delay must be between 2,000ms (2s) and 20,000ms (20s)');
                }
                settings.roundRestartDelayMs = val;
            }

            if (updates.houseEdge !== undefined) {
                const val = Number(updates.houseEdge);
                if (isNaN(val) || val < 0.00 || val > 0.20) {
                    throw new Error('House edge must be between 0.00 (0%) and 0.20 (20%)');
                }
                settings.houseEdge = val;
            }

            if (updates.minCrashMultiplier !== undefined) {
                const val = Number(updates.minCrashMultiplier);
                if (isNaN(val) || val < 1.01 || val > 1.50) {
                    throw new Error('Minimum crash multiplier must be between 1.01 and 1.50');
                }
                settings.minCrashMultiplier = val;
            }

            if (updates.maxCrashMultiplier !== undefined) {
                const val = Number(updates.maxCrashMultiplier);
                const minCrash = updates.minCrashMultiplier !== undefined ? Number(updates.minCrashMultiplier) : Number(settings.minCrashMultiplier);
                if (isNaN(val) || val < minCrash || val > 10000.00) {
                    throw new Error(`Maximum crash multiplier must be between the minimum crash multiplier (${minCrash}) and 10,000.00`);
                }
                settings.maxCrashMultiplier = val;
            }

            const updated = await this.settingsRepo.save(settings);
            logger.info('Game settings updated', { settings: updated });

            return updated;
        } catch (error) {
            logger.error('Failed to update game settings', { error: (error as Error).message });
            throw error;
        }
    }
}

export const gameSettingsService = new GameSettingsService();
