/**
 * wait-for-db — block until PostgreSQL answers, then exit 0.
 *
 * Used by docker/entrypoint.sh before the app starts and before migrations run.
 * A database that is still booting (or recovering from a crash) is normal on a
 * cold `docker compose up`, and this is what keeps the container from
 * crash-looping while it waits.
 *
 *   DB_WAIT_TIMEOUT_MS   give up after this many ms (default 60000)
 */
import { closePool, getDatabaseTarget, waitForDatabase } from '../server/database.js';

async function main(): Promise<void> {
  const timeoutMs = Number(process.env.DB_WAIT_TIMEOUT_MS ?? 60_000);
  const target = getDatabaseTarget();
  console.log(`[wait-for-db] waiting for ${target} (timeout ${timeoutMs}ms)`);

  const started = Date.now();
  await waitForDatabase(timeoutMs);
  console.log(`[wait-for-db] ${target} is ready after ${Date.now() - started}ms`);
}

main()
  .catch((error) => {
    console.error('[wait-for-db] failed:', (error as Error).message);
    process.exitCode = 1;
  })
  .finally(() => closePool());
