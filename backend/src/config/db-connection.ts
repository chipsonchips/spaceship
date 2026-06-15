import dns from 'node:dns';

export interface DbConnectionParams {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: false | { rejectUnauthorized: boolean };
}

/** Force IPv4 — Railway and similar hosts have no outbound IPv6 to Supabase. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ipv4Lookup(hostname: string, options: any, callback?: any): void {
  if (typeof options === 'function') {
    dns.lookup(hostname, { family: 4 }, options);
    return;
  }
  if (!callback) return;
  if (typeof options === 'number') {
    dns.lookup(hostname, { family: 4 }, callback);
    return;
  }
  dns.lookup(hostname, { ...(options as dns.LookupOptions), family: 4 }, callback);
}

function hostNeedsSsl(host: string): boolean {
  if (process.env.DB_SSL === 'true') return true;
  return host.includes('supabase.com') || host.includes('neon.tech');
}

function parseDatabaseUrl(url: string): DbConnectionParams {
  const parsed = new URL(url);
  const database = parsed.pathname.replace(/^\//, '') || 'postgres';
  return {
    host: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port, 10) : 5432,
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
    ssl: hostNeedsSsl(parsed.hostname)
      ? { rejectUnauthorized: false }
      : false,
  };
}

export function resolveDbConnection(): DbConnectionParams {
  if (process.env.DATABASE_URL) {
    return parseDatabaseUrl(process.env.DATABASE_URL);
  }

  const host = process.env.DB_HOST || '127.0.0.1';
  return {
    host,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'spaceship_dev',
    ssl: hostNeedsSsl(host) ? { rejectUnauthorized: false } : false,
  };
}
