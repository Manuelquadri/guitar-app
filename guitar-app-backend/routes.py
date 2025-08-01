# routes.py

from flask import Blueprint, jsonify, request
from models import db, User, Song, UserSong
from scraper import scrape_and_save_song
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask import current_app
import logging

# Creamos el Blueprint. Todas las rutas de la API colgarán de él.
api_bp = Blueprint('api', __name__, url_prefix='/api')

# --- Rutas de Autenticación ---

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

# ¡ESTA ES LA FUNCIÓN QUE PROBABLEMENTE FALTABA O ESTABA INCORRECTA!
@api_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username, password = data.get('username'), data.get('password')
    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        access_token = create_access_token(identity=str(user.id))
        return jsonify(access_token=access_token)
    return jsonify({"msg": "Bad username or password"}), 401


# --- Rutas de Canciones ---

@api_bp.route('/songs', methods=['GET'])
def get_songs():
    songs = Song.query.all()
    return jsonify([song.to_dict() for song in songs])


@api_bp.route('/songs/<int:song_id>', methods=['GET'])
@jwt_required(optional=True)
def get_song(song_id):
    current_user_id_str = get_jwt_identity() # Esto nos da una STRING (ej: "1") o None
    song_master = Song.query.get(song_id)
    if not song_master:
        return jsonify({"error": "Song not found"}), 404

    response_data = song_master.to_dict()
    response_data['transposition'] = 0 

    if current_user_id_str:
        current_user_id = int(current_user_id_str) # Convertimos la string a un ENTERO
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
    return get_song(song_id)


@api_bp.route('/scrape', methods=['POST'])
@jwt_required()
def scrape_song_endpoint():
    try:
        data = request.get_json()
        url = data.get('url')
        if not url:
            return jsonify({"error": "La clave 'url' es requerida en el cuerpo JSON."}), 400
    except Exception:
        return jsonify({"error": "El cuerpo de la petición debe ser un JSON válido."}), 400

    # Llamamos a nuestro scraper a prueba de balas
    success, result = scrape_and_save_song(url, db, Song)

    if success:
        # Éxito: result es el objeto de la canción
        return jsonify(result.to_dict()), 201
    else:
        # Fracaso: result es el mensaje de error
        # Usamos 409 (Conflict) si la canción ya existe, si no 400 (Bad Request)
        status_code = 409 if "ya existe" in result else 400
        return jsonify({"error": result}), status_code
# --- RUTA DE DEPURACIÓN "ECO" ---
# Añade esta función al final del archivo para nuestra prueba.
@api_bp.route('/test-post', methods=['POST'])
@jwt_required()
def test_post():
    """
    Una ruta simple que solo recibe un JSON y lo devuelve.
    Si esto funciona, sabemos que la autenticación y el envío de JSON son correctos.
    """
    logging.basicConfig(level=logging.INFO)
    logging.info("--- /test-post request received ---")
    
    try:
        data = request.get_json()
        logging.info(f"Test POST received data: {data}")
        return jsonify(status="success", received_data=data), 200
    except Exception as e:
        logging.error(f"Error in /test-post: {e}")
        logging.error(f"Raw body in /test-post: {request.data}")
        return jsonify(error=str(e)), 500
# --- RUTA DE DEPURACIÓN ---

# Añade esta función al final del archivo
@api_bp.route('/debug-routes')
def list_routes():
    """
    Una ruta especial para listar todas las rutas conocidas por la aplicación.
    """
    import urllib
    output = []
    for rule in current_app.url_map.iter_rules():
        methods = ','.join(rule.methods)
        line = f"Endpoint: {rule.endpoint}, Methods: {methods}, URL: {urllib.parse.unquote(str(rule))}"
        output.append(line)
    
    return jsonify(sorted(output))