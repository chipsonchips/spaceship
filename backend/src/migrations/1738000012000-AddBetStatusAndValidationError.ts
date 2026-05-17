import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBetStatusAndValidationError1738000012000 implements MigrationInterface {
    name = 'AddBetStatusAndValidationError1738000012000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the enum type if it does not exist
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'player_bets_status_enum') THEN
                    CREATE TYPE "player_bets_status_enum" AS ENUM('PENDING', 'VALIDATED', 'FAILED');
                END IF;
            END$$;
        `);

        // Check and add status column
        const table = await queryRunner.getTable('player_bets');
        if (table && !table.findColumnByName('status')) {
            await queryRunner.query(`
                ALTER TABLE "player_bets"
                ADD COLUMN "status" "player_bets_status_enum" NOT NULL DEFAULT 'PENDING'
            `);
        }

        // Check and add validationError column
        if (table && !table.findColumnByName('validationError')) {
            await queryRunner.query(`
                ALTER TABLE "player_bets"
                ADD COLUMN "validationError" text DEFAULT null
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "player_bets"
            DROP COLUMN IF EXISTS "status",
            DROP COLUMN IF EXISTS "validationError"
        `);
        await queryRunner.query(`
            DROP TYPE IF EXISTS "player_bets_status_enum"
        `);
    }
}
