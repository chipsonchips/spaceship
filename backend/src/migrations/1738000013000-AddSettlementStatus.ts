import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSettlementStatus1738000013000 implements MigrationInterface {
    name = 'AddSettlementStatus1738000013000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the enum type if it does not exist
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'player_bets_settlementstatus_enum') THEN
                    CREATE TYPE "player_bets_settlementstatus_enum" AS ENUM('PENDING', 'SETTLED', 'FAILED', 'PENDING_FUNDS');
                END IF;
            END$$;
        `);

        // Check and add settlementStatus column
        const table = await queryRunner.getTable('player_bets');
        if (table && !table.findColumnByName('settlementStatus')) {
            await queryRunner.query(`
                ALTER TABLE "player_bets"
                ADD COLUMN "settlementStatus" "player_bets_settlementstatus_enum" DEFAULT 'PENDING'
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "player_bets"
            DROP COLUMN IF EXISTS "settlementStatus"
        `);
        await queryRunner.query(`
            DROP TYPE IF EXISTS "player_bets_settlementstatus_enum"
        `);
    }
}
