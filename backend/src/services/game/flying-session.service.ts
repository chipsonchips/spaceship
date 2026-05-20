import {
  calculateCurrentMultiplier,
  calculatePlanePosition,
} from '../game-utils.js';
import type { GameStateStore } from './game-state.store.js';
import type { GameBroadcaster } from './game-broadcaster.service.js';
import type { FlyingSessionConfig } from './types.js';
import { logger } from '../../utils/logger.js';

const TICK_MS = 50;

export type AutoCashoutHandler = (
  betId: number,
  chainId: number,
  exactMultiplier: number,
) => Promise<void>;

export class FlyingSessionService {
  constructor(
    private readonly state: GameStateStore,
    private readonly broadcaster: GameBroadcaster,
    private readonly onAutoCashout: AutoCashoutHandler,
    private readonly onCrash: (targetCrash: number) => void,
  ) {}

  start(session: FlyingSessionConfig): void {
    this.state.flyingSession = session;
    this.state.clearFlyingInterval();

    const interval = setInterval(() => {
      this.tick(session);
    }, TICK_MS);

    this.state.setFlyingInterval(interval);
  }

  stop(): void {
    this.state.clearFlyingInterval();
    this.state.flyingSession = null;
  }

  private tick(session: FlyingSessionConfig): void {
    const round = this.state.currentRound;
    if (!round || round.phase !== 'FLYING') {
      this.stop();
      return;
    }

    const elapsed = Date.now() - session.flyStartTime;
    round.currentMultiplier = calculateCurrentMultiplier(
      elapsed,
      session.maxCrashMultiplier,
    );
    round.planePosition = calculatePlanePosition(elapsed);

    this.processAutoCashouts(session.targetCrash);
    this.state.autoCashoutState.setPreviousMultiplier(round.currentMultiplier);

    this.broadcaster.emitStateFromMemory();

    if (
      elapsed >= session.flyingDurationMs ||
      round.currentMultiplier >= session.targetCrash
    ) {
      logger.info('Crash condition met', {
        elapsed,
        flyingDurationMs: session.flyingDurationMs,
        currentMultiplier: round.currentMultiplier,
        targetCrash: session.targetCrash,
        roundId: round.roundId,
      });
      this.stop();
      this.onCrash(session.targetCrash);
    }
  }

  private processAutoCashouts(targetCrash: number): void {
    const round = this.state.currentRound;
    if (!round || round.phase !== 'FLYING') return;

    const { processedIds, activeBets, previousMultiplier } =
      this.state.autoCashoutState;
    const currentMultiplier = round.currentMultiplier;

    for (const player of activeBets) {
      if (player.cashedOut || processedIds.has(player.id) || !player.autoCashoutMultiplier) {
        continue;
      }

      const targetMultiplier = Number(player.autoCashoutMultiplier);
      if (
        previousMultiplier < targetMultiplier &&
        currentMultiplier >= targetMultiplier
      ) {
        processedIds.add(player.id);

        if (!player.chainId) {
          logger.warn('Auto-cashout skipped: missing chainId', { betId: player.id });
          processedIds.delete(player.id);
          continue;
        }

        void this.onAutoCashout(player.id, player.chainId, targetMultiplier).catch(
          (err) => {
            logger.error('Auto-cashout failed', {
              betId: player.id,
              targetMultiplier,
              currentMultiplier,
              targetCrash,
              error: (err as Error).message,
            });
            processedIds.delete(player.id);
          },
        );
      }
    }
  }
}
