import React from 'react';

function SongList({ songs, isLoading, hasFilters, onSelectSong }) {
  if (isLoading && songs.length === 0) {
    return (
      <div className="song-list" aria-busy="true">
        <div className="section-heading">
          <h2>Canciones</h2>
        </div>
        <div className="song-skeleton" />
        <div className="song-skeleton" />
        <div className="song-skeleton" />
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="empty-state">
        <span aria-hidden="true">♪</span>
        <h2>{hasFilters ? 'No encontramos coincidencias' : 'Tu cancionero está vacío'}</h2>
        <p>
          {hasFilters
            ? 'Prueba con otro título, artista o quita los filtros.'
            : 'Añade una canción desde Cifra Club para empezar.'}
        </p>
      </div>
    );
  }

  return (
    <section className="song-list" aria-labelledby="song-list-title">
      <div className="section-heading">
        <h2 id="song-list-title">Canciones</h2>
        <span>{songs.length} {songs.length === 1 ? 'resultado' : 'resultados'}</span>
      </div>
      <ul>
        {songs.map((song) => (
          <li key={song.id}>
            <button type="button" onClick={() => onSelectSong(song)}>
              <span className="song-index" aria-hidden="true">♪</span>
              <span className="song-info">
                <strong className="song-title">{song.title}</strong>
                <span className="song-artist">{song.artist}</span>
              </span>
              <span className="song-arrow" aria-hidden="true">›</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default SongList;
