import type { Round } from '../../entities/round.entity.js';
import type { PlayerBet } from '../../entities/player-bet.entity.js';
import type { FlyingSessionConfig } from './types.js';

/**
 * Authoritative in-memory game state for the active round.
 * The database is persisted asynchronously; live ticks read from here.
 */
export class GameStateStore {
  currentRound: Round | null = null;
  players: PlayerBet[] = [];
  flyingSession: FlyingSessionConfig | null = null;

  private bettingTimeout: NodeJS.Timeout | null = null;
  private flyingInterval: NodeJS.Timeout | null = null;
  private restartTimeout: NodeJS.Timeout | null = null;

  private autoCashedOutBetIds = new Set<number>();
  private activeAutoCashouts: PlayerBet[] = [];
  private previousMultiplier = 1.0;

  get autoCashoutState() {
    return {
      processedIds: this.autoCashedOutBetIds,
      activeBets: this.activeAutoCashouts,
      previousMultiplier: this.previousMultiplier,
      setPreviousMultiplier: (value: number) => {
        this.previousMultiplier = value;
      },
    };
  }

  resetAutoCashoutState(bets: PlayerBet[]): void {
    this.autoCashedOutBetIds.clear();
    this.activeAutoCashouts = bets;
    this.previousMultiplier = 1.0;
  }

  markAutoCashoutProcessed(betId: number): void {
    this.autoCashedOutBetIds.add(betId);
  }

  unmarkAutoCashoutProcessed(betId: number): void {
    this.autoCashedOutBetIds.delete(betId);
  }

  updateActiveAutoCashout(bet: PlayerBet): void {
    const index = this.activeAutoCashouts.findIndex((b) => b.id === bet.id);
    if (index !== -1) {
      this.activeAutoCashouts[index] = bet;
    }
  }

  setBettingTimeout(timeout: NodeJS.Timeout): void {
    this.clearBettingTimeout();
    this.bettingTimeout = timeout;
  }

  clearBettingTimeout(): void {
    if (this.bettingTimeout) {
      clearTimeout(this.bettingTimeout);
      this.bettingTimeout = null;
    }
  }

  setFlyingInterval(interval: NodeJS.Timeout): void {
    this.clearFlyingInterval();
    this.flyingInterval = interval;
  }

  clearFlyingInterval(): void {
    if (this.flyingInterval) {
      clearInterval(this.flyingInterval);
      this.flyingInterval = null;
    }
  }

  setRestartTimeout(timeout: NodeJS.Timeout): void {
    this.clearRestartTimeout();
    this.restartTimeout = timeout;
  }

  clearRestartTimeout(): void {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
  }

  replacePlayers(players: PlayerBet[]): void {
    this.players = players;
  }

  upsertPlayer(bet: PlayerBet): void {
    const index = this.players.findIndex((p) => p.id === bet.id);
    if (index === -1) {
      this.players.push(bet);
    } else {
      this.players[index] = bet;
    }
  }
}
