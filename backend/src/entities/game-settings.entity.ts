import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('game_settings')
export class GameSettings {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('decimal', { precision: 10, scale: 2, default: 0.1 })
    minBetAmount!: number;

    @Column('decimal', { precision: 10, scale: 2, default: 10 })
    maxBetAmount!: number;

    @Column('int', { default: 30000 })
    bettingDurationMs!: number;

    @Column('int', { default: 20000 })
    flyingDurationMs!: number;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
