import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ipv4Lookup, resolveDbConnection } from './db-connection.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isCompiled = path.extname(__filename) === '.js';
const entitiesPath = isCompiled
  ? path.join(__dirname, '..', 'entities', '*.js')
  : path.join(__dirname, '..', 'entities', '*.ts');

const db = resolveDbConnection();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: db.host,
  port: db.port,
  username: db.username,
  password: db.password,
  database: db.database,
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
  entities: [entitiesPath],
  migrations: [path.join(__dirname, '..', 'migrations', '*.{ts,js}')],
  subscribers: [path.join(__dirname, '..', 'subscribers', '**/*.{ts,js}')],
  ssl: db.ssl,
  extra: {
    max: Number(process.env.DB_POOL_MAX || 15),
    min: Number(process.env.DB_POOL_MIN || 2),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 15_000),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30_000),
    statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS || 15_000),
    // Railway has no outbound IPv6; Supabase pooler often resolves to AAAA first.
    lookup: ipv4Lookup,
  },
});