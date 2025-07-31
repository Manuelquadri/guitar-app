// src/pages/HomePage.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthFetch } from '../hooks/useAuthFetch';
import SongList from '../components/SongList';
import SongView from '../components/SongView';
import AddSongForm from '../components/AddSongForm';
import FilterControls from '../components/FilterControls';

function HomePage() {
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArtist, setSelectedArtist] = useState('');
  const authFetch = useAuthFetch();

  // Esta es la función que carga los datos.
  // La envolvemos en useCallback para que sea estable y no cambie en cada render.
  const fetchSongs = useCallback(async () => {
    try {
      const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/songs`);
      if (!response.ok) {
        throw new Error('No se pudo cargar la lista de canciones.');
      }
      const data = await response.json();
      setSongs(data);
    } catch (err) {
      setError(err.message);
      console.error(err);
    }
  }, [authFetch]); // Depende de authFetch, que también está memoizado.

  // Este useEffect ahora es seguro. Se ejecutará solo cuando fetchSongs cambie (casi nunca).
  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);


  const handleSongAdded = (newSong) => {
    if (!songs.find(song => song.id === newSong.id)) {
      setSongs(prevSongs => [...prevSongs, newSong]);
    }
  };

  const handleSongUpdated = (updatedSong) => {
    setSongs(prevSongs => 
      prevSongs.map(s => (s.id === updatedSong.id ? updatedSong : s))
    );
    setSelectedSong(updatedSong);
  };

  const filteredSongs = useMemo(() => {
    let songsToFilter = [...songs];
    if (selectedArtist) {
      songsToFilter = songsToFilter.filter(s => s.artist === selectedArtist);
    }
    if (searchTerm) {
      songsToFilter = songsToFilter.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return songsToFilter;
  }, [songs, searchTerm, selectedArtist]);

  const artists = useMemo(() => {
    return [...new Set(songs.map(song => song.artist))].sort();
  }, [songs]);

  // --- Renderizado ---
  if (error) {
    return <div className="message error">{error}</div>;
  }

  if (selectedSong) {
    return <SongView song={selectedSong} onBack={() => setSelectedSong(null)} onSongUpdated={handleSongUpdated} />;
  }

  return (
    <>
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