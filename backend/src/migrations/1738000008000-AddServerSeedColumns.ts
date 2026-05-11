import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServerSeedColumns1738000008000 implements MigrationInterface {
    name = 'AddServerSeedColumns1738000008000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add missing columns to rounds table
        await queryRunner.query(`
      ALTER TABLE "rounds"
      ADD COLUMN "serverSeedIV" TEXT,
      ADD COLUMN "serverSeedAuthTag" TEXT,
      ADD COLUMN "combinedClientSeedHash" TEXT,
      ADD COLUMN "finalSeed" TEXT
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the columns
        await queryRunner.query(`
      ALTER TABLE "rounds"
      DROP COLUMN IF EXISTS "serverSeedIV",
      DROP COLUMN IF EXISTS "serverSeedAuthTag",
      DROP COLUMN IF EXISTS "combinedClientSeedHash",
      DROP COLUMN IF EXISTS "finalSeed"
    `);
    }
}
