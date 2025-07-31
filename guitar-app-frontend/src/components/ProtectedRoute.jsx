// src/components/ProtectedRoute.jsx
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn } = useContext(AuthContext);

  if (!isLoggedIn) {
    // Si el usuario no está logueado, lo redirigimos a la página de login
    return <Navigate to="/login" replace />;
  }

  // Si está logueado, le mostramos el componente que se supone que debía ver
  return children;
};

export default ProtectedRoute;