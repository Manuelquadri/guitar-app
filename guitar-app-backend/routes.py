from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required,
)

from models import Song, User, UserSong, db
from scraper import scrape_and_save_song


api_bp = Blueprint("api", __name__, url_prefix="/api")


@api_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        return jsonify({"msg": "El usuario y la contraseña son obligatorios."}), 400
    if len(username) > 80 or len(password) < 8:
        return jsonify(
            {
                "msg": (
                    "Usa un usuario de hasta 80 caracteres y una contraseña "
                    "de al menos 8."
                )
            }
        ), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"msg": "Ese nombre de usuario ya existe."}), 409

    new_user = User(username=username)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()
    return jsonify(new_user.to_dict()), 201


@api_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        return jsonify(access_token=create_access_token(identity=str(user.id)))
    return jsonify({"msg": "Usuario o contraseña incorrectos."}), 401


@api_bp.route("/songs", methods=["GET"])
def get_songs():
    songs = (
        db.session.query(Song.id, Song.artist, Song.title)
        .order_by(Song.artist, Song.title)
        .all()
    )
    return jsonify(
        [
            {"id": song.id, "artist": song.artist, "title": song.title}
            for song in songs
        ]
    )


def _song_for_user(song, user_id=None):
    response_data = song.to_dict()
    response_data["transposition"] = 0
    response_data["speed"] = 250

    if user_id is not None:
        user_song = UserSong.query.filter_by(
            user_id=user_id, song_id=song.id
        ).first()
        if user_song:
            response_data["content"] = user_song.content or song.content
            response_data["transposition"] = (
                user_song.transposition
                if user_song.transposition is not None
                else 0
            )
            response_data["speed"] = (
                user_song.speed if user_song.speed is not None else 250
            )

    return response_data


@api_bp.route("/songs/offline", methods=["GET"])
@jwt_required()
def download_songs():
    current_user_id = int(get_jwt_identity())
    songs = Song.query.order_by(Song.artist, Song.title).all()
    user_songs = UserSong.query.filter_by(user_id=current_user_id).all()
    versions_by_song = {version.song_id: version for version in user_songs}
    response = []

    for song in songs:
        song_data = song.to_dict()
        song_data["transposition"] = 0
        song_data["speed"] = 250
        user_song = versions_by_song.get(song.id)
        if user_song:
            song_data["content"] = user_song.content or song.content
            song_data["transposition"] = (
                user_song.transposition
                if user_song.transposition is not None
                else 0
            )
            song_data["speed"] = (
                user_song.speed if user_song.speed is not None else 250
            )
        response.append(song_data)

    return jsonify(response)


@api_bp.route("/songs/<int:song_id>", methods=["GET"])
@jwt_required(optional=True)
def get_song(song_id):
    song = db.session.get(Song, song_id)
    if not song:
        return jsonify({"error": "Canción no encontrada."}), 404

    identity = get_jwt_identity()
    user_id = int(identity) if identity is not None else None
    return jsonify(_song_for_user(song, user_id))


@api_bp.route("/songs/<int:song_id>", methods=["PUT"])
@jwt_required()
def update_song(song_id):
    current_user_id = int(get_jwt_identity())
    song = db.session.get(Song, song_id)
    if not song:
        return jsonify({"error": "Canción no encontrada."}), 404

    data = request.get_json(silent=True) or {}
    allowed_fields = {"content", "transposition", "speed"}
    if not data or not set(data).issubset(allowed_fields):
        return jsonify({"error": "No hay cambios válidos para guardar."}), 400

    if "content" in data and not isinstance(data["content"], str):
        return jsonify({"error": "El contenido debe ser texto."}), 400
    if "transposition" in data and (
        not isinstance(data["transposition"], int)
        or not -48 <= data["transposition"] <= 48
    ):
        return jsonify({"error": "La transposición debe estar entre -48 y 48."}), 400
    if "speed" in data and (
        not isinstance(data["speed"], (int, float))
        or not 1 <= data["speed"] <= 500
    ):
        return jsonify({"error": "La velocidad debe estar entre 1 y 500."}), 400

    user_song = UserSong.query.filter_by(
        user_id=current_user_id, song_id=song_id
    ).first()
    if not user_song:
        user_song = UserSong(user_id=current_user_id, song_id=song_id)
        db.session.add(user_song)

    if "content" in data:
        user_song.content = data["content"]
    if "transposition" in data:
        user_song.transposition = data["transposition"]
    if "speed" in data:
        user_song.speed = int(data["speed"])

    db.session.commit()
    return jsonify(_song_for_user(song, current_user_id))


@api_bp.route("/scrape", methods=["POST"])
@jwt_required()
def scrape_song_endpoint():
    data = request.get_json(silent=True) or {}
    url = data.get("url")
    if not url:
        return jsonify({"error": "Pega una URL de Cifra Club."}), 400

    success, result = scrape_and_save_song(url, db, Song)
    if success:
        return jsonify(result.to_dict()), 201

    status_code = 409 if "ya está en el cancionero" in result else 400
    return jsonify({"error": result}), status_code
