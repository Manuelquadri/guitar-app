// src/components/SongView.jsx
import React, { useState, useEffect } from 'react';
import { transposeSongContent } from '../utils/transpose';

function SongView({ song, onBack, onSongUpdated }) {
  // --- Estados ---
  const [transposition, setTransposition] = useState(song.transposition || 0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(song.content);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(50);
  const [fontSize, setFontSize] = useState(1);

  // --- Lógica y Efectos ---
  const scrollIntervalRef = React.useRef(null);
  useEffect(() => {
    if (isPlaying) {
      scrollIntervalRef.current = setInterval(() => window.scrollBy(0, 1), 101 - speed);
    }
    return () => clearInterval(scrollIntervalRef.current);
  }, [isPlaying, speed]);
  useEffect(() => {
    if (isEditing) {
      setEditedContent(song.content);
      setTransposition(song.transposition || 0);
    }
  }, [isEditing, song]);
  
  //Esta es la vista previa que se actualiza en tiempo real
  const livePreviewContent = transposeSongContent(editedContent, transposition);

  // Este efecto se asegura de que al entrar o salir del modo edición,
 
  const displayedContent = transposeSongContent(
    isEditing ? editedContent : song.content,
    transposition
  );


  // --- Handlers ---
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/songs/${song.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editedContent, transposition: transposition }),
      });
      if (!response.ok) throw new Error('No se pudo guardar la canción.');
      const updatedSong = await response.json();
      onSongUpdated(updatedSong);
      setIsEditing(false);
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar la canción.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTransposition(song.transposition || 0); // Restaura la afinación original
    setEditedContent(song.content); // Restaura el texto original
  };

  const handleResetTranspose = () => setTransposition(song.transposition || 0);

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
        
        {isEditing && (
          <div className="edit-controls">
            <button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Guardando...' : '💾 Guardar'}
            </button>
          </div>
        )}

        {/* ¡CRÍTICO! Los controles de afinación ahora están fuera del bloque condicional */}
        <div className="transpose-controls">
          <button onClick={() => setTransposition(t => t - 1)}>-</button>
          <span>Afinación: {transposition > 0 ? `+${transposition}` : transposition}</span>
          <button onClick={() => setTransposition(t => t + 1)}>+</button>
          {/* El botón de reset se muestra si la afinación actual es diferente a la guardada */}
          {transposition !== (song.transposition || 0) && <button onClick={handleResetTranspose}>Reset</button>}
        </div>
        
        {/* Los controles de fuente y scroll solo aparecen en modo vista */}
        {!isEditing && (
          <>
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
        // --- NUEVA ESTRUCTURA DEL MODO EDICIÓN ---
        <div className="edit-container">
          <div className="preview-section">
            <h3>Vista Previa</h3>
            <pre
              className="song-content preview"
              dangerouslySetInnerHTML={{ __html: livePreviewContent }}
            />
          </div>
          <div className="editor-section">
            <h3>Editor</h3>
            <textarea
              className="song-edit-textarea"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
            />
          </div>
        </div>
      ) : (
        // MODO VISTA (sin cambios)
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