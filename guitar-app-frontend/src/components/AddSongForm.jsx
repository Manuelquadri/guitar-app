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
    if (!url.includes('cifraclub.com')) {
        setError('Por favor, introduce una URL válida de Cifra Club.');
        return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authFetch('https://guitar-app-backend.onrender.com/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const newSong = await response.json();

      if (!response.ok) {
        throw new Error(newSong.error || 'Algo salió mal.');
      }
      
      onSongAdded(newSong); // Llama a la función del padre para actualizar la lista
      setSuccess(`¡"${newSong.title}" ha sido añadida!`);
      setUrl(''); // Limpia el input
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