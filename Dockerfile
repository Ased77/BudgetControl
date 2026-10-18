# syntax=docker/dockerfile:1.7
#
# =============================================================================
#  CSR Budgeting — production image
#
#  Four stages:
#     base     shared Bun image + cache configuration
#     deps     dependency manifests only, so code edits never re-install
#     builder  full toolchain: client bundle (Vite) + server/CLI bundles (esbuild)
#     tools    runtime dependencies + sources, for the import/tooling CLIs
#     runtime  production dependencies + built assets, non-root, read-only
#
#  Build:   docker build -t csr-budgeting .
#  Run:     docker compose up -d --build     (see docker-compose.yml)
#
#  The tag is pinned: a floating "latest" would make an image rebuild able to
#  change the runtime out from under a running deployment.
# =============================================================================
ARG BUN_VERSION=1.4.2

# Debian slim (glibc) for everything that compiles or installs: prebuilt native
# binaries (esbuild, tailwind oxide, better-sqlite3) are used as-is, so no
# python/make/g++ toolchain has to be installed in the image.
FROM oven/bun:${BUN_VERSION}-slim AS base
WORKDIR /app
# Keep the package cache out of the layer history where possible.
ENV BUN_INSTALL_CACHE_DIR=/tmp/bun-cache

# -----------------------------------------------------------------------------
# deps — only the manifests, so editing application code does not invalidate
# the dependency layer (the single biggest build-time win).
# -----------------------------------------------------------------------------
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# -----------------------------------------------------------------------------
# builder — produces dist/ : the Vite client bundle, dist/server.cjs and the
# CLI bundles in dist/cli/ that the entrypoint runs.
# -----------------------------------------------------------------------------
FROM deps AS builder
# server.ts is the API entry point bundled into dist/server.cjs. It must be
# present: esbuild resolves a bare "server.ts" as a *package* specifier and fails
# with "cannot be marked as external" when the file is missing.
COPY tsconfig.json vite.config.ts index.html server.ts ./
COPY public ./public
COPY src ./src
COPY server ./server
COPY scripts ./scripts
COPY types ./types
RUN bun run build \
 && test -f dist/server.cjs \
 && test -f dist/cli/db-init.cjs \
 && test -f dist/index.html

# -----------------------------------------------------------------------------
# tools — never shipped as the application runtime: the production dependency
# set plus the TypeScript sources, so the operational CLIs (db:check, db:init,
# db:import:sqlite) run against the same code without a build step. Bun executes
# TypeScript directly and reading SQLite comes from bun:sqlite, which is
# compiled into the runtime — no native addon, no compiler toolchain.
# docker-compose.yml exposes this stage as the on-demand `migrate` service.
# -----------------------------------------------------------------------------
FROM oven/bun:${BUN_VERSION}-alpine AS tools
WORKDIR /app
ENV BUN_INSTALL_CACHE_DIR=/tmp/bun-cache
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production \
 && rm -rf /tmp/bun-cache
COPY server ./server
COPY scripts ./scripts
COPY src ./src
COPY types ./types
CMD ["bun", "run", "db:check"]

# -----------------------------------------------------------------------------
# runtime — alpine (musl) is safe here because the production dependency set
# (express, pg, dotenv) is pure JavaScript and Vite is imported lazily in
# server.ts, so no build tooling or native addon is ever loaded at runtime.
# -----------------------------------------------------------------------------
FROM oven/bun:${BUN_VERSION}-alpine AS runtime

ENV NODE_ENV=production \
    PORT=3000 \
    BUN_INSTALL_CACHE_DIR=/tmp/bun-cache

WORKDIR /app

# Production dependencies only — a handful of packages instead of the several
# hundred needed to build the frontend.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production \
 && rm -rf /tmp/bun-cache

# Only build output is copied: no sources, no secrets, no source maps of the
# *client* bundle beyond what Vite emitted, and no legacy database.
COPY --from=builder /app/dist ./dist

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# The official image already provides this unprivileged user.
USER bun

EXPOSE 3000

# Kept in the image so plain `docker run` is also monitored; docker-compose.yml
# overrides it with the same endpoint and longer start-up budget.
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD wget -q -O- http://127.0.0.1:${PORT}/api/health >/dev/null || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["bun", "dist/server.cjs"]
