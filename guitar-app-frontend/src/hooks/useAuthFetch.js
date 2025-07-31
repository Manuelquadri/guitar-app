// src/hooks/useAuthFetch.js
import { useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';

export const useAuthFetch = () => {
  const { token, logout } = useContext(AuthContext);

  const authFetch = useCallback(async (url, options = {}) => {
    // ¡LA VERSIÓN CORRECTA! Establece Content-Type a JSON por defecto.
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      logout();
      throw new Error('Sesión expirada. Por favor, inicia sesión de nuevo.');
    }

    return response;
  }, [token, logout]);

  return authFetch;
};