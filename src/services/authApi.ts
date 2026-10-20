/**
 * Identity endpoints of /api/auth, typed. The tokens NEVER ride through
 * this layer — they live in httpOnly cookies set by the server. These
 * calls only exchange credentials for a session and read the profile.
 *
 * NOTE: there is deliberately no client self-registration. Accounts are
 * created exclusively through POST /api/auth/users by an admin, from the
 * role & permission manager (RolesAndAccessView).
 */

import { UserProfile } from '../types';
import { api } from './api';

export interface CreateAccountInput {
  email: string;
  displayName: string;
  role: string;
  password?: string;       // when empty the server generates a one-time password
  province?: string;
  county?: string;
  departmentId?: string;
  allowedLocationId?: string;
}

export interface CreateAccountResult {
  user: SessionProfile;
  /** Present exactly when the server generated the password. Shown once. */
  generatedPassword?: string;
}

export const authApi = {
  createAccount: (input: CreateAccountInput) =>
    post<CreateAccountResult>(`/api/auth/users`, input),
  login: (email: string, password: string) => post<{ user: SessionProfile }>(`/api/auth/login`, { email, password }),
  logout: () => post<{ ok: boolean }>(`/api/auth/logout`, {}),
  me: () => get<{ user: SessionProfile }>(`/api/auth/me`),
};

/** A GET against the auth router (uses request() without the 401-refresh path). */
function get<T>(path: string): Promise<T> {
  return fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json' } }).then((res) => {
    if (!res.ok) return Promise.reject(new Error(`Auth probe failed: ${res.status}`));
    return res.json() as Promise<T>;
  });
}

/** POST with a JSON body and a friendly error message. */
function post<T>(path: string, body: unknown): Promise<T> {
  return fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(async (res) => {
    if (!res.ok) {
      let message = `Login failed: ${res.status}`;
      try {
        const data = await res.json();
        if (data?.error) message = data.error;
      } catch {
        /* non-JSON error body */
      }
      throw new Error(message);
    }
    return res.json() as Promise<T>;
  });
}

/** The verified identity payload (/api/auth/me returns it). */
export type SessionProfile = UserProfile & { email: string };

// Re-export so consumers import a single symbol for the current user type.
export type { UserProfile };
export { api };
