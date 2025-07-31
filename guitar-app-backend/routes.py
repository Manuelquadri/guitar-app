# routes.py

from flask import Blueprint, jsonify, request
from models import db, User, Song, UserSong
from scraper import scrape_and_save_song # Asegúrate de que esta importación sea correcta
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

# Creamos el Blueprint aquí. Todas las rutas de la API colgarán de él.
api_bp = Blueprint('api', __name__, url_prefix='/api')


@api_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username, password = data.get('username'), data.get('password')
    if not all([username, password]):
        return jsonify({"msg": "Username and password are required"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"msg": "Username already exists"}), 409
    
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


@api_bp.route('/songs', methods=['GET'])
def get_songs():
    songs = Song.query.all()
    return jsonify([song.to_dict() for song in songs])


@api_bp.route('/songs/<int:song_id>', methods=['GET'])
@jwt_required(optional=True)
def get_song(song_id):
    current_user_id = get_jwt_identity()
    song_master = Song.query.get(song_id)
    if not song_master:
        return jsonify({"error": "Song not found"}), 404

    response_data = song_master.to_dict()
    response_data['transposition'] = 0 # Valor por defecto para anónimos

    if current_user_id:
        user_song = UserSong.query.filter_by(user_id=current_user_id, song_id=song_id).first()
        if user_song:
            response_data['content'] = user_song.content or song_master.content
            response_data['transposition'] = user_song.transposition if user_song.transposition is not None else 0

    return jsonify(response_data)


@api_bp.route('/songs/<int:song_id>', methods=['PUT'])
@jwt_required()
def update_song(song_id):
    current_user_id = get_jwt_identity()
    if not Song.query.get(song_id):
        return jsonify({"error": "Song not found"}), 404
        
    data = request.get_json()
    user_song = UserSong.query.filter_by(user_id=current_user_id, song_id=song_id).first()
    if not user_song:
        user_song = UserSong(user_id=current_user_id, song_id=song_id)
        db.session.add(user_song)

    if 'content' in data: user_song.content = data['content']
    if 'transposition' in data: user_song.transposition = data['transposition']
    
    db.session.commit()
    return get_song(song_id) # Reutilizamos la lógica de get_song para la respuesta


@api_bp.route('/scrape', methods=['POST'])
@jwt_required()
def scrape_song_endpoint():
    # --- Logging para depuración ---
    # Esto imprimirá en los logs de Render
    logging.basicConfig(level=logging.INFO)
    logging.info(f"Scrape request received. Headers: {request.headers}")
    
    try:
        data = request.get_json()
        logging.info(f"Request JSON data: {data}")
    except Exception as e:
        logging.error(f"Could not parse JSON: {e}")
        return jsonify({"error": "Invalid JSON format"}), 400
    # --- Fin del logging ---

    if not data or 'url' not in data:
        logging.warning("URL not found in request data.")
        return jsonify({"error": "La URL es requerida"}), 400

    url = data['url']
    