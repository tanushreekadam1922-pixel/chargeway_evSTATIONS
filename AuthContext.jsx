import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { storage, setUnauthorizedHandler } from '../api/client.js';

const AuthContext = createContext(null);

/** Holds the signed-in user + token (mirrored in localStorage so a refresh keeps you signed in). */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => ({ token: storage.getToken(), user: storage.getUser() }));

  const login = useCallback((res) => {
    storage.save(res);
    setSession({ token: res.token, user: res.user });
  }, []);

  const logout = useCallback(() => {
    storage.clear();
    setSession({ token: null, user: null });
  }, []);

  const updateUser = useCallback((patch) => {
    setSession((s) => {
      const user = { ...s.user, ...patch };
      storage.save({ token: s.token, user });
      return { ...s, user };
    });
  }, []);

  // When the API says the token is no longer valid, drop the session from React state too.
  useEffect(() => {
    setUnauthorizedHandler(() => setSession({ token: null, user: null }));
    return () => setUnauthorizedHandler(null);
  }, []);

  const value = useMemo(() => ({
    user: session.user,
    isAuthed: Boolean(session.token && session.user),
    login, logout, updateUser,
  }), [session, login, logout, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
