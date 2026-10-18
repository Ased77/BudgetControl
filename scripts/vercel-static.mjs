/**
 * Publish the client build where each Vercel preset looks for it.
 *
 * `vite build` always writes `dist/` — the same directory Docker and the local
 * server use, so the artifact under test is the artifact deployed. Vercel,
 * however, depends on how the project is resolved:
 *
 *   Express preset  ->  static files are served from `public/` (hardcoded)
 *   Vite preset     ->  static files are served from `dist/`
 *
 * Copying into `public/` after the build satisfies the first without changing
 * the second, so a correct deployment does not hinge on which preset Vercel
 * picked. `public/` is a build output here and is gitignored; font sources live
 * in `static/` (Vite's publicDir), so nothing hand-written is overwritten.
 */
import { cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath rather than import.meta.dirname: the latter needs Node 20.11+,
// and the Vercel project's Node version is not pinned by this repository.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const publicDir = path.join(root, 'public');

if (!existsSync(path.join(dist, 'index.html'))) {
  console.error('[vercel-static] dist/index.html is missing — run `vite build` first');
  process.exit(1);
}

rmSync(publicDir, { recursive: true, force: true });
cpSync(dist, publicDir, { recursive: true });
console.log('[vercel-static] copied dist/ -> public/ for Vercel');
