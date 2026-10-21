import type { RequestHandler } from 'express';
import { createApp } from './server/app.js';
import { closePool, getDatabaseTarget } from './server/database.js';
import { ready, serverlessApp } from './server/serverless.js';

/**
 * Entry point, in two shapes.
 *
 *  - Vercel finds this file (server.ts at the project root) and deploys the
 *    default export as a single Express function. Requests that are not static
 *    files in the build output are routed to it, so no `listen()` happens here.
 *  - Every other host (local dev, Docker) imports nothing and runs the file:
 *    the schema comes up first, then the port opens, then SIGTERM drains.
 */
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

/**
 * The app Vercel serves, plus the shared database-readiness promise. Both live
 * in `server/serverless.ts` so the `api/` entry point can import them without
 * pulling in this file's local bootstrap.
 */
export default serverlessApp;

async function buildLocalApp(): Promise<ReturnType<typeof createApp>> {
  if (process.env.NODE_ENV !== 'production') {
    // Loaded lazily so the production image can install with --production:
    // Vite is build tooling and must never be a runtime dependency. The
    // specifier is held in a variable on purpose: it keeps bundlers and
    // dependency tracers (esbuild, @vercel/nft) from dragging Vite — and its
    // whole toolchain — into a serverless bundle, where it is never used.
    const vitePackage = 'vite';
    const { createServer: createViteServer } = await import(vitePackage);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    return createApp({ clientDevMiddleware: vite.middlewares as unknown as RequestHandler });
  }

  return createApp({ serveStatic: true });
}

async function startServer(): Promise<void> {
  // Schema + seed + incremental data repairs, before the port opens. Failing
  // here must be loud: the container should restart instead of serving a
  // half-initialized API. The same steps are reachable as `bun run db:init`.
  await ready();

  const app = await buildLocalApp();
  const PORT = Number(process.env.PORT) || 3000;

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
    console.log(`PostgreSQL: ${getDatabaseTarget()}`);
  });

  // Drain in-flight requests and close pooled connections on SIGTERM/SIGINT
  // (`docker compose down`, rolling deploys). A hard exit after 10s makes sure a
  // stuck socket can never block a deploy forever.
  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[api] ${signal} received — draining`);
    server.close(() => {
      void closePool().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (!isVercel) {
  startServer().catch((error) => {
    console.error('[api] Failed to start:', error);
    process.exit(1);
  });
}
