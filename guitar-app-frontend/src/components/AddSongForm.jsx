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
    setError('');
    setSuccess('');

    // Verificación extra en el frontend antes de enviar
    if (!url || !url.includes('cifraclub.com')) {
      setError('Por favor, introduce una URL válida de Cifra Club.');
      return;
    }

    setIsLoading(true);

    try {
      const payload = { url: url }; // Creamos el objeto explícitamente

      const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/scrape`, {
        method: 'POST',
        body: JSON.stringify(payload), // Enviamos el objeto
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Usamos el mensaje de error del backend si existe
        throw new Error(responseData.error || 'Algo salió mal al añadir la canción.');
      }
      
      onSongAdded(responseData);
      setSuccess(`¡"${responseData.title}" ha sido añadida!`);
      setUrl(''); // Limpia el input tras el éxito
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