import type { Server } from 'socket.io';
import { sanitizeRound } from '../game-utils.js';
import type { GameStateStore } from './game-state.store.js';
import type { RoundRepository } from './round.repository.js';
import type { CachedGameSettings } from './types.js';
import { GAME_CONSTANTS } from '../../constants.js';
import { logger } from '../../utils/logger.js';

export class GameBroadcaster {
  constructor(
    private readonly io: Server,
    private readonly state: GameStateStore,
    private readonly rounds: RoundRepository,
    private readonly encryptionSecret: string,
    private readonly getSettings: () => Promise<CachedGameSettings>,
  ) {}

  /** Hot path: no database — uses in-memory round + cached players/settings. */
  emitStateFromMemory(settings?: CachedGameSettings): void {
    const round = this.state.currentRound;
    if (!round) return;

    const payload = this.buildPayload(round, this.state.players, settings);
    this.io.emit('GAME_STATE_UPDATE', payload);
  }

  async emitStateWithFreshPlayers(): Promise<void> {
    const round = this.state.currentRound;
    if (!round) return;

    try {
      const players = await this.rounds.findBetsForRound(round.id);
      this.state.replacePlayers(players);
      const settings = await this.getSettings();
      const payload = this.buildPayload(round, players, settings);
      this.io.emit('GAME_STATE_UPDATE', payload);
    } catch (error) {
      logger.error('Failed to broadcast game state', { error });
      this.emitStateFromMemory();
    }
  }

  emitHistory(history: unknown): void {
    this.io.emit('HISTORY_UPDATE', history);
  }

  emitCashoutNotification(data: Record<string, unknown>): void {
    this.io.emit('CASHOUT_NOTIFICATION', data);
  }

  emitCashoutPendingSettlement(data: Record<string, unknown>): void {
    this.io.emit('CASHOUT_PENDING_SETTLEMENT', data);
  }

  emitCashoutSettlementFailed(data: Record<string, unknown>): void {
    this.io.emit('CASHOUT_SETTLEMENT_FAILED', data);
  }

  emitCashoutSettled(data: Record<string, unknown>): void {
    this.io.emit('CASHOUT_SETTLED', data);
  }

  private buildPayload(
    round: NonNullable<GameStateStore['currentRound']>,
    players: GameStateStore['players'],
    settings?: CachedGameSettings,
  ): Record<string, unknown> {
    const resolved = settings ?? {
      minBetAmount: 0.1,
      maxBetAmount: 10,
      bettingDurationMs: 10000,
      flyingDurationMs: 20000,
      roundRestartDelayMs: 5000,
      maxCrashMultiplier: 100,
    };

    const roundData = {
      ...round,
      players,
      minBetAmount: resolved.minBetAmount,
      maxBetAmount: resolved.maxBetAmount,
      bettingDurationMs: resolved.bettingDurationMs,
      bettingLockMs: GAME_CONSTANTS.BETTING_LOCK_MS,
      flyingDurationMs: resolved.flyingDurationMs,
      roundRestartDelayMs: resolved.roundRestartDelayMs,
      maxCrashMultiplier: resolved.maxCrashMultiplier,
    };

    const payload = sanitizeRound(roundData, this.encryptionSecret) as Record<string, unknown>;
    payload.serverTime = Date.now();
    return payload;
  }
}
