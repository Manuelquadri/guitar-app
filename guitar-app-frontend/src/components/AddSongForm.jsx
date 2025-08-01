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
    if (!url) { return; }
    setIsLoading(true);

    try {
      const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/scrape`, {
        method: 'POST',
        body: JSON.stringify({ url: url }),
      });

      const responseData = await response.json();
      if (!response.ok) {
        // ¡ESTO ES CLAVE! Ahora mostramos el error del backend.
        throw new Error(responseData.error || 'Ocurrió un error desconocido.');
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
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Pega la URL aquí..." required />
        <button type="submit" disabled={isLoading}>{isLoading ? 'Añadiendo...' : 'Añadir Canción'}</button>
      </form>
      {error && <p className="message error">{error}</p>}
      {success && <p className="message success">{success}</p>}
    </div>
  );
}

export default AddSongForm;