import { AppDataSource } from '../config/database.js';
import { LeaderboardEntry } from '../entities/leaderboard.entity.js';
import { User } from '../entities/user.entity.js';
import { Repository } from 'typeorm';

export class LeaderboardService {
  private get repo(): Repository<LeaderboardEntry> {
    if (!AppDataSource.isInitialized) throw new Error('Database not initialized');
    return AppDataSource.getRepository(LeaderboardEntry);
  }

  private get userRepo(): Repository<User> {
    if (!AppDataSource.isInitialized) throw new Error('Database not initialized');
    return AppDataSource.getRepository(User);
  }

  async updateFromBet(bet: {
    address: string;
    amount: number;
    cashedOut: boolean;
    payout?: number | null;
    cashoutMultiplier?: number | null;
  }) {
    const addr = bet.address.toLowerCase();
    let entry = await this.repo.findOneBy({ address: addr });

    if (!entry) {
      entry = this.repo.create({ address: addr });
      // Try to fetch username from user entity
      const user = await this.userRepo.findOneBy({ address: addr });
      if (user?.username) {
        entry.username = user.username;
      }
    }

    entry.totalWagered = Number(entry.totalWagered || 0) + Number(bet.amount || 0);
    entry.gamesPlayed = (entry.gamesPlayed || 0) + 1;
    entry.lastPlayed = Date.now();

    if (bet.cashedOut && bet.payout) {
      const profit = Number(bet.payout) - Number(bet.amount);
      entry.totalWon = Number(entry.totalWon || 0) + profit;
      if (profit > Number(entry.biggestWin || 0)) entry.biggestWin = profit;
      if (
        bet.cashoutMultiplier &&
        Number(bet.cashoutMultiplier) > Number(entry.biggestMultiplier || 0)
      ) {
        entry.biggestMultiplier = Number(bet.cashoutMultiplier);
      }
    }

    return this.repo.save(entry);
  }

  async getTop(limit = 100) {
    return this.repo
      .createQueryBuilder('lb')
      .orderBy('lb.totalWon', 'DESC')
      .limit(limit)
      .getMany();
  }

  async updateUsername(address: string, username: string) {
    const entry = await this.repo.findOneBy({ address: address.toLowerCase() });
    if (entry) {
      entry.username = username;
      return this.repo.save(entry);
    }
  }
}
