/**
 * Vercel entry point — a plain Node Function in `api/`.
 *
 * WHY THIS EXISTS: Vercel's Express framework preset is not producing a
 * function for this project, so this file is the entry point Vercel always
 * builds.
 *
 * HOW: `vercel.json` sends `/api/:path*` and `/dev/:path*` here with the
 * original path in `__original`; the Express app restores it (see
 * server/rewrite-path.ts) and routes normally. Nothing is duplicated: the same
 * app, middleware and auth as `server.ts`.
 *
 * WHY THE DYNAMIC IMPORT: the app imports `server/db/client.ts`, which builds
 * the PostgreSQL pool from the environment at module load. On a serverless
 * platform that throw happens before any handler runs, and Vercel answers with
 * an opaque `FUNCTION_INVOCATION_FAILED` 500 that names no cause. Loading the
 * app inside the handler keeps the boot failure catchable, so the response (and
 * the dev seed panel) can say what is actually misconfigured.
 *
 * NOTE ON TYPES: the runtime hands over raw Node request/response objects, not
 * Express-augmented ones (there is no `res.status` until Express wraps it), so a
 * response written before the app boots must use the Node API.
 */
import type { Express } from 'express';
import type { IncomingMessage, ServerResponse } from 'node:http';
// Safe to import statically: this module reads the environment but never opens
// a connection, so it cannot fail the way server/db/client.ts does.
import { describeDatabaseEnvironment } from '../server/config.js';

let booted: Promise<Express> | null = null;

const loadApp = (): Promise<Express> =>
  (booted ??= import('../server/serverless.js')
    .then((module) => module.default)
    .catch((error: unknown) => {
      // Do not cache a failed boot: the next request may run on a fixed env.
      booted = null;
      throw error;
    }));

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const app = await loadApp();
    (app as unknown as (request: IncomingMessage, response: ServerResponse) => void)(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[api] Function failed to boot:', error);
    if (res.headersSent) return;
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        error: message,
        code: 'FUNCTION_BOOT_FAILED',
        // Names and emptiness only — lets a caller tell "variable never
        // reached this deployment" apart from "variable is empty" without
        // reading the dashboard.
        database: describeDatabaseEnvironment(),
      }),
    );
  }
}
