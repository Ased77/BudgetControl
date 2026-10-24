/**
 * Dev Seed Login panel — DISPOSABLE, dev-only login helper.
 *
 * Shown ONLY in non-production frontend builds: it self-gates on
 * `import.meta.env.VITE_APP_ENV !== 'production'` inside this file, so the
 * production bundle renders nothing (the import tree-shakes away). Vercel's
 * build command (vercel.json) sets VITE_APP_ENV=production, so the panel never
 * ships there even if the dashboard environment omits it; local Docker and
 * `bun run dev` leave it unset and keep the panel.
 *
 * What it does:
 *   1. On mount, GET /dev/seed-users (list of { id, username, name, role,
 *      roleFa } of seeded test accounts — the server mounts these routes only
 *      on a developer's machine, never on a deployed Vercel function; see
 *      server/dev/seed-routes.ts).
 *   2. Each button is a compact role icon + role title (roleFa); the account
 *      name and mobile number stay in the tooltip, never on the button.
 *      Clicking one GETs /dev/seed-users/:id/credentials and calls
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
import {
  FlaskConical,
  UserRound,
  ShieldCheck,
  Landmark,
  BookOpen,
  Wallet,
  MapPin,
  Building2,
  Briefcase,
  ClipboardList,
  FileText,
  HardHat,
  LifeBuoy,
  FileSearch,
  BadgeCent,
  type LucideIcon,
} from 'lucide-react';

/**
 * One glyph per RBAC role, so a compact "icon + role title" button is still
 * distinguishable at a glance. Unknown roles fall back to a generic person.
 */
const ROLE_ICONS: Record<string, LucideIcon> = {
  SYSTEM_ADMIN: ShieldCheck,
  BUDGET_CHAIRMAN: BadgeCent,
  CULTURE_BUDGET_HEAD: BookOpen,
  TREASURY_FINANCE_HEAD: Wallet,
  GOVERNOR: Landmark,
  DISTRICT_GOVERNOR: MapPin,
  MAYOR: Building2,
  OFFICE_HEAD: Briefcase,
  PROJECT_MANAGER: ClipboardList,
  PLAN_OFFICER: FileText,
  CONTRACTOR: HardHat,
  TECH_SUPPORT: LifeBuoy,
  INTERNAL_AUDITOR: FileSearch,
};

interface SeedUser {
  /** auth_users.id (uuid) — handed back to /seed-users/:id/credentials. */
  id: string;
  /** The login identity (mobile number) of the test account — display only in the tooltip. */
  username: string;
  /** Friendly label of the account (displayName on auth_users). */
  name: string;
  /** Machine role code (UserRole). */
  role: string;
  /** Persian role label from the RBAC matrix — shown on the button. */
  roleFa: string;
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

  /**
   * The status alone ("failed: 500") hides the cause: a hosting/rewrite problem
   * answers with HTML, while the API explains its own failures in JSON. Read the
   * body when there is one so the panel shows the reason instead of a number.
   */
  const describeFailure = useCallback(async (res: Response, what: string): Promise<Error> => {
    const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
    const detail = typeof body?.error === 'string' && body.error ? body.error : null;
    return new Error(detail ? `${what}: ${res.status} — ${detail}` : `${what}: ${res.status}`);
  }, []);

  useEffect(() => {
    if (!isDevBuild) return;
    let alive = true;
    isDevEndpointReachable('/dev/seed-users')
      .then(async (res) => {
        if (!res.ok) throw await describeFailure(res, 'GET /dev/seed-users failed');
        const data = (await res.json()) as { users: SeedUser[] };
        if (alive) setSeedUsers(data.users ?? []);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : 'خطای نامشخص');
      });
    return () => {
      alive = false;
    };
  }, [isDevBuild, describeFailure, isDevEndpointReachable]);

  const handleSelect = async (seedUser: SeedUser): Promise<void> => {
    setError(null);
    setBusyId(seedUser.id);
    try {
      const res = await isDevEndpointReachable(`/dev/seed-users/${seedUser.id}/credentials`);
      if (!res.ok) throw await describeFailure(res, 'درخواست رمز آزمایشی ناموفق بود');
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
          {seedUsers.map((seedUser) => {
            const RoleIcon = ROLE_ICONS[seedUser.role] ?? UserRound;
            return (
              <button
                key={seedUser.id}
                type="button"
                onClick={() => handleSelect(seedUser)}
                disabled={busyId !== null}
                title={`${seedUser.name} (${seedUser.roleFa}) — ورود با ${seedUser.username}`}
                className={`inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-[10px] font-bold text-slate-700 transition-colors ${
                  busyId === seedUser.id
                    ? 'cursor-wait text-rose-400'
                    : 'hover:bg-amber-100 hover:border-amber-400'
                } disabled:opacity-60`}
              >
                <RoleIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="leading-tight">{seedUser.roleFa}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-1.5 text-[10px] text-amber-700/80">
          حساب آزمایشی ثبت نشده — <code dir="ltr">bun run scripts/dev-seed-users.ts</code>
        </p>
      )}
    </div>
  );
};
