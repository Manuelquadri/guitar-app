// src/components/SongView.jsx

import React, { useState, useEffect, useRef } from 'react';
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
  const scrollIntervalRef = useRef(null);

  // --- Efectos ---
  // Efecto para cargar los datos completos y personalizados de la canción
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

  // Efecto para controlar el motor del auto-scroll
  useEffect(() => {
    if (!isPlaying || isEditing) {
      clearInterval(scrollIntervalRef.current);
      return;
    }
    scrollIntervalRef.current = setInterval(() => {
      window.scrollBy(0, 1);
    }, 101 - speed);
    return () => clearInterval(scrollIntervalRef.current);
  }, [isPlaying, isEditing, speed]);

  // --- Handlers (Manejadores de eventos) ---

  const saveSong = async (newContent, newTransposition) => {
    if (!loadedSong) return;
    setIsSaving(true);
    try {
      const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/songs/${loadedSong.id}`, {
        method: 'PUT',
        body: JSON.stringify({ content: newContent, transposition: newTransposition }),
      });
      const updatedSongData = await response.json();
      if (!response.ok) {
        throw new Error(updatedSongData.error || 'No se pudo guardar la canción.');
      }
      setLoadedSong(updatedSongData);
      onSongUpdated(updatedSongData);
      return updatedSongData;
    } catch (err) {
      console.error(err);
      if (isEditing) alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Efecto para Auto-Guardado de Transposición
  useEffect(() => {
    if (!loadedSong) return;
    if (transposition !== (loadedSong.transposition || 0) && !isEditing) {
      const timerId = setTimeout(() => {
        saveSong(loadedSong.content, transposition);
      }, 1000);
      return () => clearTimeout(timerId);
    }
  }, [transposition, loadedSong, isEditing]);

  const handleSave = async () => {
    await saveSong(editedContent, transposition);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (loadedSong) {
      setEditedContent(loadedSong.content);
      setTransposition(loadedSong.transposition || 0);
    }
  };

  const handleResetTranspose = () => setTransposition(loadedSong ? loadedSong.transposition || 0 : 0);

  // --- Renderizado ---
  if (error) return <div className="message error">{error}</div>;
  if (!loadedSong) return <div>Cargando canción...</div>;

  const displayedContent = transposeSongContent(
    isEditing ? editedContent : loadedSong.content,
    transposition
  );

  return (
    <div className="song-view">
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