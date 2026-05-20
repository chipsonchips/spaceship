import type { Server } from 'socket.io';
import type { Round } from '../../entities/round.entity.js';
import type { PlayerBet } from '../../entities/player-bet.entity.js';
import type { GameSettings } from '../../entities/game-settings.entity.js';
import type { LeaderboardService } from '../leaderboard.service.js';
import type { HistoryService } from '../history.service.js';
import type { FreeBetService } from '../free-bet.service.js';
import type { UserService } from '../user.service.js';
import type { ChainService } from '../chain.service.js';

export type GamePhase = 'BETTING' | 'FLYING' | 'CRASHED';

export interface FlyingSessionConfig {
  targetCrash: number;
  flyingDurationMs: number;
  maxCrashMultiplier: number;
  flyStartTime: number;
}

export interface CachedGameSettings {
  minBetAmount: number;
  maxBetAmount: number;
  bettingDurationMs: number;
  flyingDurationMs: number;
  roundRestartDelayMs: number;
  houseEdge: number;
  minCrashMultiplier: number;
  maxCrashMultiplier: number;
}

export interface GameEngineServices {
  leaderboard: LeaderboardService;
  history: HistoryService;
  freeBets: FreeBetService;
  users: UserService;
  getChain: () => ChainService | null;
}

export interface GameEngineContext {
  io: Server;
  encryptionSecret: string;
  services: GameEngineServices;
  getSettings: () => Promise<CachedGameSettings>;
}

export interface RoundSnapshot {
  round: Round;
  players: PlayerBet[];
  settings: CachedGameSettings;
}

export function toCachedSettings(settings: GameSettings): CachedGameSettings {
  return {
    minBetAmount: Number(settings.minBetAmount ?? 0.1),
    maxBetAmount: Number(settings.maxBetAmount ?? 10),
    bettingDurationMs: Number(settings.bettingDurationMs ?? 10000),
    flyingDurationMs: Number(settings.flyingDurationMs ?? 20000),
    roundRestartDelayMs: Number(settings.roundRestartDelayMs ?? 5000),
    houseEdge: Number(settings.houseEdge ?? 0.03),
    minCrashMultiplier: Number(settings.minCrashMultiplier ?? 1.01),
    maxCrashMultiplier: Number(settings.maxCrashMultiplier ?? 100),
  };
}
