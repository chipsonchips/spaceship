import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Round } from './round.entity.js';

@Entity({ name: 'player_bets' })
export class PlayerBet {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 64 })
  address!: string;

  @Column({ type: 'numeric', precision: 18, scale: 8 })
  amount!: number;

  @Column({ type: 'boolean', default: false })
  cashedOut!: boolean;

  @Column({ type: 'numeric', precision: 10, scale: 4, nullable: true })
  cashoutMultiplier!: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 8, nullable: true })
  payout!: number | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  txHash!: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 4, nullable: true })
  autoCashoutMultiplier!: number | null;

  @Column({ type: 'integer', nullable: true })
  chainId!: number | null;

  @Column({ type: 'bigint' })
  timestamp!: number;

  @ManyToOne(() => Round, (round) => round.players, { onDelete: 'CASCADE' })
  round!: Round;

  @CreateDateColumn()
  createdAt!: Date;
}
