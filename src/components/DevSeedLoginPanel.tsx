/**
 * Dev Seed Login panel — DISPOSABLE, dev-only login helper.
 *
 * Shown ONLY in non-production frontend builds: it self-gates on
 * `import.meta.env.VITE_APP_ENV !== 'production'` inside this file, so the
 * production bundle renders nothing (the import tree-shakes away).
 *
 * What it does:
 *   1. On mount, GET /dev/seed-users (list of { id, username } of seeded
 *      test accounts — the server mounts these routes only outside
 *      production, see server/dev/seed-routes.ts).
 *   2. Clicking a username GETs /dev/seed-users/:id/credentials and calls
 *      `onFill(username, password)` so the login form fields are pre-filled.
 * It NEVER auto-submits: the developer still presses the real login button,
 * so the normal authentication flow (POST /api/auth/login, cookies, refresh
 * rotation) runs untouched.
 *
 * HOW TO REMOVE THE FEATURE:
 *   - Delete this file and the single <DevSeedLoginPanel … /> render in
 *     src/components/LoginView.tsx.
 *   - Backend part: server/dev/seed-routes.ts + its conditional mount in
 *     server/app.ts + scripts/dev-seed-users.ts + migration 0003
 *     (schema columns isTestUser / devPassword — see the migration header).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { FlaskConical } from 'lucide-react';

interface SeedUser {
  /** auth_users.id (uuid) — handed back to /seed-users/:id/credentials. */
  id: string;
  /** The login email of the test account. */
  username: string;
}

interface DevSeedLoginPanelProps {
  /** Pre-fills the login form fields (no submitting happens here). */
  onFill: (username: string, password: string) => void;
}

export const DevSeedLoginPanel: React.FC<DevSeedLoginPanelProps> = ({ onFill }) => {
  const isDevBuild = import.meta.env.VITE_APP_ENV !== 'production';
  const [seedUsers, setSeedUsers] = useState<SeedUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isDevEndpointReachable = useCallback(
    async (path: string): Promise<Response> =>
      // Plain fetch on purpose: /dev/* is an unauthenticated dev route and must
      // never trigger the 401-refresh loop of the api service.
      fetch(path, { credentials: 'include' }),
    [],
  );

  useEffect(() => {
    if (!isDevBuild) return;
    let alive = true;
    isDevEndpointReachable('/dev/seed-users')
      .then(async (res) => {
        if (!res.ok) throw new Error(`GET /dev/seed-users failed: ${res.status}`);
        const data = (await res.json()) as { users: SeedUser[] };
        if (alive) setSeedUsers(data.users ?? []);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : 'خطای نامشخص');
      });
    return () => {
      alive = false;
    };
  }, [isDevBuild, isDevEndpointReachable]);

  const handleSelect = async (seedUser: SeedUser): Promise<void> => {
    setError(null);
    setBusyId(seedUser.id);
    try {
      const res = await isDevEndpointReachable(`/dev/seed-users/${seedUser.id}/credentials`);
      if (!res.ok) throw new Error(`درخواست رمز آزمایشی ناموفق بود: ${res.status}`);
      const data = (await res.json()) as { username: string; password: string };
      onFill(data.username, data.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطای نامشخص');
    } finally {
      setBusyId(null);
    }
  };

  if (!isDevBuild) return null;

  return (
    <div
      id="dev-seed-login-panel"
      className="mt-6 rounded-xl border-2 border-dashed border-amber-400/70 bg-amber-50 px-3 py-2.5"
    >
      <p className="flex items-center gap-1.5 text-[10px] font-black text-amber-800">
        <FlaskConical className="w-3.5 h-3.5" />
        Dev seed users (فقط محیط توسعه)
      </p>
      {error ? (
        <p className="mt-1.5 text-[10px] leading-relaxed text-rose-700">{error}</p>
      ) : seedUsers.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {seedUsers.map((seedUser) => (
            <button
              key={seedUser.id}
              type="button"
              onClick={() => handleSelect(seedUser)}
              disabled={busyId !== null}
              title={`${seedUser.username} — پرکردن فرم ورود`}
              className={`rounded-lg border border-amber-300 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 transition-colors ${
                busyId === seedUser.id
                  ? 'cursor-wait text-rose-400'
                  : 'hover:bg-amber-100 hover:border-amber-400'
              } disabled:opacity-60`}
            >
              {seedUser.username}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-1.5 text-[10px] text-amber-700/80">
          حساب آزمایشی ثبت نشده — <code dir="ltr">bun run scripts/dev-seed-users.ts</code>
        </p>
      )}
    </div>
  );
};
