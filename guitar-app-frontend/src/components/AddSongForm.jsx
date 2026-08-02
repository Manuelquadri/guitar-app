import React, { useState } from 'react';
import { useAuthFetch } from '../hooks/useAuthFetch';

function AddSongForm({ onSongAdded, canImport, disabledMessage }) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const authFetch = useAuthFetch();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!url || !canImport) return;
    setIsLoading(true);

    try {
      const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/scrape`, {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || 'No se pudo añadir la canción.');
      }

      onSongAdded(responseData);
      setSuccess(`“${responseData.title}” ya está en tu cancionero.`);
      setUrl('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="add-song-form">
      <p>
        Pega el enlace de una cifra. Comprobaremos el título, artista y acordes antes
        de guardarla.
      </p>
      <form onSubmit={handleSubmit}>
        <label className="url-field">
          <span className="sr-only">URL de Cifra Club</span>
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.cifraclub.com/…"
            required
            disabled={isLoading || !canImport}
            inputMode="url"
          />
        </label>
        <button
          className="button button-primary"
          type="submit"
          disabled={isLoading || !canImport}
        >
          {isLoading ? 'Importando…' : 'Importar canción'}
        </button>
      </form>
      {!canImport && (
        <p className="form-hint">{disabledMessage}</p>
      )}
      {error && <p className="message error" role="alert">{error}</p>}
      {success && <p className="message success" role="status">{success}</p>}
    </div>
  );
}

export default AddSongForm;
