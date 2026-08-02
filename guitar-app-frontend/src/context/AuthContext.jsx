import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  getCacheScope,
  getLibraryStatus,
  getPreferredOfflineScope,
} from '../utils/offlineStore';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [refreshToken, setRefreshToken] = useState(
    localStorage.getItem('refresh_token')
  );
  const [offlineScope, setOfflineScope] = useState(null);
  const [offlineAccessReady, setOfflineAccessReady] = useState(false);

  useEffect(() => {
    getPreferredOfflineScope()
      .then(setOfflineScope)
      .catch(() => setOfflineScope(null))
      .finally(() => setOfflineAccessReady(true));
  }, []);

  useEffect(() => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }, [token]);

  useEffect(() => {
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
    else localStorage.removeItem('refresh_token');
  }, [refreshToken]);

  const login = useCallback((newToken, newRefreshToken) => {
    setToken(newToken);
    if (newRefreshToken) setRefreshToken(newRefreshToken);
    const nextScope = getCacheScope(newToken);
    setOfflineScope(null);
    getLibraryStatus(nextScope)
      .then((library) => {
        if (library?.count > 0) setOfflineScope(nextScope);
      })
      .catch(() => {});
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setRefreshToken(null);
  }, []);

  const registerOfflineLibrary = useCallback((scope) => {
    setOfflineScope(scope);
    setOfflineAccessReady(true);
  }, []);

  const refreshAccessToken = useCallback(async () => {
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${refreshToken}` },
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (!data.access_token) return null;
      setToken(data.access_token);
      return data.access_token;
    } catch {
      return null;
    }
  }, [refreshToken]);

  const cacheScope = token
    ? getCacheScope(token)
    : offlineScope || 'guest';
  const offlineAccessAvailable = Boolean(offlineScope);
  const isOfflineSession = !token && offlineAccessAvailable;

  const value = useMemo(() => ({
    token,
    cacheScope,
    isLoggedIn: Boolean(token),
    offlineAccessAvailable,
    offlineAccessReady,
    isOfflineSession,
    login,
    logout,
    refreshAccessToken,
    registerOfflineLibrary,
  }), [
    cacheScope,
    isOfflineSession,
    login,
    logout,
    offlineAccessAvailable,
    offlineAccessReady,
    refreshAccessToken,
    registerOfflineLibrary,
    token,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
