import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    Index,
} from 'typeorm';
import { User } from './user.entity.js';
import { Round } from './round.entity.js';

@Entity({ name: 'free_bets' })
@Index(['userId', 'createdAt'])
@Index(['roundId'])
export class FreeBet {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user!: User;

    @Column({ type: 'uuid' })
    userId!: string;

    @ManyToOne(() => Round, { onDelete: 'CASCADE', nullable: true })
    round!: Round | null;

    @Column({ type: 'bigint', nullable: true })
    roundId!: number | null;

    @Column({ type: 'numeric', precision: 10, scale: 4 })
    amount!: number;

    @Column({ type: 'varchar', length: 128, nullable: true })
    txHash!: string | null;

    @Column({ type: 'boolean', default: false })
    used!: boolean;

    @CreateDateColumn()
    createdAt!: Date;
}
