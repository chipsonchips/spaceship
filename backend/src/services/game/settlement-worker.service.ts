import type { Server } from 'socket.io';
import type { ChainService } from '../chain.service.js';
import { SettlementStatus } from '../../entities/player-bet.entity.js';
import { RoundRepository } from './round.repository.js';
import { logger } from '../../utils/logger.js';

const SETTLEMENT_RETRY_INTERVAL_MS = 60_000;

export class SettlementWorker {
  private interval: NodeJS.Timeout | null = null;
  private readonly chainServices = new Map<number, ChainService>();

  constructor(
    private readonly io: Server,
    private readonly rounds: RoundRepository,
  ) {}

  start(): void {
    this.stop();
    void this.retryPendingSettlements();

    this.interval = setInterval(() => {
      void this.retryPendingSettlements();
    }, SETTLEMENT_RETRY_INTERVAL_MS);

    logger.info('Settlement retry job started', {
      intervalMs: SETTLEMENT_RETRY_INTERVAL_MS,
    });
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async getChainService(chainId: number): Promise<ChainService | null> {
    if (!this.chainServices.has(chainId)) {
      const { ChainService } = await import('../chain.service.js');
      this.chainServices.set(chainId, new ChainService(chainId));
    }
    return this.chainServices.get(chainId) ?? null;
  }

  private async checkHouseBalance(
    chainId: number,
    requiredAmount: number,
  ): Promise<{ sufficient: boolean; balance: number }> {
    try {
      const chainService = await this.getChainService(chainId);
      if (!chainService) {
        return { sufficient: false, balance: 0 };
      }
      const balance = await chainService.getHouseBalance();
      return { sufficient: balance >= requiredAmount, balance };
    } catch (err) {
      logger.error('Failed to check house balance', {
        chainId,
        error: (err as Error).message,
      });
      return { sufficient: false, balance: 0 };
    }
  }

  private async retryPendingSettlements(): Promise<void> {
    try {
      const pendingCashouts = await this.rounds.findPendingSettlements();
      if (pendingCashouts.length === 0) return;

      logger.info('Retrying pending settlements', { count: pendingCashouts.length });

      for (const bet of pendingCashouts) {
        try {
          if (!bet.chainId || !bet.payout) continue;

          const balanceCheck = await this.checkHouseBalance(
            bet.chainId,
            Number(bet.payout),
          );

          if (!balanceCheck.sufficient) {
            logger.debug('Still insufficient balance for pending cashout', {
              betId: bet.id,
              required: Number(bet.payout),
              available: balanceCheck.balance,
            });
            continue;
          }

          const chainService = await this.getChainService(bet.chainId);
          if (!chainService) continue;

          await chainService.cashOutFor(
            bet.round.roundId,
            bet.address,
            Number(bet.payout),
            Number(bet.cashoutMultiplier),
          );

          bet.settlementStatus = SettlementStatus.SETTLED;
          await this.rounds.saveBet(bet);

          this.io.emit('CASHOUT_SETTLED', {
            address: bet.address,
            betId: bet.id,
            payout: bet.payout,
            timestamp: Date.now(),
          });
        } catch (err) {
          const message = (err as Error).message.toLowerCase();
          logger.error('Failed to settle pending cashout', {
            betId: bet.id,
            error: (err as Error).message,
          });

          if (message.includes('invalid') || message.includes('not found')) {
            bet.settlementStatus = SettlementStatus.FAILED;
            await this.rounds.saveBet(bet);
          }
        }
      }
    } catch (err) {
      logger.error('Error in retryPendingSettlements', {
        error: (err as Error).message,
      });
    }
  }
}
