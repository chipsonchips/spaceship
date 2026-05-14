import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMaxBetAmount1738000010000 implements MigrationInterface {
    name = 'AddMaxBetAmount1738000010000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add maxBetAmount column to users table if it doesn't exist
        const table = await queryRunner.getTable('users');

        if (table && !table.findColumnByName('maxBetAmount')) {
            await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN "maxBetAmount" NUMERIC(10, 4) DEFAULT 0.5
      `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the column
        await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "maxBetAmount"
    `);
    }
}
