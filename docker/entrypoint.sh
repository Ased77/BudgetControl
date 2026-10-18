#!/bin/sh
# =============================================================================
#  Container entrypoint
#
#  1. wait until PostgreSQL accepts connections
#  2. apply the schema (idempotent)      <- "run the migrations"
#  3. exec the container command (the API server by default)
#
#  Why wait here and not rely on `depends_on: condition: service_healthy`:
#  that condition only orders container *start-up*. It does not prove the
#  database is ready to serve *this* application's connections — a recovering
#  instance, a promoted replica or a slow first initdb all pass the healthcheck
#  at a moment when a connection can still be refused. Waiting here makes
#  `docker compose up` deterministic, and it makes the image usable under a
#  scheduler that knows nothing about compose (Kubernetes, ECS, Nomad).
#
#  The command is passed through with exec, so overriding it still gets the
#  wait + migration steps first:
#     docker compose run --rm app bun run db:check
#     docker compose run --rm app sh            # debugging shell
# =============================================================================
set -eu

echo "[entrypoint] waiting for PostgreSQL (DB_WAIT_TIMEOUT_MS=${DB_WAIT_TIMEOUT_MS:-60000})..."
bun dist/cli/wait-for-db.cjs

echo "[entrypoint] applying schema (idempotent)..."
bun dist/cli/db-init.cjs

if [ "$#" -eq 0 ]; then
  set -- bun dist/server.cjs
fi

echo "[entrypoint] starting: $*"
# exec keeps the server as PID 1 so SIGTERM from `docker stop` reaches it
# directly and the graceful-shutdown handler in server.ts can drain requests.
exec "$@"
