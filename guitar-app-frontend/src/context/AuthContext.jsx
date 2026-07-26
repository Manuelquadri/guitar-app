// src/context/AuthContext.jsx
import React, {
  createContext,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from 'react';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    // Sincronizamos el estado con localStorage
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  const login = useCallback((newToken) => {
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
  }, []);

  // El valor que compartiremos con toda la app
  const value = useMemo(() => ({
    token,
    isLoggedIn: !!token,
    login,
    logout,
  }), [login, logout, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
