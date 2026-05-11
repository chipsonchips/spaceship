import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'game_history' })
export class GameHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', unique: true })
  roundId!: number;

  @Column({ type: 'numeric', precision: 10, scale: 4 })
  crashMultiplier!: number;

  @Column({ type: 'bigint' })
  timestamp!: number;

  @Column({ type: 'numeric', precision: 18, scale: 8 })
  totalBets!: number;

  @Column({ type: 'numeric', precision: 18, scale: 8 })
  totalPayouts!: number;

  @Column({ type: 'int' })
  winnersCount!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
