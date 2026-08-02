import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useAuthFetch } from '../hooks/useAuthFetch';
import SongList from '../components/SongList';
import SongView from '../components/SongView';
import AddSongForm from '../components/AddSongForm';
import FilterControls from '../components/FilterControls';
import {
  getCatalog,
  getLibraryStatus,
  getPendingUpdates,
  markSongSynced,
  saveCatalog,
  saveLibrary,
} from '../utils/offlineStore';

function HomePage() {
  const {
    token,
    cacheScope,
    isOfflineSession,
    registerOfflineLibrary,
  } = useContext(AuthContext);
  const authFetch = useAuthFetch();
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDownloading, setIsDownloading] = useState(false);
  const [libraryStatus, setLibraryStatus] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArtist, setSelectedArtist] = useState('');

  const refreshLibraryStatus = useCallback(async () => {
    try {
      setLibraryStatus(await getLibraryStatus(cacheScope));
    } catch {
      setLibraryStatus(null);
    }
  }, [cacheScope]);

  const fetchSongs = useCallback(async ({ background = false } = {}) => {
    if (isOfflineSession) {
      setIsLoading(false);
      return;
    }
    if (!background) setIsLoading(true);

    try {
      const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/songs`);
      if (!response.ok) throw new Error('No se pudo cargar el catálogo.');
      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('El servidor devolvió un formato inesperado.');
      }

      setSongs(data);
      setError('');
      if (navigator.onLine) setNotice('');
      await saveCatalog(cacheScope, data);
    } catch (requestError) {
      const cached = await getCatalog(cacheScope).catch(() => null);
      if (cached?.songs?.length) {
        setSongs(cached.songs);
        setNotice('Estás viendo la biblioteca guardada en este dispositivo.');
        setError('');
      } else {
        setError(requestError.message || 'No hay conexión ni canciones descargadas.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [authFetch, cacheScope, isOfflineSession]);

  const syncPendingChanges = useCallback(async () => {
    if (!navigator.onLine || isOfflineSession) return;

    const pending = await getPendingUpdates(cacheScope).catch(() => []);
    for (const update of pending) {
      try {
        const response = await authFetch(
          `${import.meta.env.VITE_API_URL}/api/songs/${update.songId}`,
          { method: 'PUT', body: JSON.stringify(update.payload) }
        );
        if (!response.ok) continue;
        await markSongSynced(cacheScope, await response.json());
      } catch {
        return;
      }
    }

    if (pending.length) {
      setNotice('Tus cambios pendientes ya se sincronizaron.');
    }
  }, [authFetch, cacheScope, isOfflineSession]);

  useEffect(() => {
    let active = true;

    const loadCachedThenRefresh = async () => {
      const cached = await getCatalog(cacheScope).catch(() => null);
      if (active && cached?.songs?.length) {
        setSongs(cached.songs);
        setIsLoading(false);
        setNotice(
          isOfflineSession
            ? 'Biblioteca offline abierta sin iniciar sesión.'
            : 'Biblioteca local lista. Buscando cambios…'
        );
      }
      if (active && !isOfflineSession) {
        await fetchSongs({ background: Boolean(cached?.songs?.length) });
      }
    };

    loadCachedThenRefresh();
    refreshLibraryStatus();

    return () => {
      active = false;
    };
  }, [cacheScope, fetchSongs, isOfflineSession, refreshLibraryStatus]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (isOfflineSession) {
        setNotice('Hay conexión. Inicia sesión cuando quieras sincronizar tus cambios.');
        return;
      }
      setNotice('Conexión recuperada. Sincronizando…');
      syncPendingChanges().then(() => fetchSongs({ background: true }));
    };
    const handleOffline = () => {
      setIsOnline(false);
      setNotice('Sin conexión. Fogonero seguirá usando tus canciones descargadas.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchSongs, isOfflineSession, syncPendingChanges]);

  useEffect(() => {
    if (token && navigator.onLine) {
      syncPendingChanges();
    }
  }, [syncPendingChanges, token]);

  const handleDownloadLibrary = async () => {
    setIsDownloading(true);
    setError('');
    setNotice('Preparando la biblioteca para usarla sin conexión…');

    try {
      const response = await authFetch(
        `${import.meta.env.VITE_API_URL}/api/songs/offline`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo descargar la biblioteca.');
      }
      if (!Array.isArray(data)) {
        throw new Error('La descarga no tuvo el formato esperado.');
      }

      await saveLibrary(cacheScope, data);
      registerOfflineLibrary(cacheScope);
      setSongs(data.map(({ id, title, artist }) => ({ id, title, artist })));
      await refreshLibraryStatus();
      setNotice(`${data.length} canciones quedaron disponibles sin conexión.`);
    } catch (downloadError) {
      setError(downloadError.message);
      setNotice('');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSongAdded = (newSong) => {
    setSongs((previousSongs) => {
      const nextSongs = [...previousSongs, newSong];
      saveCatalog(cacheScope, nextSongs).catch(() => {});
      return nextSongs;
    });
  };

  const handleSongUpdated = (updatedSong) => {
    setSongs((previousSongs) => {
      const nextSongs = previousSongs.map((song) =>
        song.id === updatedSong.id
          ? { id: updatedSong.id, title: updatedSong.title, artist: updatedSong.artist }
          : song
      );
      saveCatalog(cacheScope, nextSongs).catch(() => {});
      return nextSongs;
    });
    setSelectedSong((current) => current ? { ...current, ...updatedSong } : current);
  };

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es');
  const filteredSongs = useMemo(
    () => songs.filter((song) => (
      (!normalizedSearch
        || song.title.toLocaleLowerCase('es').includes(normalizedSearch)
        || song.artist.toLocaleLowerCase('es').includes(normalizedSearch))
      && (!selectedArtist || song.artist === selectedArtist)
    )),
    [normalizedSearch, selectedArtist, songs]
  );

  const artists = useMemo(
    () => [...new Set(songs.map((song) => song.artist))].sort((a, b) =>
      a.localeCompare(b, 'es')
    ),
    [songs]
  );

  if (selectedSong) {
    return (
      <SongView
        song={selectedSong}
        cacheScope={cacheScope}
        canSync={Boolean(token) && !isOfflineSession}
        onBack={() => setSelectedSong(null)}
        onSongUpdated={handleSongUpdated}
      />
    );
  }

  return (
    <div className="home-page">
      <section className="library-hero" aria-labelledby="library-title">
        <div>
          <p className="eyebrow">Tu cancionero</p>
          <h1 id="library-title">¿Qué tocamos hoy?</h1>
          <p className="hero-copy">
            Acordes listos para ensayar, incluso cuando el servidor no acompaña.
          </p>
        </div>
        <div className="library-count" aria-label={`${songs.length} canciones`}>
          <strong>{songs.length}</strong>
          <span>canciones</span>
        </div>
      </section>

      <section className="offline-card" aria-label="Biblioteca sin conexión">
        <div className="offline-card-copy">
          <span className={`connection-dot ${isOnline ? 'is-online' : ''}`} />
          <div>
            <strong>
              {isOfflineSession
                ? 'Biblioteca offline'
                : isOnline
                  ? 'Con conexión'
                  : 'Modo sin conexión'}
            </strong>
            <p>
              {libraryStatus
                ? `${libraryStatus.count} canciones descargadas · ${new Date(libraryStatus.downloadedAt).toLocaleDateString('es-AR')}`
                : 'Descarga todo una vez y llévalo en el móvil.'}
            </p>
          </div>
        </div>
        <button
          className="button button-primary download-button"
          type="button"
          onClick={handleDownloadLibrary}
          disabled={isDownloading || !isOnline || isOfflineSession}
        >
          {isDownloading
            ? 'Descargando…'
            : libraryStatus
              ? 'Actualizar descarga'
              : 'Descargar biblioteca'}
        </button>
      </section>

      {notice && <div className="status-banner" role="status">{notice}</div>}
      {error && <div className="message error" role="alert">{error}</div>}

      {isOfflineSession && (
        <div className="offline-session-banner" role="status">
          <div>
            <strong>Entraste sin conexión</strong>
            <span>Puedes tocar y editar lo descargado. Inicia sesión para sincronizar.</span>
          </div>
          <Link className="button button-secondary" to="/login">Iniciar sesión</Link>
        </div>
      )}

      <details className="add-song-panel">
        <summary>Añadir una canción desde Cifra Club</summary>
        <AddSongForm
          onSongAdded={handleSongAdded}
          canImport={isOnline && !isOfflineSession}
          disabledMessage={
            isOfflineSession
              ? 'Inicia sesión para importar nuevas canciones.'
              : 'Necesitas conexión para importar nuevas canciones.'
          }
        />
      </details>

      <FilterControls
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        artists={artists}
        selectedArtist={selectedArtist}
        setSelectedArtist={setSelectedArtist}
      />
      <SongList
        songs={filteredSongs}
        isLoading={isLoading}
        hasFilters={Boolean(searchTerm || selectedArtist)}
        onSelectSong={setSelectedSong}
      />
    </div>
  );
}

export default HomePage;
