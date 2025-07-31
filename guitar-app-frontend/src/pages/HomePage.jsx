// src/pages/HomePage.jsx
import React, { useState, useEffect, useMemo, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import SongList from '../components/SongList';
import SongView from '../components/SongView';
import AddSongForm from '../components/AddSongForm';
import FilterControls from '../components/FilterControls';
import Navbar from '../components/Navbar'; // Crearemos este componente

// ¡IMPORTANTE! Crearemos un custom hook para simplificar las llamadas fetch
const useAuthFetch = () => {
  const { token } = useContext(AuthContext);
  
  return (url, options = {}) => {
    const headers = {
      ...options.headers,
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return authFetch(url, { ...options, headers });
  };
};

function HomePage() {
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
   const [error, setError] = useState(null); // Para manejar errores de carga
  // 3. Añade los nuevos estados para el filtrado
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArtist, setSelectedArtist] = useState('');
  const authFetch = useAuthFetch(); // Nuestro nuevo hook

   useEffect(() => {
    // Definimos la función para cargar las canciones desde la API
    async function fetchSongs() {
      try {
        // const response = await fetch(`${import.meta.env.VITE_API_URL}/api/songs`);
        const response = await fetch('https://guitar-app-backend.onrender.com/api/songs');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setSongs(data); // Guardamos las canciones en el estado
      } catch (e) {
        console.error("Error al cargar las canciones:", e);
        setError("No se pudieron cargar las canciones. ¿Está el servidor del backend funcionando?");
      }
    }

    fetchSongs(); // Llamamos a la función
  }, [authFetch]);

  const handleSongAdded = (newSong) => {
    // Evita añadir duplicados si la API devuelve una canción existente
    if (!songs.find(song => song.id === newSong.id)) {
      setSongs(prevSongs => [...prevSongs, newSong]);
    }
  };
  // 4. Lógica de filtrado con useMemo para máxima eficiencia
  const filteredSongs = useMemo(() => {
    let songsToFilter = [...songs];

    // Primero, filtramos por el artista seleccionado
    if (selectedArtist) {
      songsToFilter = songsToFilter.filter(
        (song) => song.artist === selectedArtist
      );
    }

    // Luego, filtramos por el término de búsqueda
    if (searchTerm) {
      songsToFilter = songsToFilter.filter((song) =>
        song.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return songsToFilter;
  }, [songs, searchTerm, selectedArtist]); // Se recalcula solo si estas dependencias cambian

  // 5. Obtenemos la lista única de artistas para el menú desplegable
  const artists = useMemo(() => {
    const uniqueArtists = [...new Set(songs.map((song) => song.artist))];
    return uniqueArtists.sort(); // Opcional: ordenar alfabéticamente
  }, [songs]);
  // FUNCIÓN PARA ACTUALIZAR UNA CANCIÓN EN LA LISTA
  const handleSongUpdated = (updatedSong) => {
      // Reemplazamos la canción vieja por la nueva en nuestro array de estado
      setSongs(prevSongs => 
        prevSongs.map(s => (s.id === updatedSong.id ? updatedSong : s))
      );
      // También actualizamos la canción seleccionada para que la vista se refresque
      setSelectedSong(updatedSong);
    };

  // Función para manejar la selección de una canción
  const handleSelectSong = (song) => {
    setSelectedSong(song);
  };

 // Función para volver a la lista
  const handleBackToList = () => {
    setSelectedSong(null);
  };

  // Si hay un error, lo mostramos
  if (error) {
    return <div className="error">{error}</div>;
  }

  if (selectedSong) {
    return <SongView song={selectedSong} onBack={() => setSelectedSong(null)} onSongUpdated={handleSongUpdated} />;
  }

  return (
    <div className="App">
      <header><h1>Fogonero</h1></header>
      <main>
        {!selectedSong ? (
          <>
            <AddSongForm onSongAdded={handleSongAdded} />
            {/* 6. Renderizamos los nuevos controles */}
            <FilterControls
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              artists={artists}
              selectedArtist={selectedArtist}
              setSelectedArtist={setSelectedArtist}
            />
            {/* 7. Pasamos la lista YA FILTRADA al componente SongList */}
            <SongList songs={filteredSongs} onSelectSong={handleSelectSong} />
          </>
        ) : (
          // ¡Pasamos la nueva función como prop a SongView!
          <SongView 
            song={selectedSong} 
            onBack={handleBackToList} 
            onSongUpdated={handleSongUpdated} 
          />
        )}
      </main>
    </div>
  );
}

export default App;