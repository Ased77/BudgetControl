/**
 * Typed fetch wrapper around the Express + PostgreSQL backend.
 * Every call resolves to parsed JSON or throws Error(message) on failure.
 *
 * Session transport (auth): the browser holds httpOnly cookies (csr_at /
 * csr_rt) it cannot read or steal. `credentials: 'include'` ships them on
 * every call, so requests are authenticated without any token in JS.
 *
 * 401 handling: exactly one silent /api/auth/refresh attempt is made and the
 * original request retried once. If the refresh itself fails (expired
 * rotation family, disabled account, deadline reached) the unauthorized
 * hook fires exactly once — the session provider drops to anon/login. This
 * prevents refresh storms: a dead session triggers the redirect, and a
 * slow server cannot make every API call enqueue its own refresh first.
 */

const BASE = import.meta.env.VITE_API_BASE ?? '';

/** Set by AuthContext so transport and identity stay in one channel. */
let onUnauthorized: (() => void) | null = null;
let refreshing: Promise<boolean> | null = null;

export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

async function tryRefresh(): Promise<boolean> {
  refreshing ??= fetch(`${BASE}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // httpOnly session cookies ride along
    ...options,
  });

  if (res.status === 401 && retried === false && !path.startsWith('/api/auth/')) {
    // Access token expired: the httpOnly refresh cookie silently converts
    // into a new pair. If that fails the session is genuinely over.
    if (await tryRefresh()) {
      return request<T>(path, options, true);
    }
    onUnauthorized?.();
    throw new Error('انقضای نشست — لطفاً دوباره وارد شوید');
  }

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* non-JSON error body — keep the status-based message */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });
const put = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
const patch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' });

import {
  OrganizationConfig,
  LocationData,
  CsrPriority,
  ExecutiveProject,
  AuditLogItem,
  Department,
  BudgetSource,
  CrisisHarmItem,
  ProjectExecutor,
  Contractor,
  SystemRolePermission,
  UserProfile,
  AnalysisSource,
} from '../types';

export const api = {
  health: () => get<{ status: string; persistence: string }>('/api/health'),

  organization: {
    get: () => get<OrganizationConfig>('/api/organization'),
    save: (org: OrganizationConfig) => put<OrganizationConfig>('/api/organization', org),
  },

  locations: {
    list: () => get<LocationData[]>('/api/locations'),
  },

  priorities: {
    list: () => get<CsrPriority[]>('/api/priorities'),
    create: (p: CsrPriority) => post<CsrPriority>('/api/priorities', p),
    update: (p: CsrPriority) => put<CsrPriority>(`/api/priorities/${p.id}`, p),
    remove: (id: string) => del<{ ok: boolean }>(`/api/priorities/${id}`),
    importAll: (items: CsrPriority[]) => put<{ count: number }>('/api/priorities/import', items),
  },

  projects: {
    list: () => get<ExecutiveProject[]>('/api/projects'),
    create: (p: ExecutiveProject) => post<ExecutiveProject>('/api/projects', p),
    update: (p: ExecutiveProject) => put<ExecutiveProject>(`/api/projects/${p.id}`, p),
    remove: (id: string) => del<{ ok: boolean }>(`/api/projects/${id}`),
    setStatus: (id: string, status: ExecutiveProject['status']) =>
      patch<ExecutiveProject>(`/api/projects/${id}/status`, { status }),
  },

  departments: {
    list: () => get<Department[]>('/api/departments'),
    create: (d: Department) => post<Department>('/api/departments', d),
    update: (d: Department) => put<Department>(`/api/departments/${d.id}`, d),
    remove: (id: string) => del<{ ok: boolean }>(`/api/departments/${id}`),
  },

  budgetSources: {
    list: () => get<BudgetSource[]>('/api/budget-sources'),
    create: (s: BudgetSource) => post<BudgetSource>('/api/budget-sources', s),
    update: (s: BudgetSource) => put<BudgetSource>(`/api/budget-sources/${s.id}`, s),
    remove: (id: string) => del<{ ok: boolean }>(`/api/budget-sources/${id}`),
  },

  crisesHarms: {
    list: () => get<CrisisHarmItem[]>('/api/crises-harms'),
    create: (c: CrisisHarmItem) => post<CrisisHarmItem>('/api/crises-harms', c),
    update: (c: CrisisHarmItem) => put<CrisisHarmItem>(`/api/crises-harms/${c.id}`, c),
    remove: (id: string) => del<{ ok: boolean }>(`/api/crises-harms/${id}`),
  },

  executors: {
    list: () => get<ProjectExecutor[]>('/api/executors'),
    create: (e: ProjectExecutor) => post<ProjectExecutor>('/api/executors', e),
    update: (e: ProjectExecutor) => put<ProjectExecutor>(`/api/executors/${e.id}`, e),
    remove: (id: string) => del<{ ok: boolean }>(`/api/executors/${id}`),
  },

  contractors: {
    list: () => get<Contractor[]>('/api/contractors'),
    create: (c: Contractor) => post<Contractor>('/api/contractors', c),
    update: (c: Contractor) => put<Contractor>(`/api/contractors/${c.id}`, c),
    remove: (id: string) => del<{ ok: boolean }>(`/api/contractors/${id}`),
  },

  users: {
    list: () => get<UserProfile[]>('/api/users'),
  },

  rolesPermissions: {
    list: () => get<SystemRolePermission[]>('/api/roles-permissions'),
  },

  auditLogs: {
    list: (limit = 200) => get<AuditLogItem[]>(`/api/audit-logs?limit=${limit}`),
    create: (entry: AuditLogItem) => post<{ ok: boolean }>('/api/audit-logs', entry),
  },

  analysisSources: {
    list: () => get<AnalysisSource[]>('/api/analysis-sources'),
    create: (s: AnalysisSource) => post<AnalysisSource>('/api/analysis-sources', s),
    update: (s: AnalysisSource) => put<AnalysisSource>(`/api/analysis-sources/${s.id}`, s),
    remove: (id: string) => del<{ ok: boolean }>(`/api/analysis-sources/${id}`),
  },
};
