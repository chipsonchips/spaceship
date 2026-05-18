import { Server } from 'socket.io';
import crypto from 'crypto';
import { Round } from '../entities/round.entity.js';
import { PlayerBet, BetStatus, SettlementStatus } from '../entities/player-bet.entity.js';
import { AppDataSource } from '../config/database.js';
import {
  generateCrashMultiplier,
  calculateCurrentMultiplier,
  calculatePlanePosition,
  generateServerSeed,
  hashServerSeed,
  sanitizeRound,
} from './game-utils.js';
import { LeaderboardService } from './leaderboard.service.js';
import { HistoryService } from './history.service.js';
import { FreeBetService } from './free-bet.service.js';
import { UserService } from './user.service.js';
import { ChainService } from './chain.service.js';
import { logger } from '../utils/logger.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { combineClientSeeds, createFinalSeed } from '../utils/provably-fair.js';

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || '';
import { securityMonitor } from './security-monitor.service.js';
import { auditLogService } from './audit-log.service.js';
import { GAME_CONSTANTS } from '../constants.js';
import { AdminActionType } from '../entities/admin-log.entity.js';
import { gameSettingsService } from './game-settings.service.js';

export class GameEngine {
  private isRunning = false;
  private initPromise: Promise<void>;
  private io: Server;
  private currentRound: Round | null = null;
  private flyingInterval: NodeJS.Timeout | null = null;
  private bettingTimeout: NodeJS.Timeout | null = null;
  private settlementRetryInterval: NodeJS.Timeout | null = null;
  private autoCashedOutBets = new Set<number>(); // Track already auto-cashed bets
  private activeAutoCashouts: PlayerBet[] = []; // In-memory active bets for current round
  private previousMultiplier = 1.0; // Track previous multiplier for interpolation
  private chainServices = new Map<number, ChainService>();
  private readonly BETTING_DURATION_MS = GAME_CONSTANTS.BETTING_DURATION_MS;
  private readonly ROUND_RESTART_DELAY_MS = GAME_CONSTANTS.ROUND_RESTART_DELAY_MS;
  private readonly SETTLEMENT_RETRY_INTERVAL_MS = 60000; // Retry every 60 seconds

  leaderboardService = new LeaderboardService();
  historyService = new HistoryService();
  freeBetService = new FreeBetService();
  userService = new UserService();
  chainService: import('./chain.service.js').ChainService | null = null;

  constructor(io: Server) {
    this.io = io;

    this.initPromise = this.initializeEngine().catch((error) => {
      logger.error('Failed to initialize game engine', { error });
      throw error;
    });

    this.io.on('connection', (socket) => {
      (async () => {
        try {
          // Fetch current round with player relations on connection
          const round = await this.roundRepo.findOne({
            where: {},
            relations: ['players'],
            order: { roundId: 'DESC' },
          });
          const roundData = round
            ? {
              ...round,
              players: round.players || [],
            }
            : this.currentRound;

          const sanitizedData = roundData ? sanitizeRound(roundData, ENCRYPTION_SECRET) : null;
          socket.emit('GAME_STATE_UPDATE', sanitizedData);
        } catch (error) {
          logger.error('Failed to emit initial game state', { error });
          const sanitizedCurrent = this.currentRound ? sanitizeRound(this.currentRound, ENCRYPTION_SECRET) : null;
          socket.emit('GAME_STATE_UPDATE', sanitizedCurrent);
        }
      })();

      socket.on(
        'PLACE_BET',
        async (data: { address: string; amount: number; chainId: number; useFreeBet?: boolean }) => {
          try {
            await this.placeBet(data.address, data.amount, data.chainId, data.useFreeBet || false);
            socket.emit('BET_PLACED', { success: true });
            await this.broadcastGameState();
          } catch (err) {
            socket.emit('ERROR', { message: (err as Error).message });
          }
        }
      );

      socket.on('CASH_OUT', async (data: { betId: number; chainId: number }) => {
        try {
          await this.cashOutById(data.betId, data.chainId);
          socket.emit('CASH_OUT_SUCCESS', { success: true });
          await this.broadcastGameState();
        } catch (err) {
          socket.emit('ERROR', { message: (err as Error).message });
        }
      });
    });
  }

  private async initializeEngine() {
    try {
      // Ensure database is connected
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }
      this.isRunning = true;
      logger.info('Game engine initialized');

      // Start settlement retry background job
      this.startSettlementRetryJob();
    } catch (error) {
      logger.error('Failed to initialize game engine', { error });
      throw error;
    }
  }

  private get roundRepo() {
    return AppDataSource.getRepository(Round);
  }

  private get betRepo() {
    return AppDataSource.getRepository(PlayerBet);
  }

  private async checkHouseBalance(chainId: number, requiredAmount: number): Promise<{ sufficient: boolean; balance: number }> {
    try {
      if (!this.chainServices.has(Number(chainId))) {
        const { ChainService } = await import('./chain.service.js');
        this.chainServices.set(Number(chainId), new ChainService(Number(chainId)));
      }

      const chainService = this.chainServices.get(Number(chainId));
      if (!chainService) {
        logger.warn('Chain service not available for balance check', { chainId });
        return { sufficient: false, balance: 0 };
      }

      const balance = await chainService.getHouseBalance();
      return { sufficient: balance >= requiredAmount, balance };
    } catch (err) {
      logger.error('Failed to check house balance', {
        chainId,
        error: (err as Error).message
      });
      return { sufficient: false, balance: 0 };
    }
  }

  private startSettlementRetryJob() {
    // Clear existing interval if any
    if (this.settlementRetryInterval) {
      clearInterval(this.settlementRetryInterval);
    }

    // Run immediately on start
    this.retryPendingSettlements().catch(err => {
      logger.error('Settlement retry job failed', { error: (err as Error).message });
    });

    // Then run periodically
    this.settlementRetryInterval = setInterval(() => {
      this.retryPendingSettlements().catch(err => {
        logger.error('Settlement retry job failed', { error: (err as Error).message });
      });
    }, this.SETTLEMENT_RETRY_INTERVAL_MS);

    logger.info('Settlement retry job started', { intervalMs: this.SETTLEMENT_RETRY_INTERVAL_MS });
  }

  private async retryPendingSettlements() {
    try {
      const pendingCashouts = await this.betRepo.find({
        where: {
          cashedOut: true,
          settlementStatus: SettlementStatus.PENDING_FUNDS
        },
        relations: ['round'],
        take: 50 // Process in batches
      });

      if (pendingCashouts.length === 0) {
        return;
      }

      logger.info('Retrying pending settlements', { count: pendingCashouts.length });

      for (const bet of pendingCashouts) {
        try {
          if (!bet.chainId || !bet.payout) {
            logger.warn('Skipping bet with missing data', { betId: bet.id });
            continue;
          }

          const balanceCheck = await this.checkHouseBalance(bet.chainId, Number(bet.payout));

          if (balanceCheck.sufficient) {
            if (!this.chainServices.has(bet.chainId)) {
              const { ChainService } = await import('./chain.service.js');
              this.chainServices.set(bet.chainId, new ChainService(bet.chainId));
            }

            const chainService = this.chainServices.get(bet.chainId);
            if (!chainService) {
              logger.warn('Chain service not available', { chainId: bet.chainId });
              continue;
            }

            await chainService.cashOutFor(
              bet.round.roundId,
              bet.address,
              Number(bet.payout),
              Number(bet.cashoutMultiplier)
            );

            bet.settlementStatus = SettlementStatus.SETTLED;
            await this.betRepo.save(bet);

            logger.info('Successfully settled pending cashout', {
              betId: bet.id,
              address: bet.address,
              payout: bet.payout
            });

            // Notify user of successful settlement
            this.io.emit('CASHOUT_SETTLED', {
              address: bet.address,
              betId: bet.id,
              payout: bet.payout,
              timestamp: Date.now()
            });
          } else {
            logger.debug('Still insufficient balance for pending cashout', {
              betId: bet.id,
              required: Number(bet.payout),
              available: balanceCheck.balance
            });
          }
        } catch (err) {
          logger.error('Failed to settle pending cashout', {
            betId: bet.id,
            error: (err as Error).message
          });

          // Don't mark as failed yet, keep retrying
          // Only mark as failed after too many attempts or critical errors
          const errorMessage = (err as Error).message.toLowerCase();
          if (errorMessage.includes('invalid') || errorMessage.includes('not found')) {
            bet.settlementStatus = SettlementStatus.FAILED;
            await this.betRepo.save(bet);

            logger.error('Marking cashout as permanently failed', { betId: bet.id });
          }
        }
      }
    } catch (err) {
      logger.error('Error in retryPendingSettlements', { error: (err as Error).message });
    }
  }

  async start() {
    if (this.initPromise) {
      await this.initPromise;
    }

    // ensure there is at least one round
    const r = await this.roundRepo.findOne({ where: {}, order: { roundId: 'DESC' } });
    if (!r) {
      await this.startNewRound();
    } else if (r.phase === 'BETTING') {
      this.currentRound = r;
      this.broadcastGameState();
      await this.scheduleFlyingPhase();
    } else if (r.phase === 'FLYING') {
      this.currentRound = r;
      this.broadcastGameState();
      logger.info('Existing round is in FLYING phase, crashing it to reset');
      await this.crashRound(1.0);
    } else {
      await this.startNewRound();
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 5,
    baseDelayMs = 100,
    attempt = 1
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      const err = error as Error & { code?: string; driverError?: { code?: string } };
      const errorMessage = err.message || String(error);

      // Check if this is a retryable error (serialization, connection, or context errors)
      const isRetryable =
        errorMessage.includes('serialization') ||
        errorMessage.includes('context has been closed') ||
        errorMessage.includes('SERIALIZATION_FAILURE') ||
        errorMessage.includes('connection') ||
        err.code === '40P01' || // PostgreSQL serialization failure
        err.driverError?.code === '40P01';

      if (attempt >= maxRetries || !isRetryable) {
        logger.error('Operation failed, not retrying', {
          attempt,
          maxRetries,
          isRetryable,
          error: errorMessage
        });
        throw error;
      }

      // Exponential backoff with jitter
      const delayMs = Math.min(
        1000, // max delay of 1 second
        baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 100
      );

      logger.warn(`Operation failed, retrying (${attempt}/${maxRetries})`, {
        error: errorMessage,
        isRetryable,
        nextRetryIn: `${delayMs}ms`,
      });

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return this.executeWithRetry(operation, maxRetries, baseDelayMs, attempt + 1);
    }
  }

  async startNewRound(): Promise<Round> {
    return this.executeWithRetry<Round>(
      async () => {
        const queryRunner = AppDataSource.createQueryRunner();

        try {
          await queryRunner.connect();
          await queryRunner.startTransaction('SERIALIZABLE'); // Use SERIALIZABLE isolation level

          // Get active database settings
          const settings = await gameSettingsService.getSettings();
          const bettingDuration = Number(settings.bettingDurationMs || 10000);

          // Get the latest round with a lock
          const last = await queryRunner.manager.findOne(Round, {
            where: {},
            order: { roundId: 'DESC' },
            lock: { mode: 'pessimistic_write' },
          });

          // Double check if a new round was created while we were waiting for the lock
          if (this.currentRound && (!last || this.currentRound.id !== last.id)) {
            logger.info('A new round was already created, returning existing round');
            return this.currentRound;
          }

          const nextId = last ? last.roundId + 1 : 1;
          const serverSeed = generateServerSeed();
          const serverSeedHash = hashServerSeed(serverSeed);

          // Encrypt server seed for storage
          let encryptedSeed = serverSeed;
          let iv: string | null = null;
          let authTag: string | null = null;

          if (ENCRYPTION_SECRET) {
            const encrypted = encrypt(serverSeed, ENCRYPTION_SECRET);
            encryptedSeed = encrypted.encrypted;
            iv = encrypted.iv;
            authTag = encrypted.authTag;
          } else {
            logger.warn('ENCRYPTION_SECRET not set, storing server seed in plaintext');
          }

          logger.info(`Creating new round with ID: ${nextId}`);

          const round = this.roundRepo.create({
            roundId: nextId,
            phase: 'BETTING',
            startTime: Date.now(),
            flyStartTime: Date.now() + bettingDuration,
            crashMultiplier: null,
            currentMultiplier: 1.0,
            serverSeed: encryptedSeed,
            serverSeedIV: iv,
            serverSeedAuthTag: authTag,
            serverSeedHash,
            totalBets: 0,
            totalPayouts: 0,
            settled: false,
            planePosition: { x: 50, y: 0 },
          });

          await queryRunner.manager.save(round);
          await queryRunner.commitTransaction();

          this.currentRound = round;
          this.broadcastGameState();
          await this.scheduleFlyingPhase();

          logger.info(
            `Successfully created new round with ID: ${round.id}, Round ID: ${round.roundId}`
          );
          return round;
        } catch (error: unknown) {
          await queryRunner.rollbackTransaction().catch((rollbackError) => {
            logger.error('Failed to rollback transaction', { error: rollbackError });
          });

          const err = error as Error & { code?: string };
          if (
            err.code === '23505' ||
            err.message.includes('duplicate key') ||
            err.code === '40001' /* serialization_failure */
          ) {
            throw error; // Will be caught by executeWithRetry
          }

          logger.error('Unexpected error in startNewRound', { error });
          throw error;
        } finally {
          await queryRunner.release().catch((releaseError) => {
            logger.error('Failed to release query runner', { error: releaseError });
          });
        }
      },
      5,
      100
    ); // 5 retries, starting with 100ms delay
  }

  private async scheduleFlyingPhase() {
    if (this.bettingTimeout) clearTimeout(this.bettingTimeout);
    // If a scheduled flyStartTime exists (e.g., after restart), use the remaining time
    const now = Date.now();
    const settings = await gameSettingsService.getSettings();
    const bettingDuration = Number(settings.bettingDurationMs || 10000);

    const remainingMs =
      this.currentRound && this.currentRound.flyStartTime
        ? Math.max(0, Number(this.currentRound.flyStartTime) - now)
        : bettingDuration;

    this.bettingTimeout = setTimeout(() => this.startFlyingPhase(), remainingMs);
  }

  async startFlyingPhase() {

    if (!this.currentRound || this.currentRound.phase !== 'BETTING') {
      logger.warn('startFlyingPhase aborted: no current betting round', {
        hasRound: !!this.currentRound,
        phase: this.currentRound?.phase
      });
      return;
    }

    // Load active settings dynamically
    const settings = await gameSettingsService.getSettings();
    const houseEdge = Number(settings.houseEdge || 0.03);
    const minCrashMultiplier = Number(settings.minCrashMultiplier || 1.01);
    const maxCrashMultiplier = Number(settings.maxCrashMultiplier || 100.00);

    // 1. Decrypt server seed
    let serverSeed = this.currentRound.serverSeed || '';
    if (ENCRYPTION_SECRET && this.currentRound.serverSeedIV && this.currentRound.serverSeedAuthTag) {
      try {
        serverSeed = decrypt(
          this.currentRound.serverSeed!,
          this.currentRound.serverSeedIV!,
          this.currentRound.serverSeedAuthTag!,
          ENCRYPTION_SECRET
        );
      } catch (err) {
        logger.error('Failed to decrypt server seed', {
          roundId: this.currentRound.roundId,
          error: (err as Error).message
        });
      }
    }

    // Log seed access for audit
    await auditLogService.logAction(
      null,
      AdminActionType.SEED_ACCESSED,
      `Server seed decrypted for crash point calculation`,
      { roundId: this.currentRound.roundId, serverSeedHash: this.currentRound.serverSeedHash },
      null,
      null,
      true
    );

    // 2. Get all client seeds from bets
    const bets = await this.betRepo.find({
      where: { round: { id: this.currentRound.id } },
    });

    const clientSeeds = bets
      .map((b) => b.clientSeed)
      .filter((s) => s !== null && s !== undefined) as string[];

    // 3. Combine client seeds
    const combinedClientSeedHash = combineClientSeeds(clientSeeds);

    // 4. Create final seed
    const nonce = this.currentRound.roundId;
    const finalSeed = createFinalSeed(serverSeed, combinedClientSeedHash, nonce);

    // 5. Calculate crash point from final seed using dynamic configurations
    const targetCrash = generateCrashMultiplier(finalSeed, houseEdge, minCrashMultiplier, maxCrashMultiplier);

    // 6. Store for verification
    this.currentRound.combinedClientSeedHash = combinedClientSeedHash;
    this.currentRound.finalSeed = finalSeed;

    const maxFlyingDuration = Number(settings.flyingDurationMs || 20000);
    const flyingDuration = Math.min(maxFlyingDuration, Math.max(2000, targetCrash * 2000));

    // Update round phase with atomic query-builder update to eliminate serialization locks/conflicts!
    const flyStartTime = Date.now();
    try {
      await this.executeWithRetry(async () => {
        if (this.currentRound) {
          await this.roundRepo.createQueryBuilder()
            .update(Round)
            .set({
              phase: 'FLYING',
              flyStartTime,
              combinedClientSeedHash,
              finalSeed
            })
            .where('id = :id', { id: this.currentRound.id })
            .execute();
        }
      });

      this.currentRound.phase = 'FLYING';
      this.currentRound.flyStartTime = flyStartTime;
    } catch (err) {
      logger.error('Failed to update round phase to FLYING in DB. Force continuing in-memory to prevent game freeze!', { error: (err as Error).message });
      // CRITICAL FALLBACK: Force-update the in-memory state to guarantee the game engine loop does not halt.
      this.currentRound.phase = 'FLYING';
      this.currentRound.flyStartTime = flyStartTime;
    }

    // Broadcast phase change immediately
    await this.broadcastGameState();

    this.autoCashedOutBets.clear(); // Reset for new round
    this.previousMultiplier = 1.0; // Reset previous multiplier

    // Fetch all bets with auto-cashout for this round once
    this.activeAutoCashouts = await this.betRepo.find({
      where: { round: { id: this.currentRound.id }, cashedOut: false },
    });

    const startTime = Date.now();

    if (this.flyingInterval) clearInterval(this.flyingInterval);

    this.flyingInterval = setInterval(async () => {
      if (!this.currentRound) return;
      const elapsed = Date.now() - startTime;

      this.currentRound.currentMultiplier = calculateCurrentMultiplier(elapsed, maxCrashMultiplier);
      this.currentRound.planePosition = calculatePlanePosition(elapsed);

      // Check for auto-cashouts (fire-and-forget, non-blocking)
      this.processAutoCashouts().catch((err) => {
        logger.error('Error in auto-cashout processing', { error: (err as Error).message });
      });

      // Update previous multiplier for next iteration
      this.previousMultiplier = this.currentRound.currentMultiplier;

      // Persist updates occasionally using targeted atomic updates to avoid transaction deadlock conflicts!
      if (elapsed % 1000 < 60) {
        this.executeWithRetry(async () => {
          if (this.currentRound) {
            await this.roundRepo.createQueryBuilder()
              .update(Round)
              .set({
                currentMultiplier: this.currentRound.currentMultiplier,
                planePosition: this.currentRound.planePosition
              })
              .where('id = :id', { id: this.currentRound.id })
              .execute();
          }
        }).catch((err) => {
          logger.warn('Failed to persist round state update', { error: (err as Error).message });
        });
      }

      await this.broadcastGameState();

      if (
        elapsed >= flyingDuration ||
        this.currentRound.currentMultiplier >= targetCrash
      ) {
        await this.crashRound(targetCrash);
      }
    }, 50);
  }

  private async processAutoCashouts() {
    if (!this.currentRound || this.currentRound.phase !== 'FLYING') {
      return;
    }

    try {
      // Use in-memory bets instead of DB lookup every 50ms
      const players = this.activeAutoCashouts.filter(p => !p.cashedOut);

      for (const player of players) {
        // Skip if already processed or no auto-cashout set
        if (
          this.autoCashedOutBets.has(player.id) ||
          !player.autoCashoutMultiplier
        ) {
          continue;
        }

        const targetMultiplier = Number(player.autoCashoutMultiplier);
        const currentMultiplier = this.currentRound.currentMultiplier;

        // Check if we've crossed the target multiplier
        // previousMultiplier < target <= currentMultiplier
        if (this.previousMultiplier < targetMultiplier && currentMultiplier >= targetMultiplier) {
          // Interpolate to find the exact multiplier at trigger point
          // This gives us a more precise cashout multiplier
          const exactMultiplier = targetMultiplier;

          // Mark as processed immediately to avoid duplicate attempts
          this.autoCashedOutBets.add(player.id);

          // Fire-and-forget: don't await, let it process in background
          this.performAutoCashout(player, exactMultiplier).catch((err) => {
            logger.error('Auto-cashout failed for bet', {
              betId: player.id,
              address: player.address,
              targetMultiplier,
              exactMultiplier,
              currentMultiplier,
              error: (err as Error).message,
            });
            // Remove from processed set so it can retry
            this.autoCashedOutBets.delete(player.id);
          });
        }
      }
    } catch (err) {
      logger.error('Error fetching bets for auto-cashout', { error: (err as Error).message });
    }
  }

  private async performAutoCashout(player: PlayerBet, exactMultiplier?: number) {
    if (!player.chainId) {
      logger.warn('Auto-cashout skipped: no chainId stored for bet', { betId: player.id });
      return;
    }

    try {
      await this.cashOutById(player.id, player.chainId, true, exactMultiplier);
      logger.info('Auto-cashout successful', {
        betId: player.id,
        address: player.address,
        targetMultiplier: player.autoCashoutMultiplier,
        exactMultiplier: exactMultiplier || player.autoCashoutMultiplier,
      });
    } catch (err) {
      const errorMsg = (err as Error).message;
      logger.error('Auto-cashout failed', {
        betId: player.id,
        address: player.address,
        chainId: player.chainId,
        targetMultiplier: player.autoCashoutMultiplier,
        exactMultiplier: exactMultiplier || player.autoCashoutMultiplier,
        error: errorMsg,
      });
      throw err;
    }
  }

  async crashRound(crashMultiplier: number) {
    if (!this.currentRound || this.currentRound.phase !== 'FLYING') {
      return;
    }

    if (this.flyingInterval) {
      clearInterval(this.flyingInterval);
      this.flyingInterval = null;
    }

    // Guard against re-entry by updating phase immediately in-memory
    this.currentRound.phase = 'CRASHED';
    this.currentRound.crashMultiplier = crashMultiplier;
    this.currentRound.currentMultiplier = crashMultiplier;

    // Wrap database operations in retry logic to handle serialization errors
    await this.executeWithRetry(async () => {
      if (!this.currentRound) return;

      // Detect perfect cashouts
      await securityMonitor.detectPerfectCashouts(this.currentRound.roundId);

      // determine losers (non-cashed) and update leaderboard
      const players: PlayerBet[] = await this.betRepo.find({
        where: { round: { id: this.currentRound!.id } },
      });

      for (const p of players) {
        if (!p.cashedOut) {
          p.payout = 0;
          await this.betRepo.save(p);
          await this.leaderboardService.updateFromBet({
            address: p.address,
            amount: Number(p.amount),
            cashedOut: false,
          });
        }
      }

      // Perform atomic database update for round finalization!
      await this.roundRepo.createQueryBuilder()
        .update(Round)
        .set({
          phase: 'CRASHED',
          crashMultiplier: crashMultiplier,
          currentMultiplier: crashMultiplier,
          settled: true
        })
        .where('id = :id', { id: this.currentRound.id })
        .execute();

      this.currentRound!.settled = true;

      // record history
      await this.historyService.record({
        roundId: this.currentRound!.roundId,
        crashMultiplier: Number(crashMultiplier),
        timestamp: Date.now(),
        totalBets: Number(this.currentRound!.totalBets || 0),
        totalPayouts: Number(this.currentRound!.totalPayouts || 0),
        winnersCount: players.filter((p) => p.cashedOut).length,
      });
    }, 10); // Increase max retries to 10 for this critical operation

    // Submit an on-chain snapshot asynchronously (if chain service configured)
    if (this.chainService) {
      try {
        await this.executeWithRetry(async () =>
          this.chainService!.submitRoundSnapshot(
            this.currentRound!,
            (await this.betRepo.find({
              where: { round: { id: this.currentRound!.id } },
            })) as PlayerBet[]
          )
        );
      } catch (err: unknown) {
        logger.error('Round snapshot submission failed', { error: (err as Error).message });
      }
    }

    // Broadcast updated history to all clients
    const latestHistory = await this.historyService.latest(28);
    this.io.emit('HISTORY_UPDATE', latestHistory);

    this.broadcastGameState();

    // Query active settings for dynamic round restart delay
    const settings = await gameSettingsService.getSettings();
    setTimeout(() => this.startNewRound(), Number(settings.roundRestartDelayMs || 5000));
  }

  async placeBet(
    address: string,
    amount: number,
    chainId: number,
    useFreeBet: boolean = false,
    autoCashoutMultiplier?: number,
    clientSeed?: string
  ) {
    if (!chainId) {
      throw new Error('chainId is required. Pass the connected chain from the frontend.');
    }
    if (!this.currentRound || this.currentRound.phase !== 'BETTING')
      throw new Error('Betting closed');

    // Get active settings from database dynamically
    const settings = await gameSettingsService.getSettings();
    const globalMinBet = Number(settings.minBetAmount || 0.1);
    const globalMaxBet = Number(settings.maxBetAmount || 10);
    const maxCrashMultiplier = Number(settings.maxCrashMultiplier || 100);

    // Basic amount validation
    if (amount < globalMinBet) {
      throw new Error(`Bet amount must be at least ${globalMinBet} USDC`);
    }

    if (amount > globalMaxBet) {
      throw new Error(`Bet amount exceeds global maximum of ${globalMaxBet} USDC`);
    }

    if (autoCashoutMultiplier && (autoCashoutMultiplier < 1.01 || autoCashoutMultiplier > maxCrashMultiplier)) {
      throw new Error(`Auto-cashout multiplier must be between 1.01 and ${maxCrashMultiplier}`);
    }

    // Generate client seed if not provided
    if (!clientSeed) {
      clientSeed = crypto.randomBytes(16).toString('hex');
    }

    if (securityMonitor.isSuspicious(address)) {
      throw new Error('Your account is under review. Please contact support.');
    }

    // Get user
    const user = await this.userService.getUserByAddress(address);
    if (!user) {
      throw new Error('User not found');
    }

    const userMaxBet = user.maxBetAmount ?? globalMaxBet;
    if (amount > userMaxBet) {
      throw new Error(`Bet amount exceeds your maximum of ${userMaxBet} USDC`);
    }

    let chainService: ChainService | null = null;
    if (!useFreeBet) {
      // 1. Pre-validation (Fast RPC read)
      if (!this.chainServices.has(Number(chainId))) {
        const { ChainService } = await import('./chain.service.js');
        this.chainServices.set(Number(chainId), new ChainService(Number(chainId)));
      }
      chainService = this.chainServices.get(Number(chainId))!;

      const validation = await chainService.validatePlayerFunds(address, amount);
      if (!validation.ok) {
        throw new Error(validation.reason);
      }
    } else {
      // Handle free bet logic
      const freeBetsRemaining = await this.freeBetService.getFreeBetsRemaining(user.id);
      if (freeBetsRemaining <= 0) {
        throw new Error('No free bets remaining');
      }

      const maxFreeBetAmount = await this.freeBetService.getFreeBetMaxAmount(user.id);
      if (amount > maxFreeBetAmount) {
        throw new Error(`Free bet amount exceeds maximum of ${maxFreeBetAmount} USDC`);
      }

      // Record free bet usage
      await this.freeBetService.useFreeBet(user.id, amount, this.currentRound.roundId);
    }

    // 2. Save bet to DB as PENDING (Instant)
    const bet = await this.executeWithRetry(async () => {
      const newBet = this.betRepo.create({
        address,
        amount,
        cashedOut: false,
        cashoutMultiplier: null,
        payout: null,
        status: useFreeBet ? BetStatus.VALIDATED : BetStatus.PENDING,
        txHash: null,
        autoCashoutMultiplier: autoCashoutMultiplier || null,
        chainId,
        timestamp: Date.now(),
        clientSeed,
        round: this.currentRound!,
      });
      await this.betRepo.save(newBet);

      // Perform atomic database increment for totalBets to avoid round serialization/locking conflicts!
      await this.roundRepo.createQueryBuilder()
        .update(Round)
        .set({
          totalBets: () => `"totalBets" + ${amount}`
        })
        .where('id = :id', { id: this.currentRound!.id })
        .execute();

      // Update the in-memory state cleanly
      this.currentRound!.totalBets = Number(this.currentRound!.totalBets || 0) + Number(amount);

      // keep leaderboard updated with wager
      await this.leaderboardService.updateFromBet({ address, amount, cashedOut: false });

      return newBet;
    }, 10);

    // 3. Broadcast immediately to show user is in the round
    this.broadcastGameState();

    // 4. Start background on-chain relay (Non-blocking)
    if (!useFreeBet && chainService) {
      const roundIdToRelay = this.currentRound!.roundId;
      (async () => {
        try {
          const txHash = await chainService!.placeBetFor(roundIdToRelay, address, amount);

          // Update bet to VALIDATED
          await this.executeWithRetry(async () => {
            const updatedBet = await this.betRepo.findOne({
              where: { id: bet.id },
              relations: ['round']
            });
            if (updatedBet) {
              updatedBet.status = BetStatus.VALIDATED;
              updatedBet.txHash = txHash;
              await this.betRepo.save(updatedBet);

              // Handle deferred cashout if they cashed out while pending
              if (updatedBet.cashedOut && updatedBet.payout) {
                logger.info('Processing deferred cashout settlement', { betId: updatedBet.id });

                try {
                  // Check house balance before settling
                  const balanceCheck = await this.checkHouseBalance(Number(chainId), Number(updatedBet.payout));

                  if (!balanceCheck.sufficient) {
                    updatedBet.settlementStatus = SettlementStatus.PENDING_FUNDS;
                    await this.betRepo.save(updatedBet);

                    logger.error('Insufficient house balance for deferred cashout', {
                      betId: updatedBet.id,
                      required: Number(updatedBet.payout),
                      available: balanceCheck.balance
                    });
                  } else {
                    await chainService!.cashOutFor(
                      updatedBet.round.roundId,
                      address,
                      Number(updatedBet.payout),
                      Number(updatedBet.cashoutMultiplier)
                    );

                    updatedBet.settlementStatus = SettlementStatus.SETTLED;
                    await this.betRepo.save(updatedBet);
                  }
                } catch (err) {
                  updatedBet.settlementStatus = SettlementStatus.FAILED;
                  await this.betRepo.save(updatedBet);

                  logger.error('Failed to settle deferred cashout', {
                    betId: updatedBet.id,
                    error: (err as Error).message
                  });
                }
              }
            }
          });

          this.broadcastGameState();
        } catch (err) {
          logger.error('Background bet relay failed', {
            betId: bet.id,
            address,
            error: (err as Error).message
          });

          await this.executeWithRetry(async () => {
            const failedBet = await this.betRepo.findOne({
              where: { id: bet.id },
              relations: ['round']
            });
            if (failedBet) {
              failedBet.status = BetStatus.FAILED;
              failedBet.validationError = (err as Error).message;
              await this.betRepo.save(failedBet);

              // Revert totalBets on the round atomically
              await this.roundRepo.createQueryBuilder()
                .update(Round)
                .set({
                  totalBets: () => `GREATEST(0, "totalBets" - ${failedBet.amount})`
                })
                .where('id = :id', { id: failedBet.round.id })
                .execute();

              if (this.currentRound && this.currentRound.id === failedBet.round.id) {
                this.currentRound.totalBets = Math.max(0, Number(this.currentRound.totalBets) - Number(failedBet.amount));
              }
            }
          });

          this.broadcastGameState();
        }
      })();
    }

    return bet;
  }

  async cashOutById(betId: number, chainId: number, isAutoCashout = false, exactMultiplier?: number) {
    if (!chainId) {
      throw new Error('chainId is required. Pass the connected chain from the frontend.');
    }
    const bet = await this.betRepo.findOne({
      where: { id: betId },
      relations: ['round'],
    });
    if (!bet) throw new Error('Bet not found');
    if (bet.cashedOut) throw new Error('Already cashed out');

    // Check if the bet's round is still in FLYING phase
    if (!isAutoCashout && bet.round.phase !== 'FLYING') {
      throw new Error('Cannot cash out: round is not in flying phase');
    }

    // Wrap database operations in retry logic
    const result = await this.executeWithRetry(async () => {
      bet.cashedOut = true;
      bet.cashoutMultiplier = exactMultiplier ?? bet.round.currentMultiplier;
      bet.payout = Number(bet.amount) * Number(bet.cashoutMultiplier || 1);

      await this.betRepo.save(bet);

      // Perform atomic database increment for totalPayouts to avoid round serialization/locking conflicts!
      await this.roundRepo.createQueryBuilder()
        .update(Round)
        .set({
          totalPayouts: () => `"totalPayouts" + ${bet.payout}`
        })
        .where('id = :id', { id: bet.round.id })
        .execute();

      // Update the in-memory state cleanly if it matches our active round
      if (this.currentRound && this.currentRound.id === bet.round.id) {
        this.currentRound.totalPayouts = Number(this.currentRound.totalPayouts || 0) + Number(bet.payout || 0);
      }

      await this.leaderboardService.updateFromBet({
        address: bet.address,
        amount: Number(bet.amount),
        cashedOut: true,
        payout: Number(bet.payout),
        cashoutMultiplier: Number(bet.cashoutMultiplier),
      });

      return bet;
    }, 10);

    // Relay cashout to chain IF validated
    if (result.status === BetStatus.VALIDATED) {
      try {
        // Check house balance before attempting cashout
        const balanceCheck = await this.checkHouseBalance(Number(chainId), Number(result.payout));

        if (!balanceCheck.sufficient) {
          // Mark as pending funds
          result.settlementStatus = SettlementStatus.PENDING_FUNDS;
          await this.betRepo.save(result);

          logger.error('Insufficient house balance for cashout', {
            betId,
            chainId: Number(chainId),
            required: Number(result.payout),
            available: balanceCheck.balance,
            shortfall: Number(result.payout) - balanceCheck.balance
          });

          // Emit different notification for pending settlement
          this.io.emit('CASHOUT_PENDING_SETTLEMENT', {
            address: result.address,
            multiplier: result.cashoutMultiplier,
            payout: result.payout,
            timestamp: Date.now(),
            reason: 'insufficient_house_balance'
          });

          this.broadcastGameState();
          return result;
        }

        if (!this.chainServices.has(Number(chainId))) {
          const { ChainService } = await import('./chain.service.js');
          this.chainServices.set(Number(chainId), new ChainService(Number(chainId)));
        }

        const chainService = this.chainServices.get(Number(chainId));
        if (chainService) {
          await chainService.cashOutFor(result.round.roundId, result.address, Number(result.payout), Number(result.cashoutMultiplier));

          // Mark as settled
          result.settlementStatus = SettlementStatus.SETTLED;
          await this.betRepo.save(result);

          logger.info('Cashout relayed to chain successfully', { betId, chainId: Number(chainId) });
        }
      } catch (err) {
        // Mark settlement as failed
        result.settlementStatus = SettlementStatus.FAILED;
        await this.betRepo.save(result);

        logger.error('Failed to relay cashout to chain', {
          error: (err as Error).message,
          chainId: Number(chainId),
          betId,
        });

        // Emit failure notification
        this.io.emit('CASHOUT_SETTLEMENT_FAILED', {
          address: result.address,
          betId: result.id,
          error: (err as Error).message,
          timestamp: Date.now()
        });
      }
    } else {
      logger.info('Cashout recorded but deferred until bet is validated', { betId: result.id });
    }

    // Update in-memory active bets if it exists there
    const activeBetIndex = this.activeAutoCashouts.findIndex(p => p.id === result.id);
    if (activeBetIndex !== -1) {
      this.activeAutoCashouts[activeBetIndex] = result;
    }

    // Emit cashout notification immediately for UX feedback
    this.io.emit('CASHOUT_NOTIFICATION', {
      address: result.address,
      multiplier: result.cashoutMultiplier,
      payout: result.payout,
      timestamp: Date.now(),
    });

    this.broadcastGameState();

    return result;
  }

  async broadcastGameState() {
    try {
      if (this.currentRound) {
        // 1. Get the latest players (bets) from the DB to ensure we show all bets/cashouts
        const players = await this.betRepo.find({
          where: { round: { id: this.currentRound.id } },
        });

        // Fetch dynamic settings
        const settings = await gameSettingsService.getSettings();

        // 2. Construct the payload using in-memory state for high-frequency data (phase, multiplier, etc.)
        //    and DB data for the players list.
        const roundData = {
          ...this.currentRound, // Use in-memory state (authoritative for phase/multiplier)
          players: players || [], // Use DB state (authoritative for bets)
          minBetAmount: Number(settings.minBetAmount || 0.1),
          maxBetAmount: Number(settings.maxBetAmount || 10),
          bettingDurationMs: Number(settings.bettingDurationMs || 10000),
          flyingDurationMs: Number(settings.flyingDurationMs || 20000),
          roundRestartDelayMs: Number(settings.roundRestartDelayMs || 5000),
          maxCrashMultiplier: Number(settings.maxCrashMultiplier || 100.00),
        };

        const payload = sanitizeRound(roundData, ENCRYPTION_SECRET) as Record<string, unknown>;
        if (payload) payload.serverTime = Date.now();
        this.io.emit('GAME_STATE_UPDATE', payload);
      }
    } catch (error) {
      logger.error('Failed to broadcast game state', { error });
      // Fallback: broadcast current round without updated players if query fails
      const fallbackPayload = sanitizeRound(this.currentRound, ENCRYPTION_SECRET) as Record<string, unknown>;
      if (fallbackPayload) fallbackPayload.serverTime = Date.now();
      this.io.emit('GAME_STATE_UPDATE', fallbackPayload);
    }
  }
}
