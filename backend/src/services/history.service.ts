import { AppDataSource } from '../config/database.js';
import { GameHistory } from '../entities/game-history.entity.js';
import { Repository } from 'typeorm';
import { logger } from '../utils/logger.js';

export class HistoryService {
  private get repo(): Repository<GameHistory> {
    if (!AppDataSource.isInitialized) throw new Error('Database not initialized');
    return AppDataSource.getRepository(GameHistory);
  }

  async record(history: Partial<GameHistory>) {
    // Prevent duplicate records for the same round
    if (history.roundId) {
      const existing = await this.repo.findOne({ where: { roundId: history.roundId } });
      if (existing) {
        logger.info(`History record for round ${history.roundId} already exists, skipping.`, {
          roundId: history.roundId
        });
        return existing;
      }
    }
    const entity = this.repo.create(history);
    return this.repo.save(entity);
  }

  async latest(limit = 20) {
    return this.repo
      .createQueryBuilder('h')
      .orderBy('h.timestamp', 'DESC')
      .limit(limit)
      .getMany();
  }
}
