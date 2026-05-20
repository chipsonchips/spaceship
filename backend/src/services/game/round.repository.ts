import { AppDataSource } from '../../config/database.js';
import { Round } from '../../entities/round.entity.js';
import { PlayerBet, SettlementStatus } from '../../entities/player-bet.entity.js';
import { executeWithRetry } from './retry.util.js';
import { logger } from '../../utils/logger.js';

export class RoundRepository {
  private get roundRepo() {
    return AppDataSource.getRepository(Round);
  }

  private get betRepo() {
    return AppDataSource.getRepository(PlayerBet);
  }

  async findLatestRound(): Promise<Round | null> {
    return this.roundRepo.findOne({ where: {}, order: { roundId: 'DESC' } });
  }

  async findRoundWithPlayers(roundId: number): Promise<Round | null> {
    return this.roundRepo.findOne({
      where: { roundId },
      relations: ['players'],
      order: { roundId: 'DESC' },
    });
  }

  async findLatestRoundWithPlayers(): Promise<Round | null> {
    return this.roundRepo.findOne({
      where: {},
      relations: ['players'],
      order: { roundId: 'DESC' },
    });
  }

  async findBetsForRound(roundDbId: number): Promise<PlayerBet[]> {
    return this.betRepo.find({ where: { round: { id: roundDbId } } });
  }

  async findBetById(betId: number): Promise<PlayerBet | null> {
    return this.betRepo.findOne({
      where: { id: betId },
      relations: ['round'],
    });
  }

  async createBettingRound(round: Round): Promise<Round> {
    return executeWithRetry(
      async () => {
        const queryRunner = AppDataSource.createQueryRunner();
        try {
          await queryRunner.connect();
          // READ COMMITTED avoids long SERIALIZABLE locks on serverless Postgres.
          await queryRunner.startTransaction('READ COMMITTED');

          const last = await queryRunner.manager.findOne(Round, {
            where: {},
            order: { roundId: 'DESC' },
            lock: { mode: 'pessimistic_write' },
          });

          if (last && last.roundId >= round.roundId) {
            await queryRunner.rollbackTransaction();
            return last;
          }

          const saved = await queryRunner.manager.save(round);
          await queryRunner.commitTransaction();
          return saved;
        } catch (error: unknown) {
          await queryRunner.rollbackTransaction().catch(() => undefined);
          const err = error as Error & { code?: string };
          if (err.code === '23505' || err.message.includes('duplicate key')) {
            const existing = await this.findLatestRound();
            if (existing) return existing;
          }
          throw error;
        } finally {
          await queryRunner.release().catch(() => undefined);
        }
      },
      { maxRetries: 5, label: 'create-betting-round' },
    );
  }

  async persistFlyingPhase(
    roundId: number,
    data: {
      flyStartTime: number;
      combinedClientSeedHash: string;
      finalSeed: string;
    },
  ): Promise<void> {
    await executeWithRetry(
      async () => {
        await this.roundRepo
          .createQueryBuilder()
          .update(Round)
          .set({
            phase: 'FLYING',
            flyStartTime: data.flyStartTime,
            combinedClientSeedHash: data.combinedClientSeedHash,
            finalSeed: data.finalSeed,
          })
          .where('id = :id', { id: roundId })
          .execute();
      },
      { maxRetries: 8, baseDelayMs: 150, label: 'persist-flying-phase' },
    );
  }

  scheduleFlyingPhasePersist(
    roundId: number,
    data: {
      flyStartTime: number;
      combinedClientSeedHash: string;
      finalSeed: string;
    },
  ): void {
    void this.persistFlyingPhase(roundId, data).catch((err) => {
      logger.error('Background persist of FLYING phase failed', {
        roundId,
        error: (err as Error).message,
      });
    });
  }

  async persistCrashedRound(
    roundId: number,
    crashMultiplier: number,
  ): Promise<void> {
    await executeWithRetry(
      async () => {
        await this.roundRepo
          .createQueryBuilder()
          .update(Round)
          .set({
            phase: 'CRASHED',
            crashMultiplier,
            currentMultiplier: crashMultiplier,
            settled: true,
          })
          .where('id = :id', { id: roundId })
          .execute();
      },
      { maxRetries: 10, baseDelayMs: 150, label: 'persist-crashed-round' },
    );
  }

  async incrementTotalBets(roundId: number, amount: number): Promise<void> {
    await this.roundRepo
      .createQueryBuilder()
      .update(Round)
      .set({ totalBets: () => `"totalBets" + ${amount}` })
      .where('id = :id', { id: roundId })
      .execute();
  }

  async decrementTotalBets(roundId: number, amount: number): Promise<void> {
    await this.roundRepo
      .createQueryBuilder()
      .update(Round)
      .set({ totalBets: () => `GREATEST(0, "totalBets" - ${amount})` })
      .where('id = :id', { id: roundId })
      .execute();
  }

  async incrementTotalPayouts(roundId: number, payout: number): Promise<void> {
    await this.roundRepo
      .createQueryBuilder()
      .update(Round)
      .set({ totalPayouts: () => `"totalPayouts" + ${payout}` })
      .where('id = :id', { id: roundId })
      .execute();
  }

  createRoundEntity(data: Partial<Round>): Round {
    return this.roundRepo.create(data);
  }

  async saveBet(bet: PlayerBet): Promise<PlayerBet> {
    return this.betRepo.save(bet);
  }

  createBet(data: Partial<PlayerBet>): PlayerBet {
    return this.betRepo.create(data);
  }

  async findPendingSettlements(limit = 50): Promise<PlayerBet[]> {
    return this.betRepo.find({
      where: {
        cashedOut: true,
        settlementStatus: SettlementStatus.PENDING_FUNDS,
      },
      relations: ['round'],
      take: limit,
    });
  }
}
