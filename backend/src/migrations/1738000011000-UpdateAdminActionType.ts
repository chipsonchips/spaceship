import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateAdminActionType1738000011000 implements MigrationInterface {
  name = 'UpdateAdminActionType1738000011000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new values to the enum if they don't exist
    // PostgreSQL allows adding values to enum types
    
    // Check if the enum type exists and if the value is missing
    const hasSeedAccessed = await queryRunner.query(`
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'admin_logs_actiontype_enum' AND e.enumlabel = 'seed_accessed'
    `);

    if (!hasSeedAccessed || hasSeedAccessed.length === 0) {
      // Check if type exists first
      const typeExists = await queryRunner.query(`SELECT 1 FROM pg_type WHERE typname = 'admin_logs_actiontype_enum'`);
      if (typeExists && typeExists.length > 0) {
        // commit current transaction because ALTER TYPE ADD VALUE cannot run inside transaction block
        await queryRunner.query(`COMMIT`);
        await queryRunner.query(`ALTER TYPE "admin_logs_actiontype_enum" ADD VALUE 'seed_accessed'`);
        await queryRunner.query(`BEGIN`);
      }
    }

    const hasSuspiciousActivity = await queryRunner.query(`
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'admin_logs_actiontype_enum' AND e.enumlabel = 'suspicious_activity'
    `);

    if (!hasSuspiciousActivity || hasSuspiciousActivity.length === 0) {
      const typeExists = await queryRunner.query(`SELECT 1 FROM pg_type WHERE typname = 'admin_logs_actiontype_enum'`);
      if (typeExists && typeExists.length > 0) {
        await queryRunner.query(`COMMIT`);
        await queryRunner.query(`ALTER TYPE "admin_logs_actiontype_enum" ADD VALUE 'suspicious_activity'`);
        await queryRunner.query(`BEGIN`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL does not support removing values from an enum type easily.
    // We would have to recreate the type, which is complex and usually unnecessary for down migrations.
  }
}
