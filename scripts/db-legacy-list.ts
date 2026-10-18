/**
 * db:legacy:list — report the legacy_* staging tables that remain after the
 * document → normalized migration. Dropping them is a manual, deliberate
 * step (rollback safety) — this script only reports.
 *
 * Usage: bun run db:legacy:list
 */
import { loadDatabaseConfig } from '../server/config.js';
import { Pool } from 'pg';

async function main(): Promise<void> {
  const pool = new Pool(loadDatabaseConfig().pool);
  try {
    const renamed = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = current_schema() AND table_name LIKE 'legacy_%'
        ORDER BY table_name`,
    );
    for (const { table_name } of renamed.rows) {
      const counted = await pool.query<{ count: string }>(`SELECT count(*) AS count FROM "${table_name}"`);
      console.log(`${table_name.padEnd(26, ' ')} ${counted.rows[0]?.count ?? '0'} rows`);
    }
    if (renamed.rows.length === 0) {
      console.log('No legacy_* staging tables — this database never held the document model.');
    } else {
      console.log(`\n${renamed.rows.length} staging table(s). When the cutover is verified, drop them with:`);
      console.log(`  DROP TABLE ${renamed.rows.map((r) => r.table_name).join(', ')} CASCADE;`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[db:legacy:list] failed:', (error as Error).message);
  process.exit(1);
});
