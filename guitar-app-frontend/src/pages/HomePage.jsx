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
  }, [authFetch]);

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

  if (error) {
    return <div className="message error">{error}</div>;
  }

  if (selectedSong) {
    return <SongView song={selectedSong} onBack={() => setSelectedSong(null)} onSongUpdated={handleSongUpdated} />;
  }
  // --- FUNCIÓN DE PRUEBA ---
  const handleTestPost = async () => {
    console.log("Iniciando prueba de POST...");
    try {
      const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/test-post`, {
        method: 'POST',
        body: JSON.stringify({ message: "Hola Mundo" }),
      });
      
      const responseData = await response.json();

      if (!response.ok) {
        console.error("La prueba de POST falló. Respuesta del servidor:", responseData);
        alert(`Error en la prueba: ${responseData.error || response.statusText}`);
      } else {
        console.log("¡La prueba de POST tuvo éxito! Respuesta del servidor:", responseData);
        alert(`¡Éxito! El servidor recibió: ${JSON.stringify(responseData.received_data)}`);
      }
    } catch (err) {
      console.error("Error crítico en la prueba de POST:", err);
      alert(`Error de red o CORS en la prueba: ${err.message}`);
    }
  };
  return (
    <>
      {/* --- BOTÓN DE PRUEBA --- */}
      {/* Añade este botón en un lugar visible, como justo antes del formulario de añadir canción. */}
      <div style={{ padding: '1rem', backgroundColor: '#444', margin: '1rem 0', borderRadius: '8px' }}>
        <h3>Panel de Depuración</h3>
        <button onClick={handleTestPost} style={{ backgroundColor: '#f0ad4e', color: 'black' }}>
          Ejecutar Prueba de POST
        </button>
        <p>Abre la consola (F12) para ver los resultados detallados.</p>
      </div>

      <AddSongForm onSongAdded={handleSongAdded} />
      <FilterControls /* ... (tus props) ... */ />
      <SongList songs={filteredSongs} onSelectSong={setSelectedSong} />
    </>
  );
}

export default HomePage;