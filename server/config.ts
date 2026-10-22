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
                           (POSTGRES_URL / POSTGRES_URL_NON_POOLING /
                           POSTGRES_PRISMA_URL are accepted as fallbacks so the
                           Vercel Postgres and Neon integrations work as-is)
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
      'An intentionally empty password must be set explicitly as PGPASSWORD="". See .env.example.' +
      configurationHints(env) +
      `\n  → Database variables this process received: ${formatAudit(describeDatabaseEnvironment(env))}`,
  );
}

/**
 * Every name this module knows how to interpret, in the order an operator
 * should think about them. Only names are ever reported — a value is what we
 * are trying to keep out of logs and error payloads.
 */
const KNOWN_DATABASE_VARIABLES = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_URL_NON_POOLING',
  'POSTGRES_PRISMA_URL',
  'PGHOST',
  'PGPORT',
  'PGUSER',
  'PGPASSWORD',
  'PGPASSWORD_FILE',
  'PGDATABASE',
  'PGSSLMODE',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
] as const;

export interface DatabaseEnvironmentAudit {
  /** Where the process thinks it runs — explains which platform hint applies. */
  platform: 'vercel' | 'other';
  vercelEnv: string | null;
  /** Recognized names that exist, with whether the value is empty. No values. */
  variables: { name: string; state: 'set' | 'empty' }[];
}

/**
 * What database configuration did this process actually receive? Names and
 * emptiness only — never a value, never a URL. A deployment that "added the
 * variable" but still fails can be diagnosed from this audit alone, which is
 * exactly the ambiguity a bare "no password configured" leaves behind.
 */
export function describeDatabaseEnvironment(env: Env = process.env): DatabaseEnvironmentAudit {
  const isVercel = env.VERCEL === '1' || env.VERCEL === 'true' || env.VERCEL_ENV !== undefined;
  return {
    platform: isVercel ? 'vercel' : 'other',
    vercelEnv: env.VERCEL_ENV ?? null,
    variables: KNOWN_DATABASE_VARIABLES.filter((name) => env[name] !== undefined).map((name) => ({
      name,
      state: env[name] === '' ? 'empty' : 'set',
    })),
  };
}

/** One-line rendering of the audit for an error message. */
function formatAudit(audit: DatabaseEnvironmentAudit): string {
  if (audit.variables.length === 0) {
    return `none found (${audit.platform}${audit.vercelEnv ? `, ${audit.vercelEnv}` : ''})`;
  }
  const names = audit.variables.map((v) => `${v.name}=${v.state}`).join(', ');
  return `${names} (${audit.platform}${audit.vercelEnv ? `, ${audit.vercelEnv}` : ''})`;
}

/**
 * Turn the "no password" failure into an actionable one. Two setups account
 * for almost every occurrence: a Docker/Compose operator copying
 * POSTGRES_PASSWORD (that variable configures the database *server*, not this
 * client), and a serverless deployment where the platform's PostgreSQL
 * integration injected its own variable name instead of DATABASE_URL.
 */
function configurationHints(env: Env): string {
  const hints: string[] = [];
  const composeVars = ['POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB'].filter(
    (key) => env[key] !== undefined,
  );
  if (composeVars.length > 0) {
    hints.push(
      `${composeVars.join(', ')} ${composeVars.length === 1 ? 'configures' : 'configure'} the docker-compose ` +
        `database service and ${composeVars.length === 1 ? 'is' : 'are'} never read by the application — ` +
        'map it to PGPASSWORD or use DATABASE_URL.',
    );
  }
  if (env.VERCEL === '1' || env.VERCEL === 'true' || env.VERCEL_ENV) {
    hints.push(
      'On Vercel, add DATABASE_URL in Project → Settings → Environment Variables for Production *and* Preview, ' +
        'then redeploy (a new variable does not reach an existing deployment). A localhost/Compose database is ' +
        'not reachable from a function — use a hosted PostgreSQL endpoint.',
    );
  }
  return hints.length > 0 ? `\n  → ${hints.join('\n  → ')}` : '';
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

/**
 * Connection-URL variables seen in the wild. Vercel's PostgreSQL/Neon and
 * Supabase integrations often inject POSTGRES_URL (or the Prisma variant) and
 * the platform used to pre-create DATABASE_URL only sometimes; accepting the
 * aliases keeps "I connected a database" from failing as "no password".
 * DATABASE_URL always wins and is the only name the docs recommend.
 */
const DATABASE_URL_ALIASES = ['POSTGRES_URL', 'POSTGRES_URL_NON_POOLING', 'POSTGRES_PRISMA_URL'] as const;

function readDatabaseUrl(env: Env): { url: string; key: string } | undefined {
  if (env.DATABASE_URL) return { url: env.DATABASE_URL, key: 'DATABASE_URL' };
  for (const key of DATABASE_URL_ALIASES) {
    const value = env[key];
    if (value) return { url: value, key };
  }
  return undefined;
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
  const databaseUrl = readDatabaseUrl(env);
  if (databaseUrl) {
    if (databaseUrl.key !== 'DATABASE_URL') {
      console.warn(
        `[config] DATABASE_URL is not set — using ${databaseUrl.key} instead. ` +
          'Set DATABASE_URL explicitly to make the configuration portable.',
      );
    }
    return {
      pool: { connectionString: databaseUrl.url, ...poolTuning },
      target: redactUrl(databaseUrl.url),
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
