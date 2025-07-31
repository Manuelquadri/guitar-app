// src/pages/LoginPage.jsx

import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext'; // Asegúrate de que la ruta de importación sea correcta

function LoginPage() {
  // --- Estados del componente ---
  // Guardan lo que el usuario escribe en los inputs
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // Guarda cualquier mensaje de error que venga de la API
  const [error, setError] = useState('');
  // Para mostrar un feedback mientras se hace la petición
  const [isLoading, setIsLoading] = useState(false);

  // --- Hooks ---
  // Obtenemos la función 'login' de nuestro contexto de autenticación
  const { login } = useContext(AuthContext);
  // El hook 'useNavigate' nos permite redirigir al usuario a otra página
  const navigate = useNavigate();

  // --- Manejador del evento de envío del formulario ---
  const handleSubmit = async (event) => {
    event.preventDefault(); // Previene que la página se recargue
    
    // Reseteamos el estado antes de empezar
    setError('');
    setIsLoading(true);

    try {
      // Hacemos la petición a nuestro endpoint de login en el backend
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      // Obtenemos la respuesta en formato JSON
      const data = await response.json();

      // Si la respuesta no fue exitosa (ej. 401 Unauthorized), lanzamos un error
      if (!response.ok) {
        // Usamos el mensaje del backend si existe, o uno genérico
        throw new Error(data.msg || 'Error al iniciar sesión. Verifica tus credenciales.');
      }
      
      // Si todo fue bien, el 'data' contiene el 'access_token'
      // Llamamos a nuestra función 'login' del contexto para guardar el token
      login(data.access_token);
      
      // Redirigimos al usuario a la página principal de la aplicación
      navigate('/'); 

    } catch (err) {
      // Si algo falló, guardamos el mensaje de error para mostrarlo al usuario
      setError(err.message);
    } finally {
      // Haya éxito o no, dejamos de mostrar el estado de "cargando"
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <h2>Iniciar Sesión</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Nombre de usuario"
          required
          disabled={isLoading} // Deshabilitamos el input mientras carga
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          required
          disabled={isLoading} // Deshabilitamos el input mientras carga
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      {/* Mostramos el mensaje de error si existe */}
      {error && <p className="message error">{error}</p>}
      <p>
        ¿No tienes una cuenta? <Link to="/register">Regístrate aquí</Link>
      </p>
    </div>
  );
}

export default LoginPage;


