// src/components/SongView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { transposeSongContent } from '../utils/transpose';

// El prop 'song' ahora solo se usa para obtener el ID inicial.
function SongView({ song, onBack, onSongUpdated }) {
  // --- Estados ---
  // ¡ESTADO CLAVE! Aquí guardaremos la canción completa y personalizada del backend.
  const [loadedSong, setLoadedSong] = useState(null);
  const [error, setError] = useState('');
  
  const [transposition, setTransposition] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(50);
  const [fontSize, setFontSize] = useState(1);

  const authFetch = useAuthFetch();

  // --- EFECTO PARA CARGAR LOS DATOS DE LA CANCIÓN ---
  // Se ejecuta cada vez que el ID de la canción cambia.
  useEffect(() => {
    const fetchSongDetails = async () => {
      try {
        const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/songs/${song.id}`);
        if (!response.ok) {
          throw new Error('No se pudo cargar la canción.');
        }
        const data = await response.json();
        setLoadedSong(data); // Guardamos la canción completa
        setEditedContent(data.content); // Sincronizamos el editor
        setTransposition(data.transposition || 0); // Sincronizamos la afinación
      } catch (err) {
        setError(err.message);
      }
    };
    fetchSongDetails();
  }, [song.id, authFetch]);

  // --- Handlers ---
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/songs/${loadedSong.id}`, {
        method: 'PUT',
        body: JSON.stringify({ content: editedContent, transposition: transposition }),
      });
      const updatedSongData = await response.json();
      if (!response.ok) throw new Error(updatedSongData.error || 'No se pudo guardar.');
      
      setLoadedSong(updatedSongData); // Actualizamos el estado local
      onSongUpdated(updatedSongData); // Notificamos al padre para que actualice la lista principal
      setIsEditing(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Restauramos desde la última versión cargada
    setEditedContent(loadedSong.content);
    setTransposition(loadedSong.transposition || 0);
  };

  const handleResetTranspose = () => setTransposition(loadedSong.transposition || 0);

  // --- Renderizado ---
  if (error) return <div className="message error">{error}</div>;
  if (!loadedSong) return <div>Cargando canción...</div>; // Estado de carga

  const displayedContent = transposeSongContent(
    isEditing ? editedContent : loadedSong.content,
    transposition
  );

  return (
    <div className="song-view">
      {/* El resto del JSX (botones, controles, etc.) no cambia fundamentalmente, */}
      {/* solo necesita usar 'loadedSong' en lugar de 'song'. */}
      {/* Pega aquí el JSX completo de la respuesta anterior, que ya estaba bien diseñado. */}
       {!isEditing && (
        <button className="edit-button-corner" onClick={() => setIsEditing(true)}>
          ✏️
        </button>
      )}

      <div className="controls">
        <button onClick={isEditing ? handleCancel : onBack}>
          {isEditing ? 'Cancelar' : '← Volver'}
        </button>
        
        {isEditing ? (
          <div className="edit-controls">
            <button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Guardando...' : '💾 Guardar'}
            </button>
          </div>
        ) : (
          <>
            <div className="transpose-controls">
              <button onClick={() => setTransposition(t => t - 1)}>-</button>
              <span>Afinación: {transposition > 0 ? `+${transposition}` : transposition}</span>
              <button onClick={() => setTransposition(t => t + 1)}>+</button>
              {transposition !== (loadedSong.transposition || 0) && <button onClick={handleResetTranspose}>Reset</button>}
            </div>
            
            <div className="font-size-controls">
              <button onClick={() => setFontSize(f => Math.max(0.5, f - 0.1))}>A-</button>
              <span>Fuente: {Math.round(fontSize * 100)}%</span>
              <button onClick={() => setFontSize(f => f + 0.1)}>A+</button>
              {fontSize !== 1 && <button onClick={() => setFontSize(1)}>Reset</button>}
            </div>
            
            <div className="speed-control">
                <button className="play-pause" onClick={() => setIsPlaying(p => !p)}>{isPlaying ? 'Pausa' : '▶ Scroll'}</button>
                <label>Lento</label>
                <input type="range" min="1" max="100" value={speed} onChange={(e) => setSpeed(e.target.value)} />
                <label>Rápido</label>
            </div>
          </>
        )}
      </div>

      {isEditing ? (
        <textarea
          className="song-edit-textarea"
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
        />
      ) : (
        <pre
          className="song-content"
          style={{ fontSize: `${fontSize}rem` }}
          dangerouslySetInnerHTML={{ __html: displayedContent }}
        />
      )}
    </div>
  );
}

export default SongView;