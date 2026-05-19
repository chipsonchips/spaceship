import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isCompiled = path.extname(__filename) === '.js';
const entitiesPath = isCompiled
  ? path.join(__dirname, '..', 'entities', '*.js')
  : path.join(__dirname, '..', 'entities', '*.ts');

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'aviator_dev',
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
  entities: [entitiesPath],
  migrations: [path.join(__dirname, '..', 'migrations', '*.{ts,js}')],
  subscribers: [path.join(__dirname, '..', 'subscribers', '**/*.{ts,js}')],
  ssl: process.env.DB_HOST?.includes('neon.tech') ? {
    rejectUnauthorized: false,
  } : false,
  extra: {
    max: Number(process.env.DB_POOL_MAX || 15),
    min: Number(process.env.DB_POOL_MIN || 2),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 15_000),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30_000),
    // Statement timeout for individual queries (ms). Keep moderate for serverless Postgres.
    statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS || 15_000),
  },
});