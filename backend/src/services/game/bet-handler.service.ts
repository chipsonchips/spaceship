import crypto from 'crypto';
import type { Round } from '../../entities/round.entity.js';
import { BetStatus, SettlementStatus, type PlayerBet } from '../../entities/player-bet.entity.js';
import type { ChainService } from '../chain.service.js';
import { securityMonitor } from '../security-monitor.service.js';
import { executeWithRetry } from './retry.util.js';
import { RoundRepository } from './round.repository.js';
import { GameStateStore } from './game-state.store.js';
import { GameBroadcaster } from './game-broadcaster.service.js';
import type { GameEngineServices } from './types.js';
import { getCachedGameSettings } from './settings.cache.js';
import { GAME_CONSTANTS } from '../../constants.js';
import { logger } from '../../utils/logger.js';

export class BetHandler {
  private readonly chainServices = new Map<number, ChainService>();

  constructor(
    private readonly state: GameStateStore,
    private readonly rounds: RoundRepository,
    private readonly broadcaster: GameBroadcaster,
    private readonly services: GameEngineServices,
  ) { }

  private async getChainService(chainId: number): Promise<ChainService> {
    if (!this.chainServices.has(chainId)) {
      const { ChainService } = await import('../chain.service.js');
      this.chainServices.set(chainId, new ChainService(chainId));
    }
    return this.chainServices.get(chainId)!;
  }

  private async checkHouseBalance(
    chainId: number,
    requiredAmount: number,
  ): Promise<{ sufficient: boolean; balance: number }> {
    try {
      const chainService = await this.getChainService(chainId);
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

  async placeBet(
    address: string,
    amount: number,
    chainId: number,
    useFreeBet = false,
    autoCashoutMultiplier?: number,
    clientSeed?: string,
  ): Promise<PlayerBet> {
    if (!chainId) {
      throw new Error('chainId is required. Pass the connected chain from the frontend.');
    }

    const round = this.state.currentRound;
    if (!round || round.phase !== 'BETTING') {
      throw new Error('Betting closed');
    }

    // Betting locks BETTING_LOCK_MS before takeoff, even though the phase is
    // still BETTING, so players cannot place bets at the last instant.
    if (
      round.flyStartTime != null &&
      Date.now() >= Number(round.flyStartTime) - GAME_CONSTANTS.BETTING_LOCK_MS
    ) {
      throw new Error('Betting closed');
    }

    const settings = await getCachedGameSettings();

    if (amount < settings.minBetAmount) {
      throw new Error(`Bet amount must be at least ${settings.minBetAmount} USDC`);
    }
    if (amount > settings.maxBetAmount) {
      throw new Error(`Bet amount exceeds global maximum of ${settings.maxBetAmount} USDC`);
    }
    if (
      autoCashoutMultiplier &&
      (autoCashoutMultiplier < 1.01 ||
        autoCashoutMultiplier > settings.maxCrashMultiplier)
    ) {
      throw new Error(
        `Auto-cashout multiplier must be between 1.01 and ${settings.maxCrashMultiplier}`,
      );
    }

    if (!clientSeed) {
      clientSeed = crypto.randomBytes(16).toString('hex');
    }

    if (securityMonitor.isSuspicious(address)) {
      throw new Error('Your account is under review. Please contact support.');
    }

    const user = await this.services.users.getUserByAddress(address);
    if (!user) throw new Error('User not found');

    const userMaxBet = user.maxBetAmount ?? settings.maxBetAmount;
    if (amount > userMaxBet) {
      throw new Error(`Bet amount exceeds your maximum of ${userMaxBet} USDC`);
    }

    let chainService: ChainService | null = null;
    if (!useFreeBet) {
      chainService = await this.getChainService(chainId);
      const validation = await chainService.validatePlayerFunds(address, amount);
      if (!validation.ok) throw new Error(validation.reason);
    } else {
      const freeBetsRemaining = await this.services.freeBets.getFreeBetsRemaining(user.id);
      if (freeBetsRemaining <= 0) throw new Error('No free bets remaining');

      const maxFreeBetAmount = await this.services.freeBets.getFreeBetMaxAmount(user.id);
      if (amount > maxFreeBetAmount) {
        throw new Error(`Free bet amount exceeds maximum of ${maxFreeBetAmount} USDC`);
      }

      await this.services.freeBets.useFreeBet(user.id, amount, round.roundId);
    }

    const bet = await executeWithRetry(
      async () => {
        const newBet = this.rounds.createBet({
          address: address.toLowerCase(),
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
          round,
        });

        const saved = await this.rounds.saveBet(newBet);
        await this.rounds.incrementTotalBets(round.id, amount);
        round.totalBets = Number(round.totalBets || 0) + Number(amount);

        await this.services.leaderboard.updateFromBet({
          address: address.toLowerCase(),
          amount,
          cashedOut: false,
        });

        return saved;
      },
      { maxRetries: 10, label: 'place-bet' },
    );

    this.state.upsertPlayer(bet);
    void this.broadcaster.emitStateWithFreshPlayers();

    if (!useFreeBet && chainService) {
      this.relayBetToChain(bet, chainService, chainId, address, round);
    }

    return bet;
  }

  async cashOutById(
    betId: number,
    chainId: number,
    isAutoCashout = false,
    exactMultiplier?: number,
  ): Promise<PlayerBet> {
    if (!chainId) {
      throw new Error('chainId is required. Pass the connected chain from the frontend.');
    }

    const bet = await this.rounds.findBetById(betId);
    if (!bet) throw new Error('Bet not found');
    if (bet.cashedOut) throw new Error('Already cashed out');

    if (!isAutoCashout && bet.round.phase !== 'FLYING') {
      throw new Error('Cannot cash out: round is not in flying phase');
    }

    const liveRound = this.state.currentRound;
    const cashoutMultiplier =
      exactMultiplier ??
      (liveRound?.phase === 'FLYING' ? liveRound.currentMultiplier : bet.round.currentMultiplier);

    const result = await executeWithRetry(
      async () => {
        bet.cashedOut = true;
        bet.cashoutMultiplier = cashoutMultiplier;
        bet.payout = Number(bet.amount) * Number(bet.cashoutMultiplier || 1);
        await this.rounds.saveBet(bet);
        await this.rounds.incrementTotalPayouts(bet.round.id, Number(bet.payout));

        if (liveRound && liveRound.id === bet.round.id) {
          liveRound.totalPayouts =
            Number(liveRound.totalPayouts || 0) + Number(bet.payout || 0);
        }

        await this.services.leaderboard.updateFromBet({
          address: bet.address,
          amount: Number(bet.amount),
          cashedOut: true,
          payout: Number(bet.payout),
          cashoutMultiplier: Number(bet.cashoutMultiplier),
        });

        return bet;
      },
      { maxRetries: 10, label: 'cash-out' },
    );

    this.state.upsertPlayer(result);
    this.state.updateActiveAutoCashout(result);

    if (result.status === BetStatus.VALIDATED) {
      await this.settleCashoutOnChain(result, chainId, betId);
    } else {
      logger.info('Cashout recorded but deferred until bet is validated', {
        betId: result.id,
      });
    }

    this.broadcaster.emitCashoutNotification({
      address: result.address,
      multiplier: result.cashoutMultiplier,
      payout: result.payout,
      timestamp: Date.now(),
    });

    void this.broadcaster.emitStateWithFreshPlayers();
    return result;
  }

  private async settleCashoutOnChain(
    result: PlayerBet,
    chainId: number,
    betId: number,
  ): Promise<void> {
    try {
      const balanceCheck = await this.checkHouseBalance(chainId, Number(result.payout));

      if (!balanceCheck.sufficient) {
        result.settlementStatus = SettlementStatus.PENDING_FUNDS;
        await this.rounds.saveBet(result);

        this.broadcaster.emitCashoutPendingSettlement({
          address: result.address,
          multiplier: result.cashoutMultiplier,
          payout: result.payout,
          timestamp: Date.now(),
          reason: 'insufficient_house_balance',
        });
        return;
      }

      const chainService = await this.getChainService(chainId);
      await chainService.cashOutFor(
        result.round.roundId,
        result.address,
        Number(result.payout),
        Number(result.cashoutMultiplier),
      );

      result.settlementStatus = SettlementStatus.SETTLED;
      await this.rounds.saveBet(result);
    } catch (err) {
      result.settlementStatus = SettlementStatus.FAILED;
      await this.rounds.saveBet(result);

      this.broadcaster.emitCashoutSettlementFailed({
        address: result.address,
        betId: result.id,
        error: (err as Error).message,
        timestamp: Date.now(),
      });

      logger.error('Failed to relay cashout to chain', {
        betId,
        chainId,
        error: (err as Error).message,
      });
    }
  }

  private relayBetToChain(
    bet: PlayerBet,
    chainService: ChainService,
    chainId: number,
    address: string,
    round: Round,
  ): void {
    void (async () => {
      try {
        const txHash = await chainService.placeBetFor(round.roundId, address, Number(bet.amount));

        await executeWithRetry(
          async () => {
            const updatedBet = await this.rounds.findBetById(bet.id!);
            if (!updatedBet) return;

            updatedBet.status = BetStatus.VALIDATED;
            updatedBet.txHash = txHash;
            await this.rounds.saveBet(updatedBet);

            if (updatedBet.cashedOut && updatedBet.payout) {
              await this.settleCashoutOnChain(updatedBet, chainId, bet.id!);
            }

            this.state.upsertPlayer(updatedBet);
          },
          { label: 'validate-bet' },
        );

        void this.broadcaster.emitStateWithFreshPlayers();
      } catch (err) {
        logger.error('Background bet relay failed', {
          betId: bet.id,
          address,
          error: (err as Error).message,
        });

        await executeWithRetry(async () => {
          const failedBet = await this.rounds.findBetById(bet.id!);
          if (!failedBet) return;

          failedBet.status = BetStatus.FAILED;
          failedBet.validationError = (err as Error).message;
          await this.rounds.saveBet(failedBet);
          await this.rounds.decrementTotalBets(failedBet.round.id, Number(failedBet.amount));

          if (this.state.currentRound?.id === failedBet.round.id) {
            this.state.currentRound.totalBets = Math.max(
              0,
              Number(this.state.currentRound.totalBets) - Number(failedBet.amount),
            );
          }

          this.state.upsertPlayer(failedBet);
        });

        void this.broadcaster.emitStateWithFreshPlayers();
      }
    })();
  }
}
