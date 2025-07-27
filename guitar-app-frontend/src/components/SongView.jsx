// src/components/SongView.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { transposeSongContent } from '../utils/transpose';

function SongView({ song, onBack }) {
  // --- Estados ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(50);
  const scrollIntervalRef = useRef(null);
  const [transposition, setTransposition] = useState(0);
  const [fontSize, setFontSize] = useState(1); // 1rem es el tamaño por defecto

  // --- Lógica y Efectos ---
  useEffect(() => {
    if (isPlaying) {
      scrollIntervalRef.current = setInterval(() => {
        window.scrollBy(0, 1);
      }, 101 - speed);
    }
    return () => clearInterval(scrollIntervalRef.current);
  }, [isPlaying, speed]);

  const displayedContent = useMemo(() => {
    return transposeSongContent(song.content, transposition);
  }, [song.content, transposition]);

  // --- Handlers (manejadores de eventos) ---
  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handleSpeedChange = (event) => setSpeed(event.target.value);

  const handleTransposeUp = () => setTransposition(prev => prev + 1);
  const handleTransposeDown = () => setTransposition(prev => prev - 1);
  const handleResetTranspose = () => setTransposition(0);

  const handleIncreaseFont = () => setFontSize(prev => prev + 0.1);
  const handleDecreaseFont = () => setFontSize(prev => Math.max(0.5, prev - 0.1));
  const handleResetFont = () => setFontSize(1);

  return (
    <div className="song-view">
      {/* ===== BARRA DE CONTROLES COMPLETA Y CORREGIDA ===== */}
      <div className="controls">
        <button onClick={onBack}>← Volver</button>
        
        {/* Controles de Transposición */}
        <div className="transpose-controls">
          <button onClick={handleTransposeDown}>-</button>
          <span>Afinación: {transposition > 0 ? `+${transposition}` : transposition}</span>
          <button onClick={handleTransposeUp}>+</button>
          {transposition !== 0 && <button onClick={handleResetTranspose}>Reset</button>}
        </div>
        
        {/* Controles de Tamaño de Fuente */}
        <div className="font-size-controls">
          <button onClick={handleDecreaseFont}>A-</button>
          <span>Fuente: {Math.round(fontSize * 100)}%</span>
          <button onClick={handleIncreaseFont}>A+</button>
          {fontSize !== 1 && <button onClick={handleResetFont}>Reset</button>}
        </div>
        
        {/* Controles de Auto-Scroll */}
        <div className="speed-control">
            <button className="play-pause" onClick={handlePlayPause}>{isPlaying ? 'Pausa' : '▶ Scroll'}</button>
            <label>Lento</label>
            <input type="range" min="1" max="100" value={speed} onChange={handleSpeedChange} />
            <label>Rápido</label>
        </div>
      </div>

      {/* Contenido de la canción */}
      <pre
        className="song-content"
        style={{ fontSize: `${fontSize}rem` }}
        dangerouslySetInnerHTML={{ __html: displayedContent }}
      />
    </div>
  );
}

export default SongView;