// src/components/FilterControls.jsx
import React from 'react';

function FilterControls({
  searchTerm,
  setSearchTerm,
  artists,
  selectedArtist,
  setSelectedArtist,
}) {
  return (
    <div className="filter-controls">
      {/* Input para el buscador */}
      <input
        type="text"
        placeholder="Buscar por título..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-input"
      />

      {/* Menú desplegable para el filtro por artista */}
      <select
        value={selectedArtist}
        onChange={(e) => setSelectedArtist(e.target.value)}
        className="artist-select"
      >
        <option value="">Todos los artistas</option>
        {artists.map((artist) => (
          <option key={artist} value={artist}>
            {artist}
          </option>
        ))}
      </select>
    </div>
  );
}

export default FilterControls;