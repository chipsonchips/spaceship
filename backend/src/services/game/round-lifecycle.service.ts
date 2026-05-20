import type { Round } from '../../entities/round.entity.js';
import type { PlayerBet } from '../../entities/player-bet.entity.js';
import { securityMonitor } from '../security-monitor.service.js';
import { auditLogService } from '../audit-log.service.js';
import { AdminActionType } from '../../entities/admin-log.entity.js';
import { logger } from '../../utils/logger.js';
import { executeWithRetry } from './retry.util.js';
import { RoundRepository } from './round.repository.js';
import { GameStateStore } from './game-state.store.js';
import { GameBroadcaster } from './game-broadcaster.service.js';
import { FlyingSessionService } from './flying-session.service.js';
import { BetHandler } from './bet-handler.service.js';
import {
  computeFlyingSecrets,
  prepareNewRoundSecrets,
} from './provably-fair.service.js';
import { getCachedGameSettings } from './settings.cache.js';
import type { GameEngineServices } from './types.js';

export class RoundLifecycle {
  private crashInProgress = false;

  constructor(
    private readonly state: GameStateStore,
    private readonly rounds: RoundRepository,
    private readonly broadcaster: GameBroadcaster,
    private readonly flyingSession: FlyingSessionService,
    private readonly bets: BetHandler,
    private readonly services: GameEngineServices,
    private readonly scheduleNextRound: () => Promise<Round>,
  ) {}

  async start(): Promise<void> {
    const existing = await this.rounds.findLatestRound();

    if (!existing) {
      await this.startNewRound();
      return;
    }

    if (existing.phase === 'BETTING') {
      logger.info('Resuming existing betting round', { roundId: existing.roundId });
      await this.loadRound(existing);
      await this.scheduleFlyingPhase();
      return;
    }

    if (existing.phase === 'FLYING') {
      logger.info('Existing round is in FLYING phase, crashing it to reset', {
        roundId: existing.roundId,
      });
      await this.loadRound(existing);
      await this.crashRound(1.0);
      return;
    }

    logger.info('Existing round is in CRASHED phase, starting new round', {
      roundId: existing.roundId,
    });
    await this.startNewRound();
  }

  async startNewRound(): Promise<Round> {
    const settings = await getCachedGameSettings();
    const last = await this.rounds.findLatestRound();

    if (this.state.currentRound && last && this.state.currentRound.id !== last.id) {
      logger.info('A new round was already created, returning existing round');
      return this.state.currentRound;
    }

    const nextId = last ? last.roundId + 1 : 1;
    const secrets = prepareNewRoundSecrets();
    const now = Date.now();

    const round = this.rounds.createRoundEntity({
      roundId: nextId,
      phase: 'BETTING',
      startTime: now,
      flyStartTime: now + settings.bettingDurationMs,
      crashMultiplier: null,
      currentMultiplier: 1.0,
      serverSeed: secrets.encryptedSeed,
      serverSeedIV: secrets.serverSeedIV,
      serverSeedAuthTag: secrets.serverSeedAuthTag,
      serverSeedHash: secrets.serverSeedHash,
      totalBets: 0,
      totalPayouts: 0,
      settled: false,
      planePosition: { x: 50, y: 0 },
    });

    logger.info(`Creating new round with ID: ${nextId}`);
    const saved = await this.rounds.createBettingRound(round);
    await this.loadRound(saved);
    void this.broadcaster.emitStateWithFreshPlayers();
    await this.scheduleFlyingPhase();

    logger.info(`Successfully created new round`, {
      dbId: saved.id,
      roundId: saved.roundId,
    });

    return saved;
  }

  async scheduleFlyingPhase(): Promise<void> {
    this.state.clearBettingTimeout();

    const settings = await getCachedGameSettings();
    const now = Date.now();
    const remainingMs =
      this.state.currentRound?.flyStartTime != null
        ? Math.max(0, Number(this.state.currentRound.flyStartTime) - now)
        : settings.bettingDurationMs;

    logger.info('Scheduling flying phase', {
      remainingMs,
      bettingDurationMs: settings.bettingDurationMs,
      currentRoundId: this.state.currentRound?.roundId,
      flyStartTime: this.state.currentRound?.flyStartTime,
    });

    const timeout = setTimeout(() => {
      logger.info('Flying phase timeout triggered', {
        currentRoundId: this.state.currentRound?.roundId,
      });
      this.startFlyingPhase().catch((err) => {
        logger.error('Failed to start flying phase', {
          error: (err as Error).message,
          stack: (err as Error).stack,
        });
        this.scheduleNextRound().catch((recoveryErr) => {
          logger.error('Failed to recover from flying phase error', {
            error: (recoveryErr as Error).message,
          });
        });
      });
    }, remainingMs);

    this.state.setBettingTimeout(timeout);
  }

  async startFlyingPhase(): Promise<void> {
    const round = this.state.currentRound;
    if (!round || round.phase !== 'BETTING') {
      logger.warn('startFlyingPhase aborted: no current betting round', {
        hasRound: Boolean(round),
        phase: round?.phase,
        roundId: round?.roundId,
      });
      return;
    }

    logger.info('Starting flying phase', { roundId: round.roundId });

    const settings = await getCachedGameSettings();

    await auditLogService.logAction(
      null,
      AdminActionType.SEED_ACCESSED,
      'Server seed decrypted for crash point calculation',
      { roundId: round.roundId, serverSeedHash: round.serverSeedHash },
      null,
      null,
      true,
    );

    const bets = await this.rounds.findBetsForRound(round.id);
    const flyingSecrets = computeFlyingSecrets(round, bets, settings);
    const flyStartTime = Date.now();

    round.phase = 'FLYING';
    round.flyStartTime = flyStartTime;
    round.combinedClientSeedHash = flyingSecrets.combinedClientSeedHash;
    round.finalSeed = flyingSecrets.finalSeed;

    this.state.resetAutoCashoutState(bets.filter((b) => !b.cashedOut));
    this.broadcaster.emitStateFromMemory(settings);

    this.rounds.scheduleFlyingPhasePersist(round.id, {
      flyStartTime,
      combinedClientSeedHash: flyingSecrets.combinedClientSeedHash,
      finalSeed: flyingSecrets.finalSeed,
    });

    logger.info('Flying phase started successfully', {
      roundId: round.roundId,
      targetCrash: flyingSecrets.targetCrash,
      flyingDurationMs: flyingSecrets.flyingDurationMs,
      clientSeedsCount: bets.filter((b) => b.clientSeed).length,
    });

    this.flyingSession.start({
      targetCrash: flyingSecrets.targetCrash,
      flyingDurationMs: flyingSecrets.flyingDurationMs,
      maxCrashMultiplier: settings.maxCrashMultiplier,
      flyStartTime,
    });
  }

  async crashRound(crashMultiplier: number): Promise<void> {
    const round = this.state.currentRound;
    if (!round || round.phase !== 'FLYING') {
      logger.warn('crashRound called but round is not in FLYING phase', {
        hasRound: Boolean(round),
        phase: round?.phase,
        roundId: round?.roundId,
      });
      return;
    }

    if (this.crashInProgress) return;
    this.crashInProgress = true;

    try {
      this.flyingSession.stop();

      logger.info('Crashing round', {
        roundId: round.roundId,
        crashMultiplier,
      });

      round.phase = 'CRASHED';
      round.crashMultiplier = crashMultiplier;
      round.currentMultiplier = crashMultiplier;
      round.settled = true;

      const settings = await getCachedGameSettings();
      this.broadcaster.emitStateFromMemory(settings);

      await this.finalizeCrashInDatabase(round, crashMultiplier, settings.roundRestartDelayMs);
    } finally {
      this.crashInProgress = false;
    }
  }

  private async finalizeCrashInDatabase(
    round: Round,
    crashMultiplier: number,
    restartDelayMs: number,
  ): Promise<void> {
    await executeWithRetry(
      async () => {
        await securityMonitor.detectPerfectCashouts(round.roundId);

        const players = await this.rounds.findBetsForRound(round.id);
        this.state.replacePlayers(players);

        for (const player of players) {
          if (!player.cashedOut) {
            player.payout = 0;
            await this.rounds.saveBet(player);
            await this.services.leaderboard.updateFromBet({
              address: player.address,
              amount: Number(player.amount),
              cashedOut: false,
            });
          }
        }

        await this.rounds.persistCrashedRound(round.id, crashMultiplier);

        await this.services.history.record({
          roundId: round.roundId,
          crashMultiplier: Number(crashMultiplier),
          timestamp: Date.now(),
          totalBets: Number(round.totalBets || 0),
          totalPayouts: Number(round.totalPayouts || 0),
          winnersCount: players.filter((p) => p.cashedOut).length,
        });

        const chain = this.services.getChain();
        if (chain) {
          try {
            await chain.submitRoundSnapshot(round, players);
          } catch (err) {
            logger.error('Round snapshot submission failed', {
              error: (err as Error).message,
            });
          }
        }
      },
      { maxRetries: 10, label: 'finalize-crash' },
    );

    const latestHistory = await this.services.history.latest(28);
    this.broadcaster.emitHistory(latestHistory);
    void this.broadcaster.emitStateWithFreshPlayers();

    logger.info('Round crashed, scheduling new round', {
      roundId: round.roundId,
      crashMultiplier,
      restartDelayMs,
    });

    const timeout = setTimeout(() => {
      logger.info('Starting new round after crash delay');
      this.scheduleNextRound().catch((err) => {
        logger.error('Failed to start new round after crash', {
          error: (err as Error).message,
          stack: (err as Error).stack,
        });
      });
    }, restartDelayMs);

    this.state.setRestartTimeout(timeout);
  }

  private async loadRound(round: Round): Promise<void> {
    this.state.currentRound = round;
    const players = await this.rounds.findBetsForRound(round.id);
    this.state.replacePlayers(players);
  }
}
