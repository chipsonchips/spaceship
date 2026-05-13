import { Server } from 'socket.io';
import crypto from 'crypto';
import { Round } from '../entities/round.entity.js';
import { PlayerBet } from '../entities/player-bet.entity.js';
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
import { AdminActionType } from '../entities/admin-log.entity.js';

export class GameEngine {
  private isRunning = false;
  private io: Server;
  private currentRound: Round | null = null;
  private flyingInterval: NodeJS.Timeout | null = null;
  private bettingTimeout: NodeJS.Timeout | null = null;
  private autoCashedOutBets = new Set<number>(); // Track already auto-cashed bets
  private activeAutoCashouts: PlayerBet[] = []; // In-memory active bets for current round
  private previousMultiplier = 1.0; // Track previous multiplier for interpolation
  private chainServices = new Map<number, ChainService>();
  private readonly BETTING_DURATION_MS = Number(process.env.BETTING_DURATION_MS) || 15000;

  leaderboardService = new LeaderboardService();
  historyService = new HistoryService();
  freeBetService = new FreeBetService();
  userService = new UserService();
  chainService: import('./chain.service.js').ChainService | null = null;

  constructor(io: Server) {
    this.io = io;

    this.initializeEngine().catch((error) => {
      logger.error('Failed to initialize game engine', { error });
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
      await this.startNewRound();
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

  async start() {
    // ensure there is at least one round
    const r = await this.roundRepo.findOne({ where: {}, order: { roundId: 'DESC' } });
    if (!r) {
      await this.startNewRound();
    } else if (r.phase === 'BETTING') {
      this.currentRound = r;
      this.broadcastGameState();
      this.scheduleFlyingPhase();
    } else if (r.phase === 'FLYING') {
      this.currentRound = r;
      this.broadcastGameState();
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
      const err = error as Error & { code?: string };
      if (attempt >= maxRetries) {
        logger.error('Max retries reached, giving up', { attempt, maxRetries, error });
        throw error;
      }

      // Exponential backoff with jitter
      const delayMs = Math.min(
        1000, // max delay of 1 second
        baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 100
      );

      logger.warn(`Operation failed, retrying (${attempt}/${maxRetries})`, {
        error: err.message,
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
            flyStartTime: Date.now() + this.BETTING_DURATION_MS,
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
          this.scheduleFlyingPhase();

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

  private scheduleFlyingPhase() {
    if (this.bettingTimeout) clearTimeout(this.bettingTimeout);
    // If a scheduled flyStartTime exists (e.g., after restart), use the remaining time
    const now = Date.now();
    const remainingMs =
      this.currentRound && this.currentRound.flyStartTime
        ? Math.max(0, Number(this.currentRound.flyStartTime) - now)
        : 10000;

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

    // 5. Calculate crash point from final seed
    const targetCrash = generateCrashMultiplier(finalSeed);

    // 6. Store for verification
    this.currentRound.combinedClientSeedHash = combinedClientSeedHash;
    this.currentRound.finalSeed = finalSeed;

    const flyingDuration = Math.min(20000, Math.max(2000, targetCrash * 2000));

    // Update round phase with retry logic for transaction conflicts
    this.currentRound.phase = 'FLYING';
    this.currentRound.flyStartTime = Date.now();

    try {
      await this.executeWithRetry(async () => {
        if (this.currentRound) {
          await this.roundRepo.save(this.currentRound);
        }
      });
    } catch (err) {
      logger.error('Failed to update round phase to FLYING', { error: (err as Error).message });
      return;
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
      const elapsed = Date.now() - startTime;

      this.currentRound!.currentMultiplier = calculateCurrentMultiplier(elapsed);
      this.currentRound!.planePosition = calculatePlanePosition(elapsed);

      // Check for auto-cashouts (fire-and-forget, non-blocking)
      this.processAutoCashouts().catch((err) => {
        logger.error('Error in auto-cashout processing', { error: (err as Error).message });
      });

      // Update previous multiplier for next iteration
      this.previousMultiplier = this.currentRound!.currentMultiplier;

      // persist small updates occasionally with retry logic
      if (elapsed % 1000 < 60) {
        this.executeWithRetry(async () => {
          if (this.currentRound) {
            await this.roundRepo.save(this.currentRound);
          }
        }).catch((err) => {
          logger.warn('Failed to persist round state update', { error: (err as Error).message });
        });
      }

      await this.broadcastGameState();

      if (
        elapsed >= flyingDuration ||
        this.currentRound!.currentMultiplier >= targetCrash
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

      this.currentRound!.settled = true;
      await this.roundRepo.save(this.currentRound!);

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

    // new round after 5s
    setTimeout(() => this.startNewRound(), 5000);
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

    if (amount < 0.1 || amount > 1000) {
      throw new Error('Invalid bet amount: must be between 0.1 and 1000 USDC');
    }

    if (autoCashoutMultiplier && (autoCashoutMultiplier < 1.01 || autoCashoutMultiplier > 100)) {
      throw new Error('Auto-cashout multiplier must be between 1.01 and 100');
    }

    // Generate client seed if not provided (should be provided by frontend ideally)
    if (!clientSeed) {
      clientSeed = crypto.randomBytes(16).toString('hex');
    }

    if (securityMonitor.isSuspicious(address)) {
      throw new Error('Your account is under review. Please contact support.');
    }

    let finalTxHash: string | null = null;

    // Handle free bet
    if (useFreeBet) {
      const user = await this.userService.getUserByAddress(address);
      if (!user) {
        throw new Error('User not found');
      }

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
    } else {
      // Relay to chain for regular bets
      try {
        if (!this.chainServices.has(Number(chainId))) {
          const { ChainService } = await import('./chain.service.js');
          this.chainServices.set(Number(chainId), new ChainService(Number(chainId)));
        }

        const chainService = this.chainServices.get(Number(chainId));
        if (chainService) {
          finalTxHash = await chainService.placeBetFor(this.currentRound.roundId, address, amount);
        }
      } catch (err) {
        logger.error('Failed to relay bet to chain', {
          error: (err as Error).message,
          chainId: Number(chainId)
        });
        throw new Error('Failed to place bet on chain: ' + (err as Error).message);
      }
    }

    // Wrap database operations in retry logic
    const bet = await this.executeWithRetry(async () => {
      const newBet = this.betRepo.create({
        address,
        amount,
        cashedOut: false,
        cashoutMultiplier: null,
        payout: null,
        txHash: finalTxHash,
        autoCashoutMultiplier: autoCashoutMultiplier || null,
        chainId,
        timestamp: Date.now(),
        clientSeed,
        round: this.currentRound!,
      });
      await this.betRepo.save(newBet);

      this.currentRound!.totalBets =
        Number(this.currentRound!.totalBets || 0) + Number(amount);
      await this.roundRepo.save(this.currentRound!);

      // keep leaderboard updated with wager
      await this.leaderboardService.updateFromBet({ address, amount, cashedOut: false });

      return newBet;
    }, 10);

    this.broadcastGameState();

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
    // For auto-cashout, we allow it to complete even if the round just crashed,
    // as long as it was triggered during the flight.
    if (!isAutoCashout && bet.round.phase !== 'FLYING') {
      throw new Error('Cannot cash out: round is not in flying phase');
    }

    // Wrap database operations in retry logic to handle serialization errors
    const result = await this.executeWithRetry(async () => {
      bet.cashedOut = true;
      // Use exact multiplier if provided (for auto-cashout precision), otherwise use current
      bet.cashoutMultiplier = exactMultiplier ?? bet.round.currentMultiplier;
      bet.payout = Number(bet.amount) * Number(bet.cashoutMultiplier || 1);

      // Save cashout locally
      await this.betRepo.save(bet);

      bet.round.totalPayouts =
        Number(bet.round.totalPayouts || 0) + Number(bet.payout || 0);
      await this.roundRepo.save(bet.round);

      await this.leaderboardService.updateFromBet({
        address: bet.address,
        amount: Number(bet.amount),
        cashedOut: true,
        payout: Number(bet.payout),
        cashoutMultiplier: Number(bet.cashoutMultiplier),
      });

      return bet;
    }, 10); // Increase max retries for this critical operation

    // Relay cashout to chain (non-blocking, with error handling)
    let chainError: Error | null = null;
    try {
      if (!this.chainServices.has(Number(chainId))) {
        const { ChainService } = await import('./chain.service.js');
        this.chainServices.set(Number(chainId), new ChainService(Number(chainId)));
      }

      const chainService = this.chainServices.get(Number(chainId));
      if (chainService) {
        await chainService.cashOutFor(result.round.roundId, result.address, Number(result.payout), Number(result.cashoutMultiplier));
        logger.info('Cashout relayed to chain successfully', { betId, chainId: Number(chainId) });
      }
    } catch (err) {
      chainError = err as Error;
      logger.error('Failed to relay cashout to chain', {
        error: chainError.message,
        chainId: Number(chainId),
        betId,
        note: 'Cashout will still be recorded locally but may need manual on-chain settlement'
      });
    }

    // Update in-memory active bets if it exists there
    const activeBetIndex = this.activeAutoCashouts.findIndex(p => p.id === result.id);
    if (activeBetIndex !== -1) {
      this.activeAutoCashouts[activeBetIndex] = result;
    }

    // Emit cashout notification to all connected clients
    this.io.emit('CASHOUT_NOTIFICATION', {
      address: result.address,
      multiplier: result.cashoutMultiplier,
      payout: result.payout,
      timestamp: Date.now(),
    });

    this.broadcastGameState();

    // If there was a chain error, log it but don't fail the cashout
    if (chainError) {
      logger.warn('Cashout completed locally but chain relay failed', {
        betId,
        chainId,
        error: chainError.message,
      });
    }

    return result;
  }

  async broadcastGameState() {
    try {
      if (this.currentRound) {
        // 1. Get the latest players (bets) from the DB to ensure we show all bets/cashouts
        const players = await this.betRepo.find({
          where: { round: { id: this.currentRound.id } },
        });

        // 2. Construct the payload using in-memory state for high-frequency data (phase, multiplier, etc.)
        //    and DB data for the players list.
        const roundData = {
          ...this.currentRound, // Use in-memory state (authoritative for phase/multiplier)
          players: players || [], // Use DB state (authoritative for bets)
        };

        this.io.emit('GAME_STATE_UPDATE', sanitizeRound(roundData, ENCRYPTION_SECRET));
      }
    } catch (error) {
      logger.error('Failed to broadcast game state', { error });
      // Fallback: broadcast current round without updated players if query fails
      this.io.emit('GAME_STATE_UPDATE', sanitizeRound(this.currentRound, ENCRYPTION_SECRET));
    }
  }
}
