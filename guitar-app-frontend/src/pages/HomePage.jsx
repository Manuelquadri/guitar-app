// src/pages/HomePage.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthFetch } from '../hooks/useAuthFetch';
import SongList from '../components/SongList';
import SongView from '../components/SongView';
import AddSongForm from '../components/AddSongForm';
import FilterControls from '../components/FilterControls';
import Navbar from '../components/Navbar'; // Asegúrate de que Navbar esté importado si lo usas en App.jsx

function HomePage() {
  const [songs, setSongs] = useState([]); // El estado inicial es un array vacío, lo cual es seguro.
  const [selectedSong, setSelectedSong] = useState(null);
  const [error, setError] = useState('');
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

      // ¡¡LA SOLUCIÓN ESTÁ AQUÍ!!
      // Verificamos si la respuesta de la API es realmente un array.
      if (Array.isArray(data)) {
        setSongs(data); // Solo actualizamos el estado si es un array.
      } else {
        // Si no es un array, algo está mal. No rompemos la app,
        // la dejamos con una lista vacía y mostramos un error.
        console.error("Error: La API no devolvió un array de canciones.", data);
        setSongs([]); // Importante para que .map() no falle.
        setError("La respuesta del servidor no tuvo el formato esperado.");
      }
    } catch (err) {
      setError(err.message);
      console.error(err);
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
    setSongs(prevSongs => 
      prevSongs.map(s => (s.id === updatedSong.id ? updatedSong : s))
    );
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