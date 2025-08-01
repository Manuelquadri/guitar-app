// src/components/AddSongForm.jsx
import React, { useState } from 'react';
import { useAuthFetch } from '../hooks/useAuthFetch';

function AddSongForm({ onSongAdded }) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const authFetch = useAuthFetch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!url) {
      setError('Por favor, introduce una URL.');
      return;
    }
    setIsLoading(true);

    try {
      // ¡ESTA ES LA LÍNEA CLAVE! Enviamos un objeto JSON.
      const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/scrape`, {
        method: 'POST',
        // No necesitamos 'headers' aquí, el hook se encarga.
        // El cuerpo es un STRING que representa un objeto JSON.
        body: JSON.stringify({ url: url }),
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || 'Algo salió mal al añadir la canción.');
      }
      
      onSongAdded(responseData);
      setSuccess(`¡"${responseData.title}" ha sido añadida!`);
      setUrl('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="add-song-form">
      <h3>Añadir nueva canción desde Cifra Club</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Pega la URL aquí..."
          required
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Añadiendo...' : 'Añadir Canción'}
        </button>
      </form>
      {error && <p className="message error">{error}</p>}
      {success && <p className="message success">{success}</p>}
    </div>
  );
}

export default AddSongForm;