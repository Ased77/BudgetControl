/**
 * AuthContext — the verified session, exposed to React.
 *
 * The client stores NOTHING that can manufacture an identity: no userId in
 * localStorage, no user picker, no token in JS. The state machine is:
 *
 *   loading → anonymous → authenticated → (401 refresh loop gone) → anonymous
 *
 * After login (cookies set), the app polls /api/auth/me exactly on mount.
 * Losing the session (expired rotation family, disabled account) drops
 * back to anonymous, driven by the transport's onUnauthorized hook — one
 * funnel, no refresh storms.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authApi, SessionProfile } from '../services/authApi';
import { setUnauthorizedHandler } from '../services/api';

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

interface AuthContextType {
  status: AuthStatus;
  /** The verified user — every consumer treats this as server-issued truth. */
  user: SessionProfile | null;
  login: (email: string, password: string) => Promise<SessionProfile>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
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

  const login = useCallback(async (email: string, password: string): Promise<SessionProfile> => {
    const res = await authApi.login(email, password);
    if (!mounted.current) return res.user;
    setUser(res.user);
    setStatus('authenticated');
    return res.user;
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName: string): Promise<void> => {
      await authApi.register({ email, password, displayName });
      await login(email, password);
    },
    [login],
  );

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
    () => ({ status, user, login, register, logout }),
    [status, user, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
