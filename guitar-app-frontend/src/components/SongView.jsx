// src/components/SongView.jsx

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { transposeSongContent } from '../utils/transpose';
import { saveToCache, getFromCache } from '../utils/offlineStore';

function SongView({ song, onBack, onSongUpdated }) {
  // --- Estados y Refs ---
  const [loadedSong, setLoadedSong] = useState(null);
  const [error, setError] = useState('');
  const [offlineMessage, setOfflineMessage] = useState('');
  const [transposition, setTransposition] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(''); // Estado vacío o numérico
  const [fontSize, setFontSize] = useState(1);
  const authFetch = useAuthFetch();
  const scrollIntervalRef = useRef(null);
  const preRef = useRef(null);

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
        setSpeed(data.speed || 250);
        saveToCache(`song_${song.id}`, data); // Caché local para esta canción
      } catch (err) {
        const cached = getFromCache(`song_${song.id}`);
        if (cached) {
          setLoadedSong(cached);
          setEditedContent(cached.content);
          setTransposition(cached.transposition || 0);
          setSpeed(cached.speed || 250);
          setOfflineMessage('Modo Offline: Mostrando versión guardada en tu dispositivo.');
          setError(''); // Limpiamos el error fatal
        } else if (song && song.content) {
          // Fallback final: usar la información maestra que vino del HomePage
          setLoadedSong(song);
          setEditedContent(song.content);
          setTransposition(song.transposition || 0);
          setSpeed(song.speed || 250);
          setOfflineMessage('Modo Offline: Mostrando versión original guardada en caché general.');
          setError('');
        } else {
          setError(err.message);
        }
      }
    };
    fetchSongDetails();
  }, [song.id, authFetch]);

  // Efecto para controlar el motor del auto-scroll
  useEffect(() => {
    if (!isPlaying || isEditing) {
      clearInterval(scrollIntervalRef.current);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.error(err));
      }
      return;
    }

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
    }

    const currentSpeed = speed === '' ? 250 : Number(speed);
    scrollIntervalRef.current = setInterval(() => {
      window.scrollBy(0, 1);
    }, 501 - currentSpeed);

    return () => clearInterval(scrollIntervalRef.current);
  }, [isPlaying, isEditing, speed]);

  // Efecto para auto-ajustar el tamaño de fuente al ancho de la pantalla
  useLayoutEffect(() => {
    const adjustFontSize = () => {
      if (!preRef.current || isEditing) return;

      const originalFs = preRef.current.style.fontSize;
      preRef.current.style.fontSize = '1rem';

      const scrollWidth = preRef.current.scrollWidth;
      const clientWidth = preRef.current.clientWidth;

      if (scrollWidth > clientWidth && clientWidth > 0) {
        const ratio = clientWidth / scrollWidth;
        setFontSize(Number((ratio * 0.96).toFixed(2))); // 4% de margen
      }

      // Restauramos
      preRef.current.style.fontSize = originalFs;
    };

    adjustFontSize();

    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(adjustFontSize, 100);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [loadedSong, editedContent, transposition, isEditing]);

  // --- Handlers (Manejadores de eventos) ---

  const saveSong = async (newContent, newTransposition, newSpeed) => {
    if (!loadedSong) return;
    setIsSaving(true);
    try {
      const payload = { content: newContent, transposition: newTransposition };
      if (newSpeed !== undefined && newSpeed !== '') {
        payload.speed = newSpeed;
      }

      const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/songs/${loadedSong.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const updatedSongData = await response.json();
      if (!response.ok) {
        throw new Error(updatedSongData.error || 'No se pudo guardar la canción.');
      }
      setLoadedSong(updatedSongData);
      onSongUpdated(updatedSongData);
      saveToCache(`song_${loadedSong.id}`, updatedSongData); // Fix: sync cache!
      return updatedSongData;
    } catch (err) {
      console.error("Error en saveSong:", err);
      alert('Error guardando sincronización: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Efecto para Auto-Guardado de Transposición y Velocidad
  useEffect(() => {
    if (!loadedSong) return;

    const dbTrans = loadedSong.transposition || 0;
    const dbSpeed = loadedSong.speed || 250;
    const currentSpeed = speed === '' ? 250 : Number(speed);

    // Chequeamos si alguno de los dos valores difiere de lo que hay en base de datos
    if ((transposition !== dbTrans || currentSpeed !== dbSpeed) && !isEditing) {
      const timerId = setTimeout(() => {
        saveSong(loadedSong.content, transposition, currentSpeed);
      }, 1000);
      return () => clearTimeout(timerId);
    }
  }, [transposition, speed, loadedSong, isEditing]);

  const handleSave = async () => {
    const currentSpeed = speed === '' ? 250 : Number(speed);
    await saveSong(editedContent, transposition, currentSpeed);
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
    <div className={`song-view ${isPlaying ? 'playing' : ''}`}>
      {offlineMessage && <div className="message success" style={{ marginBottom: '1rem', backgroundColor: '#856404', color: '#fff3cd' }}>{offlineMessage}</div>}

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
              <input
                type="range"
                min="1"
                max="500"
                value={speed === '' ? 250 : speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              />
              <label>Rápido</label>
              <input
                type="number"
                className="speed-input-number"
                min="1"
                max="500"
                value={speed}
                onChange={(e) => {
                  let val = e.target.value;
                  if (val === '') {
                    setSpeed('');
                    return;
                  }
                  val = Number(val);
                  if (val > 500) val = 500;
                  setSpeed(val);
                }}
                onBlur={() => {
                  if (speed === '' || speed < 1) setSpeed(1);
                }}
              />
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
          ref={preRef}
          className="song-content"
          style={{ fontSize: `${fontSize}rem`, cursor: isPlaying ? 'pointer' : 'default' }}
          dangerouslySetInnerHTML={{ __html: displayedContent }}
          onClick={() => { if (isPlaying) setIsPlaying(false); }}
        />
      )}
    </div>
  );
}

export default SongView;