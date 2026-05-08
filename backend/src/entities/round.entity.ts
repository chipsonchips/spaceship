import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type GamePhase = 'BETTING' | 'FLYING' | 'CRASHED';

@Entity({ name: 'rounds' })
export class Round {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', unique: true })
  roundId!: number;

  @Column({ type: 'varchar', length: 50 })
  phase!: GamePhase;

  @Column({ type: 'bigint' })
  startTime!: number;

  @Column({ type: 'bigint', nullable: true })
  flyStartTime!: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 4, nullable: true })
  crashMultiplier!: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 4, default: 1.0 })
  currentMultiplier!: number;

  @Column({ type: 'text', nullable: true })
  serverSeed!: string | null;

  @Column({ type: 'text', nullable: true })
  serverSeedIV!: string | null;

  @Column({ type: 'text', nullable: true })
  serverSeedAuthTag!: string | null;

  @Column({ type: 'text', nullable: true })
  serverSeedHash!: string | null;

  @Column({ type: 'text', nullable: true })
  combinedClientSeedHash!: string | null;

  @Column({ type: 'text', nullable: true })
  finalSeed!: string | null;

  @Column({ type: 'numeric', precision: 18, scale: 8, default: 0 })
  totalBets!: number;

  @Column({ type: 'numeric', precision: 18, scale: 8, default: 0 })
  totalPayouts!: number;

  @Column({ type: 'boolean', default: false })
  settled!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  planePosition!: { x: number; y: number } | null;

  @OneToMany('PlayerBet', 'round', { cascade: true })
  players!: unknown[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
