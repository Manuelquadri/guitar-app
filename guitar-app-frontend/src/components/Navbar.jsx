import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Navbar() {
  const { isLoggedIn, isOfflineSession, logout } = useContext(AuthContext);

  return (
    <nav className="navbar" aria-label="Navegación principal">
      <Link to="/" className="navbar-brand" aria-label="Fogonero, inicio">
        <span className="brand-mark" aria-hidden="true">F</span>
        <span>Fogonero</span>
      </Link>
      <div className="navbar-links">
        {isLoggedIn ? (
          <button type="button" onClick={logout} className="nav-button">
            Cerrar sesión
          </button>
        ) : isOfflineSession ? (
          <>
            <span className="offline-session-label">Offline</span>
            <Link to="/login" className="nav-link nav-link-accent">Iniciar sesión</Link>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Iniciar sesión</Link>
            <Link to="/register" className="nav-link nav-link-accent">Crear cuenta</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
