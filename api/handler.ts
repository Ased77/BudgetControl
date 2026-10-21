/**
 * Vercel entry point — a plain Node Function in `api/`.
 *
 * WHY THIS EXISTS: Vercel's Express framework preset is not producing a
 * function for this project (deployments serve only the SPA, and every
 * `/api/*` path answers the platform's plain-text 404). A file in `api/` is
 * built as a Serverless Function for *any* framework preset, so this is the
 * one entry point that cannot be skipped.
 *
 * HOW: `vercel.json` sends `/api/:path*` and `/dev/:path*` here with the
 * original path in `__original`; the Express app restores it (see
 * server/rewrite-path.ts) and routes normally. Nothing is duplicated: the same
 * app, middleware and auth as `server.ts`.
 *
 * The app comes from `server/serverless.ts`, not `server.ts`, so importing it
 * never runs the local bootstrap (which opens a port outside Vercel).
 */
import type { Request, Response } from 'express';
import app from '../server/serverless.js';

export default function handler(req: Request, res: Response): void {
  app(req, res);
}
