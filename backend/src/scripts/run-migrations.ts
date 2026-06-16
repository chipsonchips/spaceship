import dns from 'node:dns';
import { AppDataSource } from '../config/database.js';
import { logger } from '../utils/logger.js';

// Force IPv4 to prevent ENETUNREACH errors on Render with Supabase pooler
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

async function runMigrations() {
  try {
    logger.info('Initializing database connection for migrations...');
    await AppDataSource.initialize();

    logger.info('Running pending migrations...');
    const migrations = await AppDataSource.runMigrations();

    if (migrations.length === 0) {
      logger.info('No pending migrations to run');
    } else {
      logger.info(`Successfully ran ${migrations.length} migration(s):`);
      migrations.forEach(migration => {
        logger.info(`  - ${migration.name}`);
      });
    }

    await AppDataSource.destroy();
    logger.info('Database connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    await AppDataSource.destroy().catch(() => { });
    process.exit(1);
  }
}

runMigrations();
