# app.py
import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, JWTManager
from models import db, User, Song, UserSong
from werkzeug.security import check_password_hash
from dotenv import load_dotenv
from flask_migrate import Migrate
from flask import Blueprint # 1. Importa Blueprint

# Cargar variables de entorno del archivo .env
load_dotenv()
# --- Creación del Blueprint ---
# Todas nuestras rutas de la API vivirán aquí
api_bp = Blueprint('api', __name__, url_prefix='/api')

# --- Rutas de la API ---
# --- Rutas de Autenticación (ahora usan @api_bp.route) ---
@api_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username, password = data.get('username'), data.get('password')
    if not all([username, password]): return jsonify({"msg": "Username and password required"}), 400
    if User.query.filter_by(username=username).first(): return jsonify({"msg": "Username exists"}), 409
    new_user = User(username=username)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()
    return jsonify(new_user.to_dict()), 201


@api_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username, password = data.get('username'), data.get('password')
    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        access_token = create_access_token(identity=user.id)
        return jsonify(access_token=access_token)
    return jsonify({"msg": "Bad username or password"}), 401

@api_bp.route('/api/songs', methods=['GET'])
def get_songs():
    """Devuelve la lista de canciones maestras. Es pública."""
    songs = Song.query.all()
    return jsonify([song.to_dict() for song in songs])

@api_bp.route('/api/songs/<int:song_id>', methods=['GET'])

@jwt_required(optional=True) # La autenticación es opcional aquí

def get_song(song_id):
    """
    Devuelve una canción específica.
    Si el usuario está autenticado, fusiona sus datos personalizados.
    """
    current_user_id = get_jwt_identity()
    song_master = Song.query.get(song_id)

    if not song_master:
        return jsonify({"error": "Canción no encontrada"}), 404

    # Preparamos la respuesta con la versión maestra
    response_data = song_master.to_dict()

    # Si hay un usuario autenticado, buscamos su versión personalizada
    if current_user_id:
        user_song = UserSong.query.filter_by(
            user_id=current_user_id, 
            song_id=song_id
        ).first()

        if user_song:
            # Si existe, fusionamos los datos
            # El contenido personalizado tiene prioridad sobre el maestro
            response_data['content'] = user_song.content or song_master.content
            response_data['transposition'] = user_song.transposition if user_song.transposition is not None else 0
            # Añadimos un flag para que el frontend sepa que es una versión personalizada
            response_data['is_customized'] = True
    else:
        # Si no hay usuario, la afinación es la por defecto
        response_data['transposition'] = 0

    return jsonify(response_data)

# --- Proteger y Mejorar la Ruta para Guardar Cambios ---

@api_bp.route('/api/songs/<int:song_id>', methods=['PUT'])
@jwt_required() # ¡Ahora es obligatorio estar logueado para guardar!
def update_song(song_id):
    """Crea o actualiza la versión personalizada de una canción para el usuario actual."""
    current_user_id = get_jwt_identity() # Obtenemos el ID del usuario del token JWT
    
    # Nos aseguramos de que la canción maestra exista
    if not Song.query.get(song_id):
        return jsonify({"error": "Canción no encontrada"}), 404
        
    data = request.get_json()
    
    # Buscamos si ya existe una versión de esta canción para este usuario
    user_song = UserSong.query.filter_by(user_id=current_user_id, song_id=song_id).first()

    if not user_song:
        # Si no existe, creamos una nueva entrada
        user_song = UserSong(user_id=current_user_id, song_id=song_id)
        db.session.add(user_song)

    # Actualizamos los datos con lo que venga del frontend
    if 'content' in data:
        user_song.content = data['content']
    if 'transposition' in data:
        user_song.transposition = data['transposition']

    db.session.commit()
    
    # Devolvemos la canción completa y fusionada, tal como lo hace get_song
    return get_song(song_id)

@api_bp.route('/api/scrape', methods=['POST'])
@jwt_required()
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


def create_app():
    app = Flask(__name__)
    
    app.config.from_mapping(
        SQLALCHEMY_DATABASE_URI=os.environ.get('DATABASE_URL', 'sqlite:///database.db'),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        JWT_SECRET_KEY=os.environ.get('JWT_SECRET_KEY')
    )

    db.init_app(app)
    Migrate(app, db) # Inicializa Migrate aquí
    JWTManager(app)

    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    CORS(app, origins=[frontend_url], methods=["GET", "POST", "PUT"], allow_headers=["Content-Type", "Authorization"], supports_credentials=True)

    app.register_blueprint(api_bp) # Registra el blueprint

    return app

# 4. Crea la instancia de la app para que Gunicorn la encuentre
app = create_app()

if __name__ == '__main__':
    app.run(debug=True)
    
