import { AppDataSource } from '../config/database.js';
import { Round } from '../entities/round.entity.js';
import { PlayerBet } from '../entities/player-bet.entity.js';
import { Repository } from 'typeorm';

export class RoundService {
  private get roundRepo(): Repository<Round> {
    if (!AppDataSource.isInitialized) throw new Error('Database not initialized');
    return AppDataSource.getRepository(Round);
  }

  private get betRepo(): Repository<PlayerBet> {
    if (!AppDataSource.isInitialized) throw new Error('Database not initialized');
    return AppDataSource.getRepository(PlayerBet);
  }

  async createRound(round: Partial<Round>) {
    const entity = this.roundRepo.create(round);
    return this.roundRepo.save(entity);
  }

  async getCurrentRound() {
    return this.roundRepo.findOne({
      where: {},
      relations: ['players'],
      order: { roundId: 'DESC' },
    });
  }

  async addBet(roundId: number, bet: Partial<PlayerBet>) {
    const round = await this.roundRepo.findOne({
      where: { roundId },
      relations: ['players']
    });

    if (!round) throw new Error('Round not found');

    // Check if player already has a bet in this round
    const existingBet = (round.players as unknown as PlayerBet[]).find(p => p.address.toLowerCase() === bet.address?.toLowerCase());

    if (existingBet) {
      // Update existing bet
      existingBet.amount = bet.amount || existingBet.amount;
      existingBet.txHash = bet.txHash || existingBet.txHash;
      existingBet.timestamp = bet.timestamp || existingBet.timestamp;
      return this.betRepo.save(existingBet);
    }

    // Create new bet
    const betEntity = this.betRepo.create({ ...bet, round });
    return this.betRepo.save(betEntity);
  }

  async cashOut(betId: number, multiplier: number) {
    const bet = await this.betRepo.findOne({
      where: { id: betId },
      relations: ['round'],
    });
    if (!bet) throw new Error('Bet not found');
    bet.cashedOut = true;
    bet.cashoutMultiplier = multiplier;
    bet.payout = Number(bet.amount) * multiplier;
    await this.betRepo.save(bet);
    return bet;
  }
}
