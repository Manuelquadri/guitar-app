import { useCallback, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export const useAuthFetch = () => {
  const {
    token,
    logout,
    refreshAccessToken,
  } = useContext(AuthContext);

  return useCallback(async (url, options = {}) => {
    const headers = { ...options.headers };
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) headers.Authorization = `Bearer ${token}`;

    let response = await fetch(url, { ...options, headers });
    if (response.status !== 401) return response;

    const renewedToken = await refreshAccessToken();
    if (renewedToken) {
      response = await fetch(url, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${renewedToken}` },
      });
      if (response.status !== 401) return response;
    }

    logout();
    throw new Error(
      'La sesión online terminó. Puedes seguir usando la biblioteca descargada.'
    );
  }, [logout, refreshAccessToken, token]);
};
