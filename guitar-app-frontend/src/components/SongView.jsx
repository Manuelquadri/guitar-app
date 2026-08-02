import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { transposeSongContent } from '../utils/transpose';
import {
  getPendingUpdates,
  getSong,
  markSongSynced,
  queueSongUpdate,
  saveSong as saveOfflineSong,
} from '../utils/offlineStore';

const DEFAULT_SCROLL_SPEED = 35;

const normalizeScrollSpeed = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return DEFAULT_SCROLL_SPEED;

  const migratedValue = numericValue > 100
    ? numericValue / 5
    : numericValue;
  return Math.round(Math.min(100, Math.max(1, migratedValue)));
};

const getPixelsPerSecond = (value) =>
  1.5 + 23.5 * Math.pow(normalizeScrollSpeed(value) / 100, 1.5);

const getSpeedLabel = (value) => {
  const normalized = normalizeScrollSpeed(value);
  if (normalized <= 20) return 'Muy lenta';
  if (normalized <= 45) return 'Lenta';
  if (normalized <= 70) return 'Media';
  return 'Rápida';
};

const sanitizeSongContent = (content) => {
  const documentFragment = new DOMParser().parseFromString(content || '', 'text/html');
  documentFragment.querySelectorAll('script, style, iframe, object').forEach((node) => node.remove());
  [...documentFragment.body.querySelectorAll('*')].reverse().forEach((node) => {
    if (node.tagName === 'B') {
      [...node.attributes].forEach((attribute) => node.removeAttribute(attribute.name));
    } else {
      node.replaceWith(...node.childNodes);
    }
  });
  return documentFragment.body.innerHTML;
};

function SongView({
  song,
  cacheScope,
  canSync,
  onBack,
  onSongUpdated,
}) {
  const [loadedSong, setLoadedSong] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [transposition, setTransposition] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(DEFAULT_SCROLL_SPEED);
  const [fontSize, setFontSize] = useState(1);
  const authFetch = useAuthFetch();
  const animationFrameRef = useRef(null);
  const lastFrameRef = useRef(null);
  const scrollRemainderRef = useRef(0);
  const initialSongRef = useRef(song);

  const applySong = useCallback((nextSong) => {
    setLoadedSong(nextSong);
    setEditedContent(nextSong.content || '');
    setTransposition(nextSong.transposition ?? 0);
    setSpeed(normalizeScrollSpeed(nextSong.speed));
  }, []);

  useEffect(() => {
    let active = true;

    const fetchSongDetails = async () => {
      const cached = await getSong(cacheScope, song.id).catch(() => null);
      const initialSong = initialSongRef.current;
      if (active && cached) {
        applySong(cached);
        setNotice('Canción abierta desde este dispositivo.');
      }

      if (!navigator.onLine || !canSync) {
        if (!cached && initialSong.content) applySong(initialSong);
        if (!cached && !initialSong.content) {
          setError('Esta canción no está descargada en el dispositivo.');
        }
        setNotice(
          canSync
            ? 'Modo sin conexión. Los cambios se guardarán para sincronizarlos después.'
            : 'Biblioteca offline. Los cambios se sincronizarán después de iniciar sesión.'
        );
        return;
      }

      try {
        const response = await authFetch(
          `${import.meta.env.VITE_API_URL}/api/songs/${initialSong.id}`
        );
        if (!response.ok) throw new Error('No se pudo cargar la canción.');
        const serverSong = await response.json();
        const pending = await getPendingUpdates(cacheScope);
        const pendingUpdate = pending.find((item) => item.songId === initialSong.id);
        const nextSong = pendingUpdate
          ? { ...serverSong, ...pendingUpdate.payload }
          : serverSong;

        if (active) {
          applySong(nextSong);
          setNotice(pendingUpdate ? 'Hay cambios pendientes de sincronización.' : '');
          setError('');
        }
        await saveOfflineSong(cacheScope, nextSong);
      } catch (requestError) {
        if (!cached && !initialSong.content) setError(requestError.message);
        if (cached || initialSong.content) {
          setNotice('El servidor no respondió. Estás usando la copia del dispositivo.');
        }
      }
    };

    fetchSongDetails();
    return () => {
      active = false;
    };
  }, [applySong, authFetch, cacheScope, canSync, song.id]);

  useEffect(() => {
    if (!isPlaying || isEditing) {
      cancelAnimationFrame(animationFrameRef.current);
      lastFrameRef.current = null;
      scrollRemainderRef.current = 0;
      return undefined;
    }

    const pixelsPerSecond = getPixelsPerSecond(speed);
    const tick = (timestamp) => {
      if (lastFrameRef.current !== null) {
        const elapsed = Math.min(timestamp - lastFrameRef.current, 100);
        const distance =
          scrollRemainderRef.current + pixelsPerSecond * elapsed / 1000;
        const wholePixels = Math.floor(distance);
        scrollRemainderRef.current = distance - wholePixels;

        if (wholePixels > 0) {
          window.scrollBy(0, wholePixels);
        }

        const maximumScroll =
          document.documentElement.scrollHeight - window.innerHeight;
        if (window.scrollY >= maximumScroll - 1) {
          setIsPlaying(false);
          return;
        }
      }
      lastFrameRef.current = timestamp;
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isEditing, isPlaying, speed]);

  const persistSong = useCallback(async (payload) => {
    if (!loadedSong) return null;

    const optimisticSong = { ...loadedSong, ...payload };
    setLoadedSong(optimisticSong);
    setEditedContent(optimisticSong.content);
    onSongUpdated(optimisticSong);
    await queueSongUpdate(cacheScope, optimisticSong, payload);

    if (!navigator.onLine || !canSync) {
      setNotice('Cambio guardado en el dispositivo. Se sincronizará al volver la conexión.');
      return optimisticSong;
    }

    setIsSaving(true);
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_API_URL}/api/songs/${loadedSong.id}`,
        { method: 'PUT', body: JSON.stringify(payload) }
      );
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || 'No se pudo sincronizar el cambio.');
      }

      await markSongSynced(cacheScope, responseData);
      setLoadedSong(responseData);
      setEditedContent(responseData.content);
      onSongUpdated(responseData);
      setNotice('');
      return responseData;
    } catch (requestError) {
      setNotice(`Cambio guardado localmente. Sincronización pendiente: ${requestError.message}`);
      return optimisticSong;
    } finally {
      setIsSaving(false);
    }
  }, [authFetch, cacheScope, canSync, loadedSong, onSongUpdated]);

  useEffect(() => {
    if (!loadedSong || isEditing) return undefined;
    const storedTransposition = loadedSong.transposition ?? 0;
    const storedSpeed = normalizeScrollSpeed(loadedSong.speed);
    const currentSpeed = normalizeScrollSpeed(speed);

    if (transposition === storedTransposition && currentSpeed === storedSpeed) {
      return undefined;
    }

    const timer = setTimeout(() => {
      persistSong({ transposition, speed: currentSpeed });
    }, 700);
    return () => clearTimeout(timer);
  }, [isEditing, loadedSong, persistSong, speed, transposition]);

  const handleSave = async () => {
    await persistSong({
      content: editedContent,
      transposition,
      speed: normalizeScrollSpeed(speed),
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (loadedSong) {
      setEditedContent(loadedSong.content);
      setTransposition(loadedSong.transposition ?? 0);
      setSpeed(normalizeScrollSpeed(loadedSong.speed));
    }
  };

  const togglePlaying = () => {
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    if (nextPlaying && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (!nextPlaying && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const displayedContent = useMemo(() => {
    if (!loadedSong) return '';
    const safeContent = sanitizeSongContent(
      isEditing ? editedContent : loadedSong.content
    );
    return transposeSongContent(safeContent, transposition);
  }, [editedContent, isEditing, loadedSong, transposition]);

  if (error) {
    return (
      <div className="empty-state">
        <h1>No pudimos abrir la canción</h1>
        <p>{error}</p>
        <button className="button button-primary" type="button" onClick={onBack}>
          Volver al cancionero
        </button>
      </div>
    );
  }

  if (!loadedSong) {
    return <div className="song-loading" aria-busy="true">Preparando acordes…</div>;
  }

  return (
    <article className={`song-view ${isPlaying ? 'playing' : ''}`}>
      <header className="song-view-header">
        <button className="back-button" type="button" onClick={onBack}>
          <span aria-hidden="true">←</span> Cancionero
        </button>
        <div>
          <p>{loadedSong.artist}</p>
          <h1>{loadedSong.title}</h1>
        </div>
        {!isEditing && (
          <button
            className="button button-secondary"
            type="button"
            onClick={() => setIsEditing(true)}
          >
            Editar
          </button>
        )}
      </header>

      {notice && <div className="status-banner compact" role="status">{notice}</div>}

      <div className="player-controls">
        {isEditing ? (
          <>
            <button className="button button-quiet" type="button" onClick={handleCancel}>
              Cancelar
            </button>
            <button
              className="button button-primary"
              type="button"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </>
        ) : (
          <>
            <div className="control-group" aria-label="Transposición">
              <span className="control-label">Tono</span>
              <button
                type="button"
                aria-label="Bajar medio tono"
                disabled={isSaving}
                onClick={() => setTransposition((value) => value - 1)}
              >
                −
              </button>
              <output>{transposition > 0 ? `+${transposition}` : transposition}</output>
              <button
                type="button"
                aria-label="Subir medio tono"
                disabled={isSaving}
                onClick={() => setTransposition((value) => value + 1)}
              >
                +
              </button>
              {transposition !== 0 && (
                <button className="text-control" type="button" onClick={() => setTransposition(0)}>
                  Original
                </button>
              )}
            </div>

            <div className="control-group" aria-label="Tamaño de letra">
              <span className="control-label">Texto</span>
              <button
                type="button"
                aria-label="Reducir texto"
                onClick={() => setFontSize((value) => Math.max(0.65, value - 0.1))}
              >
                A−
              </button>
              <button
                type="button"
                aria-label="Aumentar texto"
                onClick={() => setFontSize((value) => Math.min(1.8, value + 0.1))}
              >
                A+
              </button>
            </div>

            <div className="scroll-control">
              <button
                className={`button play-button ${isPlaying ? 'is-playing' : ''}`}
                type="button"
                onClick={togglePlaying}
              >
                {isPlaying ? 'Pausar' : 'Auto-scroll'}
              </button>
              <label>
                <span className="scroll-speed-label">{getSpeedLabel(speed)}</span>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={speed}
                  disabled={isSaving}
                  aria-label="Velocidad del desplazamiento"
                  aria-valuetext={getSpeedLabel(speed)}
                  onChange={(event) => setSpeed(Number(event.target.value))}
                />
              </label>
            </div>
          </>
        )}
      </div>

      {isPlaying && (
        <button className="floating-pause" type="button" onClick={togglePlaying}>
          Pausar
        </button>
      )}

      {isEditing ? (
        <label className="editor-field">
          <span>Edita letra y acordes</span>
          <textarea
            className="song-edit-textarea"
            value={editedContent}
            onChange={(event) => setEditedContent(event.target.value)}
            spellCheck="false"
          />
        </label>
      ) : (
        <div className="song-sheet">
          <pre
            className="song-content"
            style={{ fontSize: `${fontSize}rem` }}
            dangerouslySetInnerHTML={{ __html: displayedContent }}
          />
        </div>
      )}
    </article>
  );
}

export default SongView;
