/**
 * build step: copy the drizzle migrations into dist/ so the bundled server
 * (dist/server.cjs) and the bundled CLI (dist/cli/*.cjs) can resolve the
 * migrations folder with only the build output present (the runtime image
 * has no server/ sources — see Dockerfile).
 */
import fs from 'fs';
import path from 'path';

const source = path.join(process.cwd(), 'server', 'migrations');
const target = path.join(process.cwd(), 'dist', 'migrations');

if (!fs.existsSync(source)) {
  console.error('[sync-migrations] server/migrations not found — nothing to copy');
  process.exit(1);
}

fs.mkdirSync(target, { recursive: true });
fs.cpSync(source, target, { recursive: true });
console.log(`[sync-migrations] copied ${source} -> ${target}`);
