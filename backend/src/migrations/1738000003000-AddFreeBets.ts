import { MigrationInterface, QueryRunner, TableColumn, Table } from 'typeorm';

export class AddFreeBets1738000003000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add free bets columns to users table
        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'freeBetsRemaining',
                type: 'int',
                default: 2,
            })
        );

        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'freeBetMaxAmount',
                type: 'numeric',
                precision: 10,
                scale: 4,
                default: 0.1,
            })
        );

        // Create free_bets table
        await queryRunner.createTable(
            new Table({
                name: 'free_bets',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'userId',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'roundId',
                        type: 'bigint',
                        isNullable: true,
                    },
                    {
                        name: 'amount',
                        type: 'numeric',
                        precision: 10,
                        scale: 4,
                        isNullable: false,
                    },
                    {
                        name: 'txHash',
                        type: 'varchar',
                        length: '128',
                        isNullable: true,
                    },
                    {
                        name: 'used',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ['userId'],
                        referencedTableName: 'users',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                    {
                        columnNames: ['roundId'],
                        referencedTableName: 'rounds',
                        referencedColumnNames: ['roundId'],
                        onDelete: 'CASCADE',
                    },
                ],
                indices: [
                    {
                        columnNames: ['userId', 'createdAt'],
                    },
                    {
                        columnNames: ['roundId'],
                    },
                ],
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('free_bets');
        await queryRunner.dropColumn('users', 'freeBetMaxAmount');
        await queryRunner.dropColumn('users', 'freeBetsRemaining');
    }
}
