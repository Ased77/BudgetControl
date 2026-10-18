import fs from 'fs';
import type { PoolConfig } from 'pg';

/* =========================================================================
   Database configuration

   One place decides how the app talks to PostgreSQL, driven entirely by the
   environment (12-factor). Nothing is compiled into the bundle, so the same
   image runs on a laptop, in CI and in production, and credentials never live
   in a Dockerfile or a compose file.

   Supported variables (see .env.example):

     DATABASE_URL          full libpq URL — wins over the discrete PG* vars
     PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE
     PGPASSWORD_FILE       read the password from a file (Docker/Compose secrets)
     PGSSLMODE             disable | require | verify-full | no-verify
     PG_POOL_MAX           connection pool ceiling            (default 10)
     PG_CONNECTION_TIMEOUT_MS  fail fast when the DB is down  (default 5000)
     PG_IDLE_TIMEOUT_MS    close idle clients                 (default 30000)
     PG_STATEMENT_TIMEOUT_MS   server-side query ceiling      (default 60000)
   ========================================================================= */

export interface DatabaseSettings {
  /** Exactly what `new Pool()` receives. */
  pool: PoolConfig;
  /** Target with the password stripped — safe to print in logs. */
  target: string;
  sslMode: string;
}

type Env = Record<string, string | undefined>;

const DEFAULT_PORT = 5432;
const DEFAULT_HOST = 'localhost';
const DEFAULT_USER = 'postgres';
const DEFAULT_DATABASE = 'postgres';

function positiveInt(env: Env, key: string, fallback: number): number {
  const raw = env[key];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`[config] ${key} must be a positive integer (received "${raw}")`);
  }
  return value;
}

/**
 * A password may legitimately be empty (trust / peer authentication, or a
 * `.pgpass` file). That is only allowed when the operator *explicitly* set the
 * variable, so a missing PGPASSWORD fails loudly instead of surfacing as a
 * confusing "password authentication failed" at the first query.
 */
function readPassword(env: Env): string {
  if (env.PGPASSWORD_FILE) {
    const file = env.PGPASSWORD_FILE;
    if (!fs.existsSync(file)) {
      throw new Error(`[config] PGPASSWORD_FILE points to a missing file: ${file}`);
    }
    // Docker secrets keep the value verbatim; drop a single trailing newline.
    return fs.readFileSync(file, 'utf8').replace(/\r?\n$/, '');
  }
  if (env.PGPASSWORD !== undefined) return env.PGPASSWORD;
  throw new Error(
    '[config] No PostgreSQL password configured. Set PGPASSWORD (or PGPASSWORD_FILE / DATABASE_URL). ' +
      'An intentionally empty password must be set explicitly as PGPASSWORD="". See .env.example.',
  );
}

function readSsl(env: Env): { ssl: PoolConfig['ssl']; sslMode: string } {
  const mode = (env.PGSSLMODE || 'disable').toLowerCase();
  switch (mode) {
    case 'disable':
      return { ssl: undefined, sslMode: mode };
    case 'no-verify':
      // Encrypted transport, no certificate check: managed DBs with a private CA.
      return { ssl: { rejectUnauthorized: false }, sslMode: mode };
    case 'require':
    case 'verify-ca':
    case 'verify-full':
      // Certificate verified against the system trust store (or PGSSLROOTCERT
      // via NODE_EXTRA_CA_CERTS when a private CA is used).
      return { ssl: { rejectUnauthorized: true }, sslMode: mode };
    default:
      throw new Error(
        `[config] Unsupported PGSSLMODE "${mode}". Use one of: disable, require, verify-full, no-verify.`,
      );
  }
}

export function loadDatabaseConfig(env: Env = process.env): DatabaseSettings {
  const { ssl, sslMode } = readSsl(env);

  const poolTuning = {
    max: positiveInt(env, 'PG_POOL_MAX', 10),
    idleTimeoutMillis: positiveInt(env, 'PG_IDLE_TIMEOUT_MS', 30_000),
    connectionTimeoutMillis: positiveInt(env, 'PG_CONNECTION_TIMEOUT_MS', 5_000),
    statement_timeout: positiveInt(env, 'PG_STATEMENT_TIMEOUT_MS', 60_000),
    application_name: 'csr-budgeting',
    ssl,
  };

  // A URL carries host/port/user/password/database *and* its own SSL rules, so
  // when it is present we do not mix in discrete fields — that avoids the
  // classic "PGHOST default silently overrode DATABASE_URL" bug.
  if (env.DATABASE_URL) {
    return {
      pool: { connectionString: env.DATABASE_URL, ...poolTuning },
      target: redactUrl(env.DATABASE_URL),
      sslMode,
    };
  }

  const password = readPassword(env);
  const host = env.PGHOST || DEFAULT_HOST;
  const port = positiveInt(env, 'PGPORT', DEFAULT_PORT);
  const user = env.PGUSER || DEFAULT_USER;
  const database = env.PGDATABASE || DEFAULT_DATABASE;

  return {
    pool: { host, port, user, password, database, ...poolTuning },
    target: `postgres://${user}@${host}:${port}/${database}`,
    sslMode,
  };
}

/** Strip the password from a connection URL before it reaches a log line. */
function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return '<unparsable DATABASE_URL>';
  }
}
