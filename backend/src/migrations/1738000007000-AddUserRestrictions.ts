import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserRestrictions1738000007000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'isBlocked',
                type: 'boolean',
                default: false,
            })
        );

        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'blockedAt',
                type: 'timestamp',
                isNullable: true,
            })
        );

        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'blockReason',
                type: 'varchar',
                length: '255',
                isNullable: true,
            })
        );

        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'isSuspended',
                type: 'boolean',
                default: false,
            })
        );

        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'suspendedAt',
                type: 'timestamp',
                isNullable: true,
            })
        );

        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'suspensionExpiresAt',
                type: 'timestamp',
                isNullable: true,
            })
        );

        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'suspensionReason',
                type: 'varchar',
                length: '255',
                isNullable: true,
            })
        );

        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'dailyBetLimit',
                type: 'numeric',
                precision: 10,
                scale: 4,
                isNullable: true,
            })
        );

        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'weeklyBetLimit',
                type: 'numeric',
                precision: 10,
                scale: 4,
                isNullable: true,
            })
        );

        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'monthlyBetLimit',
                type: 'numeric',
                precision: 10,
                scale: 4,
                isNullable: true,
            })
        );

        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'dailyBetAmount',
                type: 'numeric',
                precision: 10,
                scale: 4,
                default: 0,
            })
        );

        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'weeklyBetAmount',
                type: 'numeric',
                precision: 10,
                scale: 4,
                default: 0,
            })
        );

        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'monthlyBetAmount',
                type: 'numeric',
                precision: 10,
                scale: 4,
                default: 0,
            })
        );

        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'dailyBetResetAt',
                type: 'timestamp',
                isNullable: true,
            })
        );

        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'weeklyBetResetAt',
                type: 'timestamp',
                isNullable: true,
            })
        );

        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'monthlyBetResetAt',
                type: 'timestamp',
                isNullable: true,
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('users', 'monthlyBetResetAt');
        await queryRunner.dropColumn('users', 'weeklyBetResetAt');
        await queryRunner.dropColumn('users', 'dailyBetResetAt');
        await queryRunner.dropColumn('users', 'monthlyBetAmount');
        await queryRunner.dropColumn('users', 'weeklyBetAmount');
        await queryRunner.dropColumn('users', 'dailyBetAmount');
        await queryRunner.dropColumn('users', 'monthlyBetLimit');
        await queryRunner.dropColumn('users', 'weeklyBetLimit');
        await queryRunner.dropColumn('users', 'dailyBetLimit');
        await queryRunner.dropColumn('users', 'suspensionReason');
        await queryRunner.dropColumn('users', 'suspensionExpiresAt');
        await queryRunner.dropColumn('users', 'suspendedAt');
        await queryRunner.dropColumn('users', 'isSuspended');
        await queryRunner.dropColumn('users', 'blockReason');
        await queryRunner.dropColumn('users', 'blockedAt');
        await queryRunner.dropColumn('users', 'isBlocked');
    }
}
