import { Server } from 'socket.io';
import { AppDataSource } from '../config/database.js';
import { Round } from '../entities/round.entity.js';
import { PlayerBet } from '../entities/player-bet.entity.js';
import { LeaderboardService } from './leaderboard.service.js';
import { HistoryService } from './history.service.js';
import { FreeBetService } from './free-bet.service.js';
import { UserService } from './user.service.js';
import { ChainService } from './chain.service.js';
import { logger } from '../utils/logger.js';
import {
  BetHandler,
  FlyingSessionService,
  GameBroadcaster,
  GameStateStore,
  RoundLifecycle,
  RoundRepository,
  SettlementWorker,
  getCachedGameSettings,
} from './game/index.js';
import { registerGameSocketHandlers } from './game/socket-handlers.js';
import type { GameEngineServices } from './game/types.js';

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || '';

/**
 * Orchestrates the Aviator round loop, real-time broadcasts, and bet actions.
 * Heavy logic lives in `services/game/*` for maintainability and testability.
 */
export class GameEngine {
  private readonly state = new GameStateStore();
  private readonly rounds = new RoundRepository();
  private readonly initPromise: Promise<void>;

  private readonly broadcaster: GameBroadcaster;
  private readonly bets: BetHandler;
  private readonly lifecycle: RoundLifecycle;
  private readonly flyingSession: FlyingSessionService;
  private readonly settlement: SettlementWorker;

  isRunning = false;

  readonly leaderboardService = new LeaderboardService();
  readonly historyService = new HistoryService();
  readonly freeBetService = new FreeBetService();
  readonly userService = new UserService();
  chainService: ChainService | null = null;

  constructor(io: Server) {
    const services: GameEngineServices = {
      leaderboard: this.leaderboardService,
      history: this.historyService,
      freeBets: this.freeBetService,
      users: this.userService,
      getChain: () => this.chainService,
    };

    this.broadcaster = new GameBroadcaster(
      io,
      this.state,
      this.rounds,
      ENCRYPTION_SECRET,
      getCachedGameSettings,
    );

    this.bets = new BetHandler(this.state, this.rounds, this.broadcaster, services);

    this.flyingSession = new FlyingSessionService(
      this.state,
      this.broadcaster,
      (betId, chainId, multiplier) =>
        this.bets
          .cashOutById(betId, chainId, true, multiplier)
          .then(() => undefined),
      (targetCrash) => {
        void this.lifecycle.crashRound(targetCrash);
      },
    );

    this.lifecycle = new RoundLifecycle(
      this.state,
      this.rounds,
      this.broadcaster,
      this.flyingSession,
      this.bets,
      services,
      () => this.startNewRound(),
    );

    this.settlement = new SettlementWorker(io, this.rounds);

    registerGameSocketHandlers(
      io,
      this.state,
      this.rounds,
      this.bets,
      this.broadcaster,
      ENCRYPTION_SECRET,
    );

    this.initPromise = this.initialize().catch((error) => {
      logger.error('Failed to initialize game engine', { error });
      throw error;
    });
  }

  /** Active round (in-memory authority during live play). */
  get currentRound(): Round | null {
    return this.state.currentRound;
  }

  set currentRound(round: Round | null) {
    this.state.currentRound = round;
  }

  private async initialize(): Promise<void> {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.isRunning = true;
    logger.info('Game engine initialized');
  }

  async start(): Promise<void> {
    await this.initPromise;
    logger.info('Starting game engine');

    try {
      this.settlement.start();
      await this.lifecycle.start();
      logger.info('Game engine started successfully');
    } catch (error) {
      logger.error('Failed to start game engine', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      throw error;
    }
  }

  startNewRound(): Promise<Round> {
    return this.lifecycle.startNewRound();
  }

  placeBet(
    address: string,
    amount: number,
    chainId: number,
    useFreeBet = false,
    autoCashoutMultiplier?: number,
    clientSeed?: string,
  ): Promise<PlayerBet> {
    return this.bets.placeBet(
      address,
      amount,
      chainId,
      useFreeBet,
      autoCashoutMultiplier,
      clientSeed,
    );
  }

  cashOutById(
    betId: number,
    chainId: number,
    isAutoCashout = false,
    exactMultiplier?: number,
  ): Promise<PlayerBet> {
    return this.bets.cashOutById(betId, chainId, isAutoCashout, exactMultiplier);
  }

  crashRound(crashMultiplier: number): Promise<void> {
    return this.lifecycle.crashRound(crashMultiplier);
  }

  async broadcastGameState(): Promise<void> {
    await this.broadcaster.emitStateWithFreshPlayers();
  }
}
