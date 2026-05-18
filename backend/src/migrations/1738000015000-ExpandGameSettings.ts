import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ExpandGameSettings1738000015000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumns('game_settings', [
            new TableColumn({
                name: 'roundRestartDelayMs',
                type: 'int',
                default: 5000,
            }),
            new TableColumn({
                name: 'houseEdge',
                type: 'decimal',
                precision: 5,
                scale: 4,
                default: 0.03,
            }),
            new TableColumn({
                name: 'minCrashMultiplier',
                type: 'decimal',
                precision: 6,
                scale: 2,
                default: 1.01,
            }),
            new TableColumn({
                name: 'maxCrashMultiplier',
                type: 'decimal',
                precision: 6,
                scale: 2,
                default: 100.00,
            }),
        ]);

        // Ensure default settings values are populated for any existing rows
        await queryRunner.query(`
            UPDATE game_settings
            SET "roundRestartDelayMs" = 5000,
                "houseEdge" = 0.0300,
                "minCrashMultiplier" = 1.01,
                "maxCrashMultiplier" = 100.00
            WHERE "roundRestartDelayMs" IS NULL OR "roundRestartDelayMs" = 0
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumns('game_settings', [
            'roundRestartDelayMs',
            'houseEdge',
            'minCrashMultiplier',
            'maxCrashMultiplier',
        ]);
    }
}
