import { AppDataSource } from "../config/database.js";
import { PlayerBet } from "../entities/player-bet.entity.js";
import { Round } from "../entities/round.entity.js";
import { logger } from "../utils/logger.js";
import { auditLogService } from "./audit-log.service.js";
import { AdminActionType } from "../entities/admin-log.entity.js";

export class SecurityMonitorService {
  private suspiciousWallets = new Set<string>();

  /**
   * Detect if a wallet has an unusually high win rate
   * Analyzes the last 50 bets.
   */
  async detectHighWinRate(address: string): Promise<boolean> {
    const betRepo = AppDataSource.getRepository(PlayerBet);

    // Get last 50 bets from this wallet
    const recentBets = await betRepo.find({
      where: { address },
      order: { timestamp: "DESC" },
      take: 50,
    });

    if (recentBets.length < 10) return false;

    const wins = recentBets.filter(
      (b) => b.cashedOut && b.payout! > b.amount,
    ).length;
    const winRate = wins / recentBets.length;

    // Alert if win rate > 75% (statistically highly improbable)
    if (winRate > 0.75) {
      const details = {
        winRate: `${(winRate * 100).toFixed(1)}%`,
        totalBets: recentBets.length,
        wins,
      };

      logger.warn("🚨 SECURITY ALERT: Suspicious win rate detected", {
        address,
        ...details
      });

      await auditLogService.logAction(
        null,
        AdminActionType.SECURITY_ALERT,
        `Suspicious win rate detected for ${address}`,
        details,
        null,
        null,
        false,
        "High Win Rate Alert"
      );

      this.suspiciousWallets.add(address);
      return true;
    }

    return false;
  }

  /**
   * Detect if cashouts are happening at exact crash points
   */
  async detectPerfectCashouts(roundId: number): Promise<boolean> {
    const betRepo = AppDataSource.getRepository(PlayerBet);
    const roundRepo = AppDataSource.getRepository(Round);

    const round = await roundRepo.findOne({ where: { roundId } });
    if (!round || !round.crashMultiplier) return false;

    const bets = await betRepo.find({
      where: { round: { id: round.id }, cashedOut: true },
    });

    // Check for "perfect cashouts" (within 0.05x of crash point)
    const perfectCashouts = bets.filter((b) => {
      const diff = Math.abs(Number(b.cashoutMultiplier!) - Number(round.crashMultiplier!));
      return diff < 0.05;
    });

    if (perfectCashouts.length >= 3) {
      const details = {
        roundId,
        crashMultiplier: round.crashMultiplier,
        perfectCashouts: perfectCashouts.map((b) => ({
          address: b.address,
          cashoutMultiplier: b.cashoutMultiplier,
        })),
      };

      logger.warn("🚨 SECURITY ALERT: Multiple perfect cashouts detected", details);

      await auditLogService.logAction(
        null,
        AdminActionType.SECURITY_ALERT,
        `Perfect cashouts detected in round ${roundId}`,
        details,
        null,
        null,
        false,
        "Perfect Cashout Alert"
      );

      return true;
    }

    return false;
  }

  /**
   * Detect consecutive win streaks
   */
  async detectConsecutiveWins(address: string): Promise<boolean> {
    const betRepo = AppDataSource.getRepository(PlayerBet);

    const recentBets = await betRepo.find({
      where: { address },
      order: { timestamp: "DESC" },
      take: 10,
    });

    if (recentBets.length < 5) return false;

    let consecutiveWins = 0;
    for (const bet of recentBets) {
      if (bet.cashedOut && bet.payout! > bet.amount) {
        consecutiveWins++;
      } else {
        break;
      }
    }

    if (consecutiveWins >= 5) {
      const profit = recentBets
        .slice(0, consecutiveWins)
        .reduce((sum, b) => sum + (Number(b.payout!) - Number(b.amount)), 0);

      const details = {
        consecutiveWins,
        totalProfit: profit.toFixed(2),
      };

      logger.warn("🚨 SECURITY ALERT: Consecutive wins detected", {
        address,
        ...details
      });

      await auditLogService.logAction(
        null,
        AdminActionType.SUSPICIOUS_ACTIVITY,
        `Consecutive wins detected for ${address}`,
        details,
        null,
        null,
        false,
        "Consecutive Win Alert"
      );

      this.suspiciousWallets.add(address);
      return true;
    }

    return false;
  }

  isSuspicious(address: string): boolean {
    return this.suspiciousWallets.has(address);
  }

  clearSuspicious(address: string): void {
    this.suspiciousWallets.delete(address);
    logger.info("Cleared suspicious flag", { address });
  }

  getSuspiciousWallets(): string[] {
    return Array.from(this.suspiciousWallets);
  }
}

export const securityMonitor = new SecurityMonitorService();
