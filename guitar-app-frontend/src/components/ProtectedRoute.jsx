import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const {
    isLoggedIn,
    offlineAccessAvailable,
    offlineAccessReady,
  } = useContext(AuthContext);

  if (!offlineAccessReady) {
    return <div className="song-loading" aria-busy="true">Preparando biblioteca…</div>;
  }

  if (!isLoggedIn && !offlineAccessAvailable) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
