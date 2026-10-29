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

export interface OtpRequestResult {
  ok: boolean;
  /** How long the code stays valid. */
  expiresInSeconds: number;
  /** Seconds before another code may be requested for the same mobile. */
  resendAfterSeconds: number;
  /**
   * Present only while AUTH_OTP_FAKE_DELIVERY is on (no SMS provider wired
   * yet). The login screen shows it as a dev hint instead of receiving an SMS.
   */
  devCode?: string;
}

export interface CreateAccountInput {
  /** Normalized on the server (server/auth/mobile.ts): 09123456789 etc. */
  mobile: string;
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
  /** Password login — kept for machine clients; the browser uses OTP. */
  login: (mobile: string, password: string) => post<{ user: SessionProfile }>(`/api/auth/login`, { mobile, password }),
  requestOtp: (mobile: string) => post<OtpRequestResult>(`/api/auth/otp/request`, { mobile }),
  verifyOtp: (mobile: string, code: string) =>
    post<{ user: SessionProfile }>(`/api/auth/otp/verify`, { mobile, code }),
  logout: () => post<{ ok: boolean }>(`/api/auth/logout`, {}),
  me: getCurrentSession,
};

/**
 * A hung function must not leave the login button spinning forever: every
 * auth call is bounded. 60s is deliberately generous — the first request after
 * a deploy may be running migrations and the one-time seed — but it is still
 * finite, so the UI can show "no response" instead of loading indefinitely.
 */
const AUTH_REQUEST_TIMEOUT_MS = 60_000;

class AuthRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'AuthRequestError';
  }
}

let sessionProbe: Promise<{ user: SessionProfile }> | null = null;

/** Revalidates the session, refreshing an expired access cookie when possible. */
function getCurrentSession(): Promise<{ user: SessionProfile }> {
  if (!sessionProbe) {
    sessionProbe = get<{ user: SessionProfile }>('/api/auth/me')
      .catch((error: unknown) => {
        if (error instanceof AuthRequestError && error.status === 401) {
          return post<{ user: SessionProfile }>('/api/auth/refresh', {});
        }
        throw error;
      })
      .finally(() => {
        sessionProbe = null;
      });
  }
  return sessionProbe;
}

/** A GET against the auth router, kept separate from business API requests. */
async function get<T>(path: string): Promise<T> {
  const res = await fetchWithTimeout(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new AuthRequestError(`Auth probe failed: ${res.status}`, res.status);
  return res.json() as Promise<T>;
}

/** POST with a JSON body and a friendly error message. */
async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetchWithTimeout(path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
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
}

async function fetchWithTimeout(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(path, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('پاسخی از سرور دریافت نشد — اتصال را بررسی کنید و دوباره تلاش کنید');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** The verified identity payload (/api/auth/me returns it). */
export type SessionProfile = UserProfile & { mobile: string };

// Re-export so consumers import a single symbol for the current user type.
export type { UserProfile };
export { api };
