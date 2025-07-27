# app.py
import os
from flask import Flask, jsonify, request # ¡Añade 'request'!
from flask_cors import CORS
from models import db, Song
from scraper import scrape_and_save_song 

app = Flask(__name__)

# Configuración
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Inicialización
db.init_app(app)
CORS(app) # Habilita CORS para todas las rutas

# --- Rutas de la API ---

@app.route('/api/songs')
def get_songs():
    songs = Song.query.all()
    return jsonify([song.to_dict() for song in songs])

@app.route('/api/songs/<int:song_id>')
def get_song(song_id):
    song = Song.query.get(song_id)
    if song is None:
        return jsonify({"error": "Song not found"}), 404
    return jsonify(song.to_dict())
@app.route('/api/scrape', methods=['POST'])
def scrape_song_endpoint():
    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({"error": "La URL es requerida"}), 400

    url = data['url']

    # Aquí es importante pasarle 'db' y 'Song' a la función
    new_song = scrape_and_save_song(url, db, Song)

    if new_song:
        # 201 Created es el código correcto para una creación exitosa
        return jsonify(new_song.to_dict()), 201
    else:
        # 500 Internal Server Error, o podrías ser más específico
        return jsonify({"error": "No se pudo scrapear o guardar la canción"}), 500
# --- Comando para inicializar la BD ---
@app.cli.command('init-db')
def init_db_command():
    """Crea las tablas de la base de datos."""
    db.create_all()
    print('Initialized the database.')

if __name__ == '__main__':
    app.run(debug=True)