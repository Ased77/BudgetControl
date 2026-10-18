import { defineConfig } from 'drizzle-kit';

/* drizzle-kit: schema introspection is NOT used — the TypeScript schema in
   server/db/schema.ts is the single source of truth. The connection URL is
   read from the environment purely for `drizzle-kit push` type operations;
   `generate` and migration application never talk to the database. */

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema.ts',
  out: './server/migrations',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://localhost/app',
  },
  verbose: true,
  strict: false,
});
