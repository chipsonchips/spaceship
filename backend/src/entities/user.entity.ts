import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    OneToMany,
} from 'typeorm';
import { AdminLog } from './admin-log.entity.js';

export enum UserRole {
    PLAYER = 'player',
    ADMIN = 'admin',
    MODERATOR = 'moderator',
}

export enum UserSource {
    WALLET = 'wallet',
    FARCASTER = 'farcaster',
}

@Entity({ name: 'users' })
@Index(['address'], { unique: true, where: '"address" IS NOT NULL' })
@Index(['farcasterId'], { unique: true, where: '"farcasterId" IS NOT NULL' })
@Index(['email'], { unique: true, where: '"email" IS NOT NULL' })
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    // Primary identifiers
    @Column({ type: 'varchar', length: 64, nullable: true })
    address!: string | null; // Wallet address (EVM)

    @Column({ type: 'int', nullable: true })
    farcasterId!: number | null; // Farcaster FID

    @Column({ type: 'varchar', length: 255, nullable: true })
    email!: string | null;

    // User profile
    @Column({ type: 'varchar', length: 255, nullable: true })
    username!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    displayName!: string | null;

    @Column({ type: 'text', nullable: true })
    bio!: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true })
    avatarUrl!: string | null;

    // Farcaster specific
    @Column({ type: 'varchar', length: 255, nullable: true })
    farcasterUsername!: string | null;

    // Role and permissions
    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.PLAYER,
    })
    role!: UserRole;

    @Column({ type: 'simple-array', default: '' })
    permissions!: string[]; // e.g., ['read:admin', 'write:house', 'write:contract']

    // Source tracking
    @Column({
        type: 'enum',
        enum: UserSource,
        default: UserSource.WALLET,
    })
    source!: UserSource;

    // Account status
    @Column({ type: 'boolean', default: true })
    isActive!: boolean;

    @Column({ type: 'boolean', default: false })
    isVerified!: boolean;

    @Column({ type: 'varchar', length: 255, nullable: true })
    verificationToken!: string | null;

    // Admin specific
    @Column({ type: 'varchar', length: 255, nullable: true })
    adminNotes!: string | null;

    @Column({ type: 'bigint', nullable: true })
    lastLoginAt!: number | null;

    @Column({ type: 'bigint', nullable: true })
    lastActivityAt!: number | null;

    // Free bets
    @Column({ type: 'int', default: 2 })
    freeBetsRemaining!: number;

    @Column({ type: 'numeric', precision: 10, scale: 4, default: 0.1 })
    freeBetMaxAmount!: number;

    @Column({ type: 'timestamp', nullable: true })
    freeBetsExpiresAt!: Date | null;

    // User restrictions
    @Column({ type: 'boolean', default: false })
    isBlocked!: boolean;

    @Column({ type: 'timestamp', nullable: true })
    blockedAt!: Date | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    blockReason!: string | null;

    @Column({ type: 'boolean', default: false })
    isSuspended!: boolean;

    @Column({ type: 'timestamp', nullable: true })
    suspendedAt!: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    suspensionExpiresAt!: Date | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    suspensionReason!: string | null;

    // Betting limits
    @Column({ type: 'numeric', precision: 10, scale: 4, nullable: true })
    dailyBetLimit!: number | null;

    @Column({ type: 'numeric', precision: 10, scale: 4, nullable: true })
    weeklyBetLimit!: number | null;

    @Column({ type: 'numeric', precision: 10, scale: 4, nullable: true })
    monthlyBetLimit!: number | null;

    @Column({ type: 'numeric', precision: 10, scale: 4, default: 0 })
    dailyBetAmount!: number;

    @Column({ type: 'numeric', precision: 10, scale: 4, default: 0 })
    weeklyBetAmount!: number;

    @Column({ type: 'numeric', precision: 10, scale: 4, default: 0 })
    monthlyBetAmount!: number;

    @Column({ type: 'timestamp', nullable: true })
    dailyBetResetAt!: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    weeklyBetResetAt!: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    monthlyBetResetAt!: Date | null;

    // Max bet amount (per-user override, null means use global default)
    @Column({ type: 'numeric', precision: 10, scale: 4, nullable: true })
    maxBetAmount!: number | null;

    // Preferences
    @Column({ type: 'simple-json', default: '{}' })
    preferences!: {
        emailNotifications?: boolean;
        theme?: 'light' | 'dark';
        language?: string;
    };

    // Timestamps
    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    // Relations
    @OneToMany(() => AdminLog, (log) => log.admin)
    adminLogs!: AdminLog[];
}
