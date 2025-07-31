// src/hooks/useAuthFetch.js
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export const useAuthFetch = () => {
  const { token, logout } = useContext(AuthContext);

  const authFetch = async (url, options = {}) => {
    // Preparamos las cabeceras por defecto
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Si tenemos un token, lo añadimos a la cabecera 'Authorization'
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Realizamos la petición con las nuevas cabeceras
    const response = await fetch(url, { ...options, headers });

    // Si la respuesta es 401, el token puede haber expirado.
    // Cerramos la sesión del usuario para que vuelva a iniciarla.
    if (response.status === 401) {
      logout();
      throw new Error('Sesión expirada. Por favor, inicia sesión de nuevo.');
    }

    return response;
  };

  return authFetch;
};