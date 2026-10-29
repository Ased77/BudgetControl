/**
 * AuthContext — the verified session, exposed to React.
 *
 * The client stores NOTHING that can manufacture an identity: no userId in
 * localStorage, no user picker, no token in JS. The state machine is:
 *
 *   loading → authenticated (with one cookie refresh if needed) | anonymous
 *
 * After login (cookies set), the app checks /api/auth/me on mount and refreshes
 * once if the access cookie expired. Losing the session (expired rotation
 * family, disabled account) drops back to anonymous through one funnel.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authApi, OtpRequestResult, SessionProfile } from '../services/authApi';
import { setUnauthorizedHandler } from '../services/api';

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

interface AuthContextType {
  status: AuthStatus;
  /** The verified user — every consumer treats this as server-issued truth. */
  user: SessionProfile | null;
  /** Requests a one-time code (no session yet). */
  requestOtp: (mobile: string) => Promise<OtpRequestResult>;
  /**
   * Verifies a one-time code and receives the session cookies, but does NOT
   * flip React state yet. Splitting verification from adoption lets the login
   * screen show its green confirmation before the gate hands over to the app.
   */
  verifyOtp: (mobile: string, code: string) => Promise<SessionProfile>;
  /** Adopts a profile returned by verifyOtp() as the live session. */
  establishSession: (profile: SessionProfile) => void;
  /** Password login — kept for machine clients; the browser uses OTP. */
  login: (mobile: string, password: string) => Promise<SessionProfile>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<SessionProfile | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    // One probe per page load: the httpOnly cookies **are** the session.
    // A 401 here means anonymous (already-refreshed attempt already ran).
    authApi
      .me()
      .then((res) => {
        if (!mounted.current) return;
        setUser(res.user);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!mounted.current) return;
        setUser(null);
        setStatus('anonymous');
      });
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Transport → context wiring: any API call that exhausts its refresh
    // retry kills the session here. Single funnel, no refresh storms.
    setUnauthorizedHandler(() => {
      setStatus('anonymous');
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const requestOtp = useCallback(
    (mobile: string): Promise<OtpRequestResult> => authApi.requestOtp(mobile),
    [],
  );

  const verifyOtp = useCallback(async (mobile: string, code: string): Promise<SessionProfile> => {
    const res = await authApi.verifyOtp(mobile, code);
    return res.user;
  }, []);

  const establishSession = useCallback((profile: SessionProfile): void => {
    if (!mounted.current) return;
    setUser(profile);
    setStatus('authenticated');
  }, []);

  const login = useCallback(async (mobile: string, password: string): Promise<SessionProfile> => {
    const res = await authApi.login(mobile, password);
    if (!mounted.current) return res.user;
    setUser(res.user);
    setStatus('authenticated');
    return res.user;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } finally {
      if (mounted.current) {
        setUser(null);
        setStatus('anonymous');
      }
    }
  }, []);

  const value = useMemo(
    () => ({ status, user, requestOtp, verifyOtp, establishSession, login, logout }),
    [status, user, requestOtp, verifyOtp, establishSession, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
