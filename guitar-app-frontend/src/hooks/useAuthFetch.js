// src/hooks/useAuthFetch.js

import { useContext, useCallback } from 'react'; // 1. IMPORTA useCallback
import { AuthContext } from '../context/AuthContext';

export const useAuthFetch = () => {
  const { token, logout } = useContext(AuthContext);

  // 2. ENVUELVE TODA LA FUNCIÓN EN useCallback
  const authFetch = useCallback(async (url, options = {}) => {
    // El cuerpo de la función no cambia
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
  }, [token, logout]); // 3. AÑADE LAS DEPENDENCIAS DEL HOOK

  return authFetch;
};