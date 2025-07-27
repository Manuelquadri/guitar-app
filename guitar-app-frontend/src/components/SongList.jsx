// src/components/SongList.jsx
import React from 'react';

function SongList({ songs, onSelectSong }) {
  if (songs.length === 0) {
    return <p>Cargando canciones...</p>;
  }

  return (
    <div className="song-list">
      <h2>Catálogo de Canciones</h2>
      <ul>
        {songs.map((song) => (
          <li key={song.id} onClick={() => onSelectSong(song)}>
            <span className="song-title">{song.title}</span>
            <span className="song-artist">{song.artist}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SongList;