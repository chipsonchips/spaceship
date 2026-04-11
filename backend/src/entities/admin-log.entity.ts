import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    Index,
} from 'typeorm';
import { User } from './user.entity.js';

export enum AdminActionType {
    HOUSE_WITHDRAW = 'house_withdraw',
    HOUSE_FUND = 'house_fund',
    CONTRACT_PAUSE = 'contract_pause',
    CONTRACT_UNPAUSE = 'contract_unpause',
    OPERATOR_SET = 'operator_set',
    ETH_WITHDRAW = 'eth_withdraw',
    USER_CREATED = 'user_created',
    USER_UPDATED = 'user_updated',
    USER_DELETED = 'user_deleted',
    USER_ROLE_CHANGED = 'user_role_changed',
    ADMIN_CREATED = 'admin_created',
    ADMIN_DELETED = 'admin_deleted',
    SETTINGS_CHANGED = 'settings_changed',
}

@Entity({ name: 'admin_logs' })
@Index(['adminId', 'createdAt'])
@Index(['actionType', 'createdAt'])
@Index(['chainId'])
export class AdminLog {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => User, (user) => user.adminLogs, { onDelete: 'SET NULL' })
    admin!: User | null;

    @Column({ type: 'uuid', nullable: true })
    adminId!: string | null;

    @Column({
        type: 'enum',
        enum: AdminActionType,
    })
    actionType!: AdminActionType;

    @Column({ type: 'varchar', length: 255, nullable: true })
    description!: string | null;

    @Column({ type: 'simple-json', default: '{}' })
    details!: Record<string, any>;

    @Column({ type: 'varchar', length: 45, nullable: true })
    ipAddress!: string | null;

    @Column({ type: 'int', nullable: true })
    chainId!: number | null;

    @Column({ type: 'boolean', default: true })
    success!: boolean;

    @Column({ type: 'text', nullable: true })
    errorMessage!: string | null;

    @CreateDateColumn()
    createdAt!: Date;
}
