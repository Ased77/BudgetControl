/**
 * Undo the Vercel rewrite that funnels every API request into `api/handler`.
 *
 * `vercel.json` maps `/api/:path*` and `/dev/:path*` to
 * `/api/handler?__original=<original path>`, because a rewrite replaces the path
 * the runtime observes. Restoring it here — inside the Express app rather than
 * in the entry point — means routing works whichever way Vercel invokes the
 * app: through the `api/` Node Function, or through the Express framework
 * preset's single function.
 */

/** Path Vercel routes the function to. */
export const FUNCTION_PATH = '/api/handler';

/**
 * `/api/handler?__original=api/health&x=1` → `/api/health?x=1`.
 * `/api/handler?__original=dev/seed-users`  → `/dev/seed-users`.
 *
 * Any other URL is returned untouched, so a caller cannot smuggle `__original`
 * into a normal request to change which route runs.
 */
export function restoreOriginalUrl(rawUrl: string): string {
  const queryIndex = rawUrl.indexOf('?');
  const pathname = queryIndex === -1 ? rawUrl : rawUrl.slice(0, queryIndex);
  if (pathname !== FUNCTION_PATH) return rawUrl;

  const params = new URLSearchParams(queryIndex === -1 ? '' : rawUrl.slice(queryIndex + 1));
  const original = params.get('__original');
  if (!original) return rawUrl;

  params.delete('__original');
  const rest = params.toString();
  const path = `/${original.replace(/^\/+/, '')}`;
  return rest ? `${path}?${rest}` : path;
}
