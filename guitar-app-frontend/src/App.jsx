// src/App.jsx
import { useState, useEffect, useMemo } from 'react';
import SongList from './components/SongList';
import SongView from './components/SongView';
import AddSongForm from './components/AddSongForm';
import FilterControls from './components/FilterControls';
import './App.css'; // Importaremos unos estilos básicos

function App() {
  const [songs, setSongs] = useState([]); // Para almacenar la lista de canciones
  const [selectedSong, setSelectedSong] = useState(null); // Para la canción elegida
  const [error, setError] = useState(null); // Para manejar errores de carga
  // 3. Añade los nuevos estados para el filtrado
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArtist, setSelectedArtist] = useState('');
  // Este efecto se ejecuta solo una vez, cuando el componente se carga por primera vez
  useEffect(() => {
    // Definimos la función para cargar las canciones desde la API
    async function fetchSongs() {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/songs`);
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
  }, []); // El array vacío [] significa que este efecto no se vuelve a ejecutar
  // 2. Crea una función para manejar la adición de una nueva canción
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

  // Renderizado condicional:
  // Si no hay una canción seleccionada, muestra la lista.
  // Si hay una canción seleccionada, muestra la vista de esa canción.
  return (
    <div className="App">
      <header><h1>Guitar App</h1></header>
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
          <SongView song={selectedSong} onBack={handleBackToList} />
        )}
      </main>
    </div>
  );
}

export default App;