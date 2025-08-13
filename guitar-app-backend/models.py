# models.py
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

# Tabla de Usuarios
class User(db.Model):
    # --- INICIO DE LA MODIFICACIÓN ---
    __tablename__ = 'user'  # Es buena práctica definirlo explícitamente
    __table_args__ = {'schema': 'public'}
    # --- FIN DE LA MODIFICACIÓN ---

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    
    # Relación: un usuario puede tener muchas "versiones de canción"
    user_songs = db.relationship('UserSong', backref='user', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {"id": self.id, "username": self.username}

# Tabla de Canciones Maestras
class Song(db.Model):
    # --- INICIO DE LA MODIFICACIÓN ---
    __tablename__ = 'song'
    __table_args__ = {'schema': 'public'}
    # --- FIN DE LA MODIFICACIÓN ---

    id = db.Column(db.Integer, primary_key=True)
    artist = db.Column(db.String(100), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    
    # Relación: una canción puede ser personalizada por muchos usuarios
    user_versions = db.relationship('UserSong', backref='song', lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "artist": self.artist,
            "title": self.title,
            "content": self.content,
        }

# Tabla Puente UserSong
class UserSong(db.Model):
    # --- INICIO DE LA MODIFICACIÓN ---
    __tablename__ = 'user_song'
    __table_args__ = {'schema': 'public'}
    # --- FIN DE LA MODIFICACIÓN ---

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('public.user.id'), nullable=False)
    song_id = db.Column(db.Integer, db.ForeignKey('public.song.id'), nullable=False)
    
    # El contenido y la afinación personalizados son opcionales (pueden ser NULL)
    content = db.Column(db.Text, nullable=True)
    transposition = db.Column(db.Integer, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "song_id": self.song_id,
            "content": self.content,
            "transposition": self.transposition,
        }