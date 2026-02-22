// src/pages/HomePage.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthFetch } from '../hooks/useAuthFetch';
import SongList from '../components/SongList';
import SongView from '../components/SongView';
import AddSongForm from '../components/AddSongForm';
import FilterControls from '../components/FilterControls';
import Navbar from '../components/Navbar'; // Asegúrate de que Navbar esté importado si lo usas en App.jsx
import { saveToCache, getFromCache } from '../utils/offlineStore';

function HomePage() {
  const [songs, setSongs] = useState([]); // El estado inicial es un array vacío, lo cual es seguro.
  const [selectedSong, setSelectedSong] = useState(null);
  const [error, setError] = useState('');
  const [offlineMessage, setOfflineMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArtist, setSelectedArtist] = useState('');
  const authFetch = useAuthFetch();

  const fetchSongs = useCallback(async () => {
    try {
      const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/songs`);
      if (!response.ok) {
        throw new Error('No se pudo cargar la lista de canciones.');
      }
      const data = await response.json();

      if (Array.isArray(data)) {
        setSongs(data);
        saveToCache('cached_songs', data); // Guardamos la caché
      } else {
        console.error("Error: La API no devolvió un array de canciones.", data);
        setSongs([]);
        setError("La respuesta del servidor no tuvo el formato esperado.");
      }
    } catch (err) {
      // Intento offline fallback
      const cached = getFromCache('cached_songs');
      if (cached && Array.isArray(cached)) {
        setSongs(cached);
        setOfflineMessage('Modo Offline: Usando caché local.');
        setError(''); // Limpiamos error para que se muestre la lista
      } else {
        setError('Error de conexión y no hay caché local disponible.');
      }
    }
  }, [authFetch]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  const handleSongAdded = (newSong) => {
    // Añadimos la nueva canción a la lista existente
    setSongs(prevSongs => [...prevSongs, newSong]);
  };

  const handleSongUpdated = (updatedSong) => {
    setSongs(prevSongs => {
      const newSongs = prevSongs.map(s => (s.id === updatedSong.id ? updatedSong : s));
      saveToCache('cached_songs', newSongs); // <-- Sincronizar cache maestro
      return newSongs;
    });
    setSelectedSong(updatedSong);
  };

  const filteredSongs = useMemo(() => {
    return songs.filter(s =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedArtist ? s.artist === selectedArtist : true)
    );
  }, [songs, searchTerm, selectedArtist]);

  const artists = useMemo(() => {
    return [...new Set(songs.map(song => song.artist))].sort();
  }, [songs]); // Esto ahora es seguro porque 'songs' siempre será un array.

  if (error) {
    return <div className="message error">{error}</div>;
  }

  // Mover Navbar aquí si no está en App.jsx
  // <Navbar /> 

  if (selectedSong) {
    return <SongView song={selectedSong} onBack={() => setSelectedSong(null)} onSongUpdated={handleSongUpdated} />;
  }

  return (
    <>
      {offlineMessage && <div className="message success" style={{ marginBottom: '1rem', backgroundColor: '#856404', color: '#fff3cd' }}>{offlineMessage}</div>}
      <AddSongForm onSongAdded={handleSongAdded} />
      <FilterControls
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        artists={artists}
        selectedArtist={selectedArtist}
        setSelectedArtist={setSelectedArtist}
      />
      <SongList songs={filteredSongs} onSelectSong={setSelectedSong} />
    </>
  );
}

export default HomePage;