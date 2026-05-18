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
                });
                settings = await this.settingsRepo.save(settings);
            }

            return settings;
        } catch (error) {
            logger.error('Failed to get game settings', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Update game settings
     */
    async updateSettings(updates: Partial<GameSettings>): Promise<GameSettings> {
        try {
            const settings = await this.getSettings();

            // Update fields
            if (updates.minBetAmount !== undefined) {
                settings.minBetAmount = updates.minBetAmount;
            }
            if (updates.maxBetAmount !== undefined) {
                settings.maxBetAmount = updates.maxBetAmount;
            }
            if (updates.bettingDurationMs !== undefined) {
                settings.bettingDurationMs = updates.bettingDurationMs;
            }
            if (updates.flyingDurationMs !== undefined) {
                settings.flyingDurationMs = updates.flyingDurationMs;
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
