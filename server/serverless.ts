/**
 * The app deployed as a Vercel Function.
 *
 * Kept apart from `server.ts` so an import does not run the local bootstrap:
 * `server.ts` opens a port when the process is not on Vercel, which made the
 * `api/` entry point untestable off-platform. This module has no side effects
 * beyond constructing the Express app.
 */
import { createApp } from './app.js';
import { initializeDatabase } from './database.js';

/**
 * One initialization per process/isolate. A failed attempt is not cached, so a
 * transient database outage fails the current request and is retried by the
 * next one instead of pinning the instance to a broken state.
 */
let readyPromise: Promise<void> | null = null;
export const ready = (): Promise<void> =>
  (readyPromise ??= initializeDatabase().catch((error) => {
    readyPromise = null;
    throw error;
  }));

/**
 * Static assets are the host's job (its routing checks the built files first),
 * so only the API routes are mounted here.
 */
export const serverlessApp = createApp({ serveStatic: false, ready });

export default serverlessApp;
