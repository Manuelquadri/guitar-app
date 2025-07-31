// src/components/Navbar.jsx
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Navbar() {
  const { isLoggedIn, logout } = useContext(AuthContext);

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">🔥 Guitar App</Link>
      <div className="navbar-links">
        {isLoggedIn ? (
          <button onClick={logout} className="nav-button">Cerrar Sesión</button>
        ) : (
          <>
            <Link to="/login" className="nav-link">Iniciar Sesión</Link>
            <Link to="/register" className="nav-link">Registrarse</Link>
          </>
        )}
      </div>
    </nav>
  );
}
export default Navbar;