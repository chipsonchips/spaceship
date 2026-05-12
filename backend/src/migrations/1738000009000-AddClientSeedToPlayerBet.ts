import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClientSeedToPlayerBet1738000009000 implements MigrationInterface {
  name = 'AddClientSeedToPlayerBet1738000009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add clientSeed column to player_bets table if it doesn't exist
    const table = await queryRunner.getTable('player_bets');

    if (table && !table.findColumnByName('clientSeed')) {
      await queryRunner.query(`
        ALTER TABLE "player_bets"
        ADD COLUMN "clientSeed" TEXT
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the column
    await queryRunner.query(`
      ALTER TABLE "player_bets"
      DROP COLUMN IF EXISTS "clientSeed"
    `);
  }
}
