// src/hooks/useAuthFetch.js

import { useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';

export const useAuthFetch = () => {
  const { token, logout } = useContext(AuthContext);

  const authFetch = useCallback(async (url, options = {}) => {
    // Copiamos las cabeceras que nos pasa el componente
    const headers = { ...options.headers };

    // Añadimos el token de autorización si existe
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