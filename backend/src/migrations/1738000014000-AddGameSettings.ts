import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddGameSettings1738000014000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'game_settings',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'minBetAmount',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        default: 0.1,
                    },
                    {
                        name: 'maxBetAmount',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        default: 10,
                    },
                    {
                        name: 'bettingDurationMs',
                        type: 'int',
                        default: 30000,
                    },
                    {
                        name: 'flyingDurationMs',
                        type: 'int',
                        default: 20000,
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'now()',
                    },
                    {
                        name: 'updatedAt',
                        type: 'timestamp',
                        default: 'now()',
                    },
                ],
            }),
            true
        );

        // Insert default settings
        await queryRunner.query(`
            INSERT INTO game_settings (id, "minBetAmount", "maxBetAmount", "bettingDurationMs", "flyingDurationMs")
            VALUES (uuid_generate_v4(), 0.1, 10, 30000, 20000)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('game_settings');
    }
}
