import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/endpoints.js';
import { setAuthToken, getStoredToken, setUnauthorizedHandler } from '../api/axios.js';
import { connectSocket, disconnectSocket } from '../api/socket.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

/**
 * Holds the authenticated user + token. On mount it tries GET /auth/me to
 * auto-login from the stored token / httpOnly cookie, then connects the socket.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => getStoredToken());
  const [loading, setLoading] = useState(true);

  const finishAuth = useCallback((nextUser, nextToken) => {
    setUser(nextUser);
    if (nextToken) {
      setToken(nextToken);
      setAuthToken(nextToken);
    }
    if (nextToken || getStoredToken()) {
      connectSocket(nextToken || getStoredToken());
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore network errors on logout */
    }
    setUser(null);
    setToken(null);
    setAuthToken(null);
    disconnectSocket();
  }, []);

  // Register the 401 handler so an expired session resets state app-wide.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setToken(null);
      disconnectSocket();
    });
  }, []);

  // Auto-login on first load.
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!getStoredToken()) {
        setLoading(false);
        return;
      }
      try {
        const data = await authApi.me();
        if (mounted && data?.user) finishAuth(data.user, getStoredToken());
      } catch {
        setAuthToken(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [finishAuth]);

  const login = useCallback(
    async (credentials) => {
      const data = await authApi.login(credentials);
      finishAuth(data.user, data.token);
      return data.user;
    },
    [finishAuth]
  );

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    isSuperAdmin: user?.role === 'superadmin',
    login,
    logout,
    refreshUser: async () => {
      const data = await authApi.me();
      setUser(data.user);
      return data.user;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
