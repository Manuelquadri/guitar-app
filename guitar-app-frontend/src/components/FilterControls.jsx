import React from 'react';

function FilterControls({
  searchTerm,
  setSearchTerm,
  artists,
  selectedArtist,
  setSelectedArtist,
}) {
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedArtist('');
  };

  return (
    <div className="filter-controls" role="search">
      <label className="search-field">
        <span className="sr-only">Buscar por canción o artista</span>
        <span className="search-icon" aria-hidden="true">⌕</span>
        <input
          type="search"
          placeholder="Buscar canción o artista…"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="search-input"
        />
      </label>

      <label>
        <span className="sr-only">Filtrar por artista</span>
        <select
          value={selectedArtist}
          onChange={(event) => setSelectedArtist(event.target.value)}
          className="artist-select"
        >
          <option value="">Todos los artistas</option>
          {artists.map((artist) => (
            <option key={artist} value={artist}>{artist}</option>
          ))}
        </select>
      </label>

      {(searchTerm || selectedArtist) && (
        <button className="button button-quiet" type="button" onClick={clearFilters}>
          Limpiar
        </button>
      )}
    </div>
  );
}

export default FilterControls;
