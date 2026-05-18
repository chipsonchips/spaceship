import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('game_settings')
export class GameSettings {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('decimal', { precision: 10, scale: 2, default: 0.1 })
    minBetAmount!: number;

    @Column('decimal', { precision: 10, scale: 2, default: 10 })
    maxBetAmount!: number;

    @Column('int', { default: 10000 })
    bettingDurationMs!: number;

    @Column('int', { default: 20000 })
    flyingDurationMs!: number;

    @Column('int', { default: 5000 })
    roundRestartDelayMs!: number;

    @Column('decimal', { precision: 5, scale: 4, default: 0.03 })
    houseEdge!: number;

    @Column('decimal', { precision: 6, scale: 2, default: 1.01 })
    minCrashMultiplier!: number;

    @Column('decimal', { precision: 6, scale: 2, default: 100.00 })
    maxCrashMultiplier!: number;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
