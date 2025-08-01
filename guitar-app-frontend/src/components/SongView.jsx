// src/components/SongView.jsx

import React, { useState, useEffect, useRef } from 'react'; // 1. ASEGÚRATE DE IMPORTAR useRef
import { useAuthFetch } from '../hooks/useAuthFetch';
import { transposeSongContent } from '../utils/transpose';

function SongView({ song, onBack, onSongUpdated }) {
  // --- Estados y Refs ---
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

  // 2. ¡AÑADIMOS DE VUELTA EL useRef PARA EL SCROLL!
  const scrollIntervalRef = useRef(null);

  // --- Efectos ---
  // Efecto para cargar los datos de la canción (sin cambios)
  useEffect(() => {
    const fetchSongDetails = async () => {
      try {
        const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/songs/${song.id}`);
        if (!response.ok) throw new Error('No se pudo cargar la canción.');
        const data = await response.json();
        setLoadedSong(data);
        setEditedContent(data.content);
        setTransposition(data.transposition || 0);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchSongDetails();
  }, [song.id, authFetch]);

  // 3. ¡AÑADIMOS DE VUELTA EL useEffect PARA EL MOTOR DEL SCROLL!
  useEffect(() => {
    // Si no estamos en modo vista o no está sonando, nos aseguramos de que no haya scroll.
    if (!isPlaying || isEditing) {
      clearInterval(scrollIntervalRef.current);
      return;
    }
    
    // Si está sonando y en modo vista, iniciamos el intervalo.
    scrollIntervalRef.current = setInterval(() => {
      window.scrollBy(0, 1);
    }, 101 - speed); // Invertimos el valor para que el slider sea intuitivo

    // La función de limpieza se ejecuta cuando el componente se desmonta o las dependencias cambian.
    return () => clearInterval(scrollIntervalRef.current);
  }, [isPlaying, isEditing, speed]); // Depende de estos tres estados


  // --- Handlers (sin cambios) ---
  const handleSave = async () => { /* ... Tu código de guardado ... */ };
  const handleCancel = () => { /* ... Tu código de cancelar ... */ };
  const handleResetTranspose = () => setTransposition(loadedSong.transposition || 0);


  // --- Renderizado ---
  if (error) return <div className="message error">{error}</div>;
  if (!loadedSong) return <div>Cargando canción...</div>;

  const displayedContent = transposeSongContent(
    isEditing ? editedContent : loadedSong.content,
    transposition
  );

  return (
    <div className="song-view">
      {/* El JSX de los controles y el contenido no necesita cambiar. */}
      {/* Ya estaba correctamente diseñado en la respuesta anterior. */}
      {/* Pega aquí el JSX completo de la respuesta anterior, que ya estaba bien. */}

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